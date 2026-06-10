import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { JwtService }           from '@nestjs/jwt';
import { ConfigService }        from '@nestjs/config';
import { randomBytes }          from 'crypto';
import * as bcrypt              from 'bcryptjs';
import { UsersService }         from '../users/users.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { PrismaService }        from '../prisma/prisma.service';
import { EmailService }         from '../email/email.service';
import { RegisterDto }          from './dto/register.dto';

const BCRYPT_ROUNDS           = 12;
const VERIFY_TOKEN_TTL_HOURS  = 24;
const RESET_TOKEN_TTL_HOURS   = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt:      JwtService,
    private readonly users:    UsersService,
    private readonly firebase: FirebaseAdminService,
    private readonly prisma:   PrismaService,
    private readonly email:    EmailService,
    private readonly config:   ConfigService,
  ) {}

  // ── Firebase (OAuth) ────────────────────────────────────────────────────────

  async signInWithFirebase(idToken: string) {
    let decoded: import('firebase-admin').auth.DecodedIdToken;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token.');
    }

    const provider = decoded.firebase?.sign_in_provider?.replace('.com', '') ?? 'email';

    const user = await this.users.upsert({
      firebaseUid:    decoded.uid,
      email:          decoded.email ?? `${decoded.uid}@unknown.gateml`,
      name:           decoded.name ?? null,
      avatarUrl:      decoded.picture ?? null,
      provider,
      emailVerified:  decoded.email_verified ?? (provider !== 'email'),
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  }

  // ── In-house email/password ─────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verifyToken  = randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 3_600_000);

    const user = await this.prisma.user.create({
      data: {
        email:                   dto.email,
        name:                    dto.name ?? null,
        provider:                'email',
        passwordHash,
        emailVerified:           false,
        emailVerificationToken:  verifyToken,
        emailVerificationExpiry: verifyExpiry,
      },
    });

    // Provision default keys (same as OAuth users)
    await this.users.provisionForNewUser(user.id, user.email, user.name, 'email');

    const verifyUrl = `${this.appUrl}/auth/verify-email?token=${verifyToken}`;
    this.email.sendEmailVerification(user.email, user.name, verifyUrl);

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user:             { id: user.id, email: user.email, name: user.name },
      emailVerified:    false,
      message:          'Account created. Check your email to verify your address.',
    };
  }

  async localLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, emailVerified: user.emailVerified },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user)                         throw new BadRequestException('Invalid or expired verification token.');
    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date())
                                       throw new BadRequestException('Verification link has expired. Request a new one.');
    if (user.emailVerified)            return { message: 'Email already verified.' };

    await this.prisma.user.update({
      where: { id: user.id },
      data:  {
        emailVerified:           true,
        emailVerificationToken:  null,
        emailVerificationExpiry: null,
      },
    });
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user || user.emailVerified || !user.passwordHash) {
      return { message: 'If that account exists and is unverified, a new link has been sent.' };
    }

    const verifyToken  = randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 3_600_000);

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { emailVerificationToken: verifyToken, emailVerificationExpiry: verifyExpiry },
    });

    const verifyUrl = `${this.appUrl}/auth/verify-email?token=${verifyToken}`;
    this.email.sendEmailVerification(user.email, user.name, verifyUrl);
    return { message: 'If that account exists and is unverified, a new link has been sent.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success — prevent email enumeration
    if (!user || !user.passwordHash) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const resetToken  = randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 3_600_000);

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
    });

    const resetUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;
    this.email.sendPasswordReset(user.email, user.name, resetUrl);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: token } });

    if (!user)                                             throw new BadRequestException('Invalid or expired reset token.');
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date())
                                                           throw new BadRequestException('Reset link has expired. Request a new one.');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });
    return { message: 'Password updated. You can now log in.' };
  }

  // ── Shared ──────────────────────────────────────────────────────────────────

  async validatePayload(payload: { sub: string; email: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  private get appUrl() {
    return this.config.get<string>('APP_URL') ?? 'https://app.gateml.com';
  }
}
