import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../prisma/prisma.service';
import { Prisma }             from '@prisma/client';
import { Request }            from 'express';

export interface AuditLogEntry {
  adminId?:    string;
  userId?:     string;
  action:      string;  // e.g. "user.plan_changed", "admin.login", "message.replied"
  resource:    string;  // e.g. "user", "apiKey", "contactMessage"
  resourceId?: string;
  metadata?:   Record<string, unknown>;
  req?:        Request;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const { adminId, userId, action, resource, resourceId, metadata, req } = entry;

    const ipAddress = req
      ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress
      : undefined;

    const userAgent = req?.headers['user-agent'];

    try {
      await this.prisma.auditLog.create({
        data: {
          id: require('crypto').randomBytes(10).toString('hex'),
          adminId, userId, action, resource, resourceId,
          metadata:  (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
      this.logger.log(`[AUDIT] ${action} on ${resource}${resourceId ? `/${resourceId}` : ''} by ${adminId ?? userId ?? 'system'}`);
    } catch (err) {
      // Audit failure must never block the actual request
      this.logger.error(`Audit log write failed: ${err}`);
    }
  }

  async query(options: {
    adminId?:   string;
    userId?:    string;
    resource?:  string;
    action?:    string;
    from?:      Date;
    to?:        Date;
    page?:      number;
    limit?:     number;
  }) {
    const { adminId, userId, resource, action, from, to, page = 1, limit = 50 } = options;
    const skip  = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (adminId)  where['adminId']  = adminId;
    if (userId)   where['userId']   = userId;
    if (resource) where['resource'] = resource;
    if (action)   where['action']   = { contains: action };
    if (from || to) {
      where['createdAt'] = {
        ...(from ? { gte: from } : {}),
        ...(to   ? { lte: to   } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: { admin: { select: { email: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}
