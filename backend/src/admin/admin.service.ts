import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService }  from '../email/email.service';
import { Plan }          from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email:  EmailService,
  ) {}

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics() {
    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalUsers,
      usersByPlan,
      requestsToday,
      requestsThisMonth,
      newSignupsThisWeek,
      activeSubscriptions,
      topUsersByUsage,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.groupBy({ by: ['plan'], _count: { id: true } }),

      this.prisma.requestLog.count({
        where: { isTestMode: false, createdAt: { gte: todayStart } },
      }),

      this.prisma.usageRecord.aggregate({
        where: { month },
        _sum: { requests: true },
      }),

      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),

      this.prisma.subscription.count({ where: { status: 'active' } }),

      this.prisma.usageRecord.findMany({
        where:   { month },
        orderBy: { requests: 'desc' },
        take:    10,
        include: { user: { select: { email: true, name: true, plan: true } } },
      }),
    ]);

    // MRR: count active PRO subs × $19
    const mrr = activeSubscriptions * 19;

    const planCounts: Record<string, number> = {};
    for (const g of usersByPlan) planCounts[g.plan] = g._count.id;

    return {
      totalUsers,
      planCounts,
      requestsToday,
      requestsThisMonth: requestsThisMonth._sum.requests ?? 0,
      newSignupsThisWeek,
      activeSubscriptions,
      mrrUsd: mrr,
      topUsersByUsage,
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(search?: string, page = 1, limit = 25) {
    const skip  = (page - 1) * limit;
    const where = search
      ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } },
                { name:  { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, plan: true, provider: true,
          createdAt: true, stripeCustomerId: true, payAsYouGo: true,
          subscription: { select: { status: true, currentPeriodEnd: true } },
          _count: { select: { requestLogs: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // attach current month usage
    const month = new Date().toISOString().slice(0, 7);
    const usage = await this.prisma.usageRecord.findMany({
      where: { userId: { in: users.map(u => u.id) }, month },
    });
    const usageMap = Object.fromEntries(usage.map(u => [u.userId, u.requests]));

    return {
      users: users.map(u => ({ ...u, usageThisMonth: usageMap[u.id] ?? 0 })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUser(id: string) {
    const [user, logs, month] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id },
        include: {
          subscription: true,
          apiKeys:      { where: { revokedAt: null }, orderBy: { createdAt: 'asc' } },
          usageRecords: { orderBy: { month: 'desc' }, take: 6 },
          _count:       { select: { requestLogs: true, prompts: true } },
        },
      }),
      this.prisma.requestLog.findMany({
        where:   { userId: id },
        orderBy: { createdAt: 'desc' },
        take:    20,
        select:  { id: true, model: true, provider: true, status: true, latencyMs: true, costUsd: true, isTestMode: true, createdAt: true },
      }),
      Promise.resolve(new Date().toISOString().slice(0, 7)),
    ]);

    const usageThisMonth = user.usageRecords.find(u => u.month === month)?.requests ?? 0;
    return { user, logs, usageThisMonth };
  }

  async updateUserPlan(id: string, plan: Plan) {
    const user = await this.prisma.user.update({ where: { id }, data: { plan } });
    await this.email.sendPlanUpgraded(user.email, user.name, plan);
    return { id: user.id, email: user.email, plan: user.plan };
  }

  // ── Support messages ───────────────────────────────────────────────────────

  async listMessages(status?: string, category?: string, page = 1, limit = 25) {
    const skip  = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (status)   where['status']   = status;
    if (category) where['category'] = category;

    const [messages, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, plan: true } } },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return { messages, total, page, pages: Math.ceil(total / limit) };
  }

  async getMessage(id: string) {
    return this.prisma.contactMessage.findUniqueOrThrow({
      where:   { id },
      include: { user: { select: { id: true, email: true, plan: true, createdAt: true } } },
    });
  }

  async replyToMessage(id: string, replyBody: string) {
    const msg = await this.prisma.contactMessage.update({
      where: { id },
      data:  { replyBody, repliedAt: new Date(), status: 'RESOLVED', updatedAt: new Date() },
    });
    await this.email.send(
      msg.email,
      `Re: ${msg.subject}`,
      `<p>Hi ${msg.name},</p>
<p>Thanks for contacting GateML support. Here's our reply:</p>
<hr/>
<p>${replyBody.replace(/\n/g, '<br/>')}</p>
<hr/>
<p>— The GateML team</p>`,
    );
    return msg;
  }

  async updateMessageStatus(id: string, status: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data:  { status: status as any, updatedAt: new Date() },
    });
  }
}
