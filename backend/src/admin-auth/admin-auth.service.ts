import {
  Injectable, UnauthorizedException, ForbiddenException,
  ConflictException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService }  from '../email/email.service';
import { AdminRole }     from '@prisma/client';
import * as bcrypt       from 'bcryptjs';
import { randomBytes }   from 'crypto';
import { promises as dns } from 'dns';

const BCRYPT_ROUNDS       = 12;
const INVITE_TTL_HOURS    = 48;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly jwt:     JwtService,
    private readonly config:  ConfigService,
    private readonly email:   EmailService,
  ) {}

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin)             throw new UnauthorizedException('Invalid credentials.');
    if (!admin.isActive)    throw new ForbiddenException('Account deactivated. Contact a super admin.');
    if (!admin.passwordHash) throw new UnauthorizedException('Account not yet activated. Check your invite email.');

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data:  { lastLoginAt: new Date() },
    });

    return { token: this.signToken(admin), admin: this.publicAdmin(admin) };
  }

  // ── Bootstrap (first admin only) ──────────────────────────────────────────

  async bootstrap(email: string, name: string) {
    const count = await this.prisma.adminUser.count();
    if (count > 0) throw new ForbiddenException('Bootstrap only allowed when no admins exist.');

    await this.assertDomainAllowed(email);

    const inviteToken  = randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);

    const admin = await this.prisma.adminUser.create({
      data: {
        email, name, role: 'SUPER_ADMIN', isActive: true,
        inviteToken, inviteExpiry,
      },
    });

    const acceptUrl = `${this.adminFrontendUrl}/accept-invite?token=${inviteToken}`;
    this.email.sendAdminInvite(email, name, 'SUPER_ADMIN', acceptUrl, 'GateML System');

    return { message: `Bootstrap invite sent to ${email}. Check your inbox to set your password.` };
  }

  // ── Invite ─────────────────────────────────────────────────────────────────

  async invite(inviterAdminId: string, email: string, name: string, role: AdminRole = 'SUPPORT') {
    const inviter = await this.prisma.adminUser.findUnique({ where: { id: inviterAdminId } });
    if (!inviter || inviter.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only SUPER_ADMIN can invite admins.');

    await this.assertDomainAllowed(email);

    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An admin with that email already exists.');

    const inviteToken  = randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);

    const admin = await this.prisma.adminUser.create({
      data: {
        email, name, role, isActive: true,
        inviteToken, inviteExpiry, invitedBy: inviterAdminId,
      },
    });

    const acceptUrl = `${this.adminFrontendUrl}/accept-invite?token=${inviteToken}`;
    this.email.sendAdminInvite(email, name, role, acceptUrl, inviter.name);

    return { message: `Invite sent to ${email}.`, id: admin.id };
  }

  // ── Accept invite ──────────────────────────────────────────────────────────

  async getInvite(token: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { inviteToken: token } });
    if (!admin)                                                    throw new BadRequestException('Invalid invitation token.');
    if (admin.inviteExpiry && admin.inviteExpiry < new Date())     throw new BadRequestException('Invitation has expired. Ask for a new one.');
    if (admin.passwordHash)                                        throw new BadRequestException('This invitation has already been accepted.');
    return { email: admin.email, name: admin.name, role: admin.role };
  }

  async acceptInvite(token: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { inviteToken: token } });
    if (!admin)                                                    throw new BadRequestException('Invalid invitation token.');
    if (admin.inviteExpiry && admin.inviteExpiry < new Date())     throw new BadRequestException('Invitation has expired. Ask for a new one.');
    if (admin.passwordHash)                                        throw new BadRequestException('This invitation has already been accepted.');

    if (password.length < 12) throw new BadRequestException('Password must be at least 12 characters.');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const updated = await this.prisma.adminUser.update({
      where: { id: admin.id },
      data:  { passwordHash, inviteToken: null, inviteExpiry: null, lastLoginAt: new Date() },
    });

    return { token: this.signToken(updated), admin: this.publicAdmin(updated) };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin || !admin.passwordHash) throw new UnauthorizedException('Account not found.');

    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect.');

    if (newPassword.length < 12) throw new BadRequestException('New password must be at least 12 characters.');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Increment tokenVersion to invalidate all other sessions
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data:  { passwordHash, tokenVersion: { increment: 1 } },
    });

    return { message: 'Password changed. All other sessions have been invalidated.' };
  }

  // ── Deactivate ─────────────────────────────────────────────────────────────

  async deactivate(requesterId: string, targetId: string) {
    const requester = await this.prisma.adminUser.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only SUPER_ADMIN can deactivate admins.');
    if (requesterId === targetId) throw new BadRequestException('You cannot deactivate yourself.');

    const target = await this.prisma.adminUser.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Admin not found.');

    // Increment tokenVersion to immediately invalidate all existing JWTs
    await this.prisma.adminUser.update({
      where: { id: targetId },
      data:  { isActive: false, tokenVersion: { increment: 1 } },
    });
    return { message: `Admin ${target.email} deactivated. All active sessions invalidated.` };
  }

  async reactivate(requesterId: string, targetId: string) {
    const requester = await this.prisma.adminUser.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only SUPER_ADMIN can reactivate admins.');

    const target = await this.prisma.adminUser.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Admin not found.');

    await this.prisma.adminUser.update({ where: { id: targetId }, data: { isActive: true } });
    return { message: `Admin ${target.email} reactivated.` };
  }

  // ── List admins ────────────────────────────────────────────────────────────

  async listAdmins() {
    const admins = await this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        invitedByAdmin: { select: { email: true, name: true } },
      },
    });
    return admins;
  }

  // ── Domain verification ────────────────────────────────────────────────────

  private async assertDomainAllowed(email: string) {
    const domain  = email.split('@')[1]?.toLowerCase();
    if (!domain)  throw new BadRequestException('Invalid email address.');

    const allowedEnv = this.config.get<string>('ADMIN_ALLOWED_DOMAINS', '');
    const envDomains = allowedEnv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

    // DB-stored domains (added at runtime)
    const dbDomains = await this.prisma.adminDomain.findMany().then(rows => rows.map(r => r.domain));

    const all = [...new Set([...envDomains, ...dbDomains])];
    if (all.length > 0 && !all.includes(domain)) {
      throw new ForbiddenException(`Email domain "${domain}" is not on the admin allowlist.`);
    }

    // MX record check — verify the domain can actually receive email
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx || mx.length === 0) throw new Error('No MX records');
    } catch {
      throw new BadRequestException(
        `Cannot verify email domain "${domain}". Ensure it is a valid email domain with MX records.`,
      );
    }
  }

  async addAllowedDomain(domain: string) {
    const clean = domain.trim().toLowerCase();
    // Verify MX before adding
    try {
      await dns.resolveMx(clean);
    } catch {
      throw new BadRequestException(`Domain "${clean}" has no MX records.`);
    }
    return this.prisma.adminDomain.upsert({
      where:  { domain: clean },
      update: {},
      create: { id: randomBytes(10).toString('hex'), domain: clean },
    });
  }

  async removeAllowedDomain(domain: string) {
    return this.prisma.adminDomain.delete({ where: { domain: domain.toLowerCase() } });
  }

  async listAllowedDomains() {
    const dbDomains  = await this.prisma.adminDomain.findMany({ orderBy: { createdAt: 'asc' } });
    const envDomains = (this.config.get<string>('ADMIN_ALLOWED_DOMAINS', '') || '')
      .split(',').map(d => d.trim()).filter(Boolean)
      .map(d => ({ domain: d, source: 'env' as const }));
    return {
      env: envDomains,
      db:  dbDomains.map(d => ({ ...d, source: 'db' as const })),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async validatePayload(payload: { sub: string; isAdmin: boolean; tv?: number }) {
    if (!payload.isAdmin) throw new UnauthorizedException('Not an admin token.');
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin)          throw new UnauthorizedException('Admin not found.');
    if (!admin.isActive) throw new ForbiddenException('Account deactivated.');
    // tokenVersion mismatch means the token was issued before a password change or deactivation
    if (payload.tv !== undefined && payload.tv !== admin.tokenVersion) {
      throw new UnauthorizedException('Session invalidated. Please log in again.');
    }
    return admin;
  }

  private signToken(admin: { id: string; email: string; role: string; tokenVersion: number }) {
    const secret = this.config.get<string>('ADMIN_JWT_SECRET') ?? this.config.get<string>('JWT_SECRET')!;
    return this.jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, isAdmin: true, tv: admin.tokenVersion },
      { secret },
    );
  }

  private publicAdmin(admin: { id: string; email: string; name: string; role: string; isActive: boolean }) {
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, isActive: admin.isActive };
  }

  private get adminFrontendUrl() {
    return this.config.get<string>('ADMIN_FRONTEND_URL') ?? 'http://localhost:3002';
  }
}
