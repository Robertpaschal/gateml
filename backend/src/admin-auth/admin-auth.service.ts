import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly jwt:     JwtService,
    private readonly config:  ConfigService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials.');

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data:  { lastLoginAt: new Date() },
    });

    const secret = this.config.get<string>('ADMIN_JWT_SECRET') ?? this.config.get<string>('JWT_SECRET')!;
    const token  = this.jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, isAdmin: true },
      { secret },
    );
    return { token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } };
  }

  async validatePayload(payload: { sub: string; isAdmin: boolean }) {
    if (!payload.isAdmin) throw new UnauthorizedException('Not an admin token.');
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin) throw new UnauthorizedException('Admin not found.');
    return admin;
  }
}
