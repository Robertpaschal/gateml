import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService }    from '../prisma/prisma.service';
import { EncryptionService }from '../common/encryption.service';
import { LLMProvider }      from '@prisma/client';

@Injectable()
export class ProviderKeysService {
  constructor(
    private readonly prisma:      PrismaService,
    private readonly encryption:  EncryptionService,
  ) {}

  list(userId: string) {
    return this.prisma.providerKey.findMany({
      where:  { userId },
      select: { id: true, provider: true, createdAt: true, updatedAt: true },
      orderBy:{ provider: 'asc' },
    });
  }

  async upsert(userId: string, provider: LLMProvider, plainKey: string) {
    const keyEncrypted = this.encryption.encrypt(plainKey);
    return this.prisma.providerKey.upsert({
      where:  { userId_provider: { userId, provider } },
      create: { userId, provider, keyEncrypted },
      update: { keyEncrypted, updatedAt: new Date() },
      select: { id: true, provider: true, updatedAt: true },
    });
  }

  async remove(userId: string, provider: LLMProvider) {
    const key = await this.prisma.providerKey.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!key) throw new NotFoundException(`No ${provider} key found.`);
    return this.prisma.providerKey.delete({ where: { id: key.id } });
  }

  /** Used internally by GatewayService — returns decrypted key. */
  async getDecryptedKey(userId: string, provider: LLMProvider): Promise<string | null> {
    const row = await this.prisma.providerKey.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    return row ? this.encryption.decrypt(row.keyEncrypted) : null;
  }
}
