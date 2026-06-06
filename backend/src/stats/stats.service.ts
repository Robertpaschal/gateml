import { Injectable }          from '@nestjs/common';
import { PrismaService }       from '../prisma/prisma.service';
import { FirebaseAdminService }from '../firebase/firebase-admin.service';

const ALERT_ERROR_RATE_PCT = 5;    // Notify when error rate > 5%
const ALERT_DAILY_BUDGET   = 50;   // Notify when daily spend > $50

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma:   PrismaService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async getDashboardStats(userId: string) {
    const since = new Date(Date.now() - 86_400_000); // 24 h

    const [totals, byModel, hourly] = await Promise.all([
      this.prisma.requestLog.aggregate({
        where:  { userId, createdAt: { gte: since } },
        _count: { id: true },
        _sum:   { promptTokens: true, completionTokens: true, costUsd: true },
      }),
      this.prisma.requestLog.groupBy({
        by:      ['model'],
        where:   { userId, createdAt: { gte: since } },
        _count:  { id: true },
        _sum:    { costUsd: true, promptTokens: true, completionTokens: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.getHourly(userId, since),
    ]);

    const calls  = totals._count.id;
    const errors = await this.prisma.requestLog.count({ where: { userId, createdAt: { gte: since }, status: { gte: 400 } } });
    const p95    = await this.getP95Latency(userId, since, calls);

    const dailyCostUsd = +(totals._sum.costUsd ?? 0).toFixed(4);
    const errorRate    = calls > 0 ? +((errors / calls) * 100).toFixed(2) : 0;

    const result = {
      period:        '24h',
      totalCalls:    calls,
      totalTokens:   (totals._sum.promptTokens ?? 0) + (totals._sum.completionTokens ?? 0),
      totalCostUsd:  dailyCostUsd,
      errorRate,
      p95LatencyMs:  p95,
      byModel: byModel.map(m => ({
        model:  m.model,
        calls:  m._count.id,
        cost:   +(m._sum.costUsd ?? 0).toFixed(4),
        tokens: (m._sum.promptTokens ?? 0) + (m._sum.completionTokens ?? 0),
      })),
      hourly,
    };

    // Update the Firestore pulse with accurate daily totals so the real-time
    // listener on the frontend also gets the latest aggregate values.
    void this.firebase.writeUserPulse(userId, {
      lastRequestAt:   new Date(),
      latestStatus:    200,
      latestModel:     byModel[0]?.model ?? '',
      latestLatencyMs: p95,
      latestCostUsd:   dailyCostUsd,
      isTestMode:      false,
      dailyCalls:      calls,
      dailyCostUsd,
      errorRate,
    });

    // Check alert thresholds — send FCM if breached (fire-and-forget)
    if (errorRate > ALERT_ERROR_RATE_PCT || dailyCostUsd > ALERT_DAILY_BUDGET) {
      void this.checkAlerts(userId, errorRate, dailyCostUsd);
    }

    return result;
  }

  private async checkAlerts(userId: string, errorRate: number, dailyCostUsd: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    if (errorRate > ALERT_ERROR_RATE_PCT) {
      await this.firebase.sendFcm(user.fcmToken, {
        title: '⚠️ High error rate',
        body:  `Your error rate is ${errorRate.toFixed(1)}% today (threshold ${ALERT_ERROR_RATE_PCT}%). Check the Observability tab.`,
        link:  'https://gateml.io/dashboard/observe',
      });
    }

    if (dailyCostUsd > ALERT_DAILY_BUDGET) {
      await this.firebase.sendFcm(user.fcmToken, {
        title: '💸 Daily budget exceeded',
        body:  `You have spent $${dailyCostUsd.toFixed(2)} today (threshold $${ALERT_DAILY_BUDGET}). Review your usage.`,
        link:  'https://gateml.io/dashboard/observe',
      });
    }
  }

  private async getP95Latency(userId: string, since: Date, total: number): Promise<number> {
    if (total === 0) return 0;
    const offset = Math.max(0, Math.ceil(total * 0.05) - 1);
    const rows   = await this.prisma.requestLog.findMany({
      where:   { userId, createdAt: { gte: since }, status: { lt: 400 } },
      orderBy: { latencyMs: 'desc' },
      select:  { latencyMs: true },
      take:    1,
      skip:    offset,
    });
    return rows[0]?.latencyMs ?? 0;
  }

  private async getHourly(userId: string, since: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ hour: Date; calls: bigint }>>`
      SELECT date_trunc('hour', "createdAt") AS hour, COUNT(*) AS calls
      FROM "RequestLog"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${since}
      GROUP BY hour
      ORDER BY hour ASC
    `;
    return rows.map(r => ({ hour: r.hour.getTime(), calls: Number(r.calls) }));
  }
}
