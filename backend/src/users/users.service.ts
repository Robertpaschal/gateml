import { Injectable } from '@nestjs/common';
import { PrismaService }        from '../prisma/prisma.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { EmailService }         from '../email/email.service';

interface UpsertUserDto {
  firebaseUid: string;
  email:       string;
  name?:       string | null;
  avatarUrl?:  string | null;
  provider:    string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma:   PrismaService,
    private readonly firebase: FirebaseAdminService,
    private readonly email:    EmailService,
  ) {}

  async upsert(dto: UpsertUserDto) {
    const user = await this.prisma.user.upsert({
      where:  { firebaseUid: dto.firebaseUid },
      update: { email: dto.email, name: dto.name, avatarUrl: dto.avatarUrl },
      create: {
        firebaseUid: dto.firebaseUid,
        email:       dto.email,
        name:        dto.name,
        avatarUrl:   dto.avatarUrl,
        provider:    dto.provider,
      },
    });

    const keyCount  = await this.prisma.apiKey.count({ where: { userId: user.id } });
    const isNewUser = keyCount === 0;
    if (isNewUser) {
      await this.provisionForNewUser(user.id, user.email, user.name, dto.provider);
    }

    return user;
  }

  /** Called for both OAuth and in-house registrations. */
  async provisionForNewUser(userId: string, email: string, name: string | null, provider: string) {
    await this.provisionDefaultKeys(userId);
    this.email.sendWelcome(email, name);
    this.email.notifyAdminNewUser(email, name, provider);
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Give new users a test key + live key + default routing config in Firestore. */
  private async provisionDefaultKeys(userId: string) {
    const { randomBytes } = await import('crypto');
    const makeKey = (type: 'test' | 'live') => `gml-sk-${type}_${randomBytes(24).toString('hex')}`;

    const testKey = makeKey('test');
    const liveKey = makeKey('live');

    await this.prisma.$transaction([
      this.prisma.apiKey.create({
        data: { userId, name: 'Default', key: testKey, keyPrefix: testKey.slice(0, 20), type: 'TEST' },
      }),
      this.prisma.apiKey.create({
        data: { userId, name: 'Default', key: liveKey, keyPrefix: liveKey.slice(0, 20), type: 'LIVE' },
      }),
    ]);

    // Routing config lives in Firestore — no PostgreSQL table needed.
    await this.firebase.setRoutingConfig(userId, {
      primaryModel:  'gpt-4o',
      fallbackChain: [
        { model: 'claude-sonnet-4-6', on: [429, 500, 502, 503] },
        { model: 'gpt-4o-mini',       on: [429, 500, 502, 503] },
      ],
    });

    return { testKey, liveKey };
  }
}
