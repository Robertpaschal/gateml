import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma }        from '@prisma/client';

export interface FallbackEntry { model: string; on: number[] }

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const cfg = await this.prisma.routingConfig.findUnique({ where: { userId } });
    return {
      primaryModel:  cfg?.primaryModel ?? 'gpt-4o',
      fallbackChain: ((cfg?.fallbackChain ?? []) as unknown as FallbackEntry[]),
    };
  }

  async update(userId: string, primaryModel: string, fallbackChain: FallbackEntry[]) {
    const chain = fallbackChain as unknown as Prisma.InputJsonValue;
    return this.prisma.routingConfig.upsert({
      where:  { userId },
      create: { userId, primaryModel, fallbackChain: chain },
      update: { primaryModel, fallbackChain: chain },
    });
  }

  /** Used internally by GatewayService. */
  async getFallbackChain(userId: string): Promise<FallbackEntry[]> {
    const cfg = await this.prisma.routingConfig.findUnique({ where: { userId } });
    return ((cfg?.fallbackChain ?? []) as unknown as FallbackEntry[]);
  }
}
