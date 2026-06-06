import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes }   from 'crypto';
import { KeyType }       from '@prisma/client';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where:   { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true, keyPrefix: true, type: true, createdAt: true, lastUsedAt: true },
    });
  }

  async create(userId: string, name: string, type: KeyType) {
    const raw       = `gml-sk-${type === 'TEST' ? 'test' : 'live'}_${randomBytes(24).toString('hex')}`;
    const keyPrefix = raw.slice(0, 20);

    const apiKey = await this.prisma.apiKey.create({
      data: { userId, name, key: raw, keyPrefix, type },
    });

    // Return full key once — it is never returned again
    return { ...apiKey, key: raw };
  }

  async revoke(id: string, userId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId, revokedAt: null } });
    if (!key) throw new NotFoundException('API key not found.');
    return this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /** Called by ApiKeyGuard — validates key and updates lastUsedAt. */
  async validateAndTouch(key: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { key, revokedAt: null },
    });
    if (!apiKey) return null;

    // Fire-and-forget timestamp update
    this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return apiKey;
  }
}
