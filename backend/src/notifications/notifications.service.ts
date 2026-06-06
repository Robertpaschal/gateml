import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }         from '../prisma/prisma.service';
import { FirebaseAdminService }  from '../firebase/firebase-admin.service';

export interface AlertThresholds {
  errorRatePct:  number;   // Alert when error rate > this %
  dailyBudgetUsd:number;   // Alert when daily spend > this $
}

const DEFAULTS: AlertThresholds = { errorRatePct: 5, dailyBudgetUsd: 50 };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma:    PrismaService,
    private readonly firebase:  FirebaseAdminService,
  ) {}

  /** Store (or update) the user's FCM token for push notifications. */
  async registerToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  /** Remove the user's FCM token (e.g. on logout). */
  async unregisterToken(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
  }

  /**
   * Check thresholds and send a push notification if exceeded.
   * Called after StatsService computes the 24 h summary.
   */
  async checkAndAlert(
    userId: string,
    errorRate: number,
    dailyCostUsd: number,
    thresholds: AlertThresholds = DEFAULTS,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    const alerts: Array<{ title: string; body: string }> = [];

    if (errorRate > thresholds.errorRatePct) {
      alerts.push({
        title: '⚠️ High error rate',
        body:  `Your error rate is ${errorRate.toFixed(1)}% (threshold: ${thresholds.errorRatePct}%). Check the Observability tab.`,
      });
    }

    if (dailyCostUsd > thresholds.dailyBudgetUsd) {
      alerts.push({
        title: '💸 Budget threshold exceeded',
        body:  `Daily spend is $${dailyCostUsd.toFixed(2)} (threshold: $${thresholds.dailyBudgetUsd}). Check the Cost tab.`,
      });
    }

    for (const alert of alerts) {
      const sent = await this.firebase.sendFcm(user.fcmToken, {
        ...alert,
        link: 'https://gateml.io/dashboard/observe',
        data: { userId, errorRate: String(errorRate), dailyCostUsd: String(dailyCostUsd) },
      });
      if (!sent) {
        // Token is stale — clear it so we stop trying
        this.logger.log(`Clearing stale FCM token for user ${userId}`);
        await this.unregisterToken(userId);
        break;
      }
    }
  }
}
