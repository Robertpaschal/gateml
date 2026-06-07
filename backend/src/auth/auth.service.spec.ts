import { Test, TestingModule } from '@nestjs/testing';
import { JwtService }          from '@nestjs/jwt';
import { ConfigService }       from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService }         from './auth.service';
import { UsersService }        from '../users/users.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { PrismaService }       from '../prisma/prisma.service';
import { EmailService }        from '../email/email.service';
import * as bcrypt             from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
};

const mockUsers = {
  upsert:              jest.fn(),
  findById:            jest.fn(),
  provisionForNewUser: jest.fn(),
};

const mockFirebase = { verifyIdToken: jest.fn() };
const mockJwt      = { sign: jest.fn().mockReturnValue('mock-jwt') };
const mockEmail    = {
  sendWelcome:            jest.fn(),
  sendEmailVerification:  jest.fn(),
  sendPasswordReset:      jest.fn(),
};
const mockConfig   = { get: jest.fn((key: string, def?: unknown) => def ?? null) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService,          useValue: mockJwt     },
        { provide: UsersService,        useValue: mockUsers   },
        { provide: FirebaseAdminService,useValue: mockFirebase },
        { provide: PrismaService,       useValue: mockPrisma  },
        { provide: EmailService,        useValue: mockEmail   },
        { provide: ConfigService,       useValue: mockConfig  },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@example.com' });
      await expect(service.register({ email: 'test@example.com', password: 'pass1234' }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it('creates user and returns JWT when email is new', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1', email: 'new@example.com', name: 'Alice', emailVerified: false,
      });
      mockUsers.provisionForNewUser.mockResolvedValue(undefined);

      const result = await service.register({ email: 'new@example.com', password: 'pass1234', name: 'Alice' });

      expect(result.token).toBe('mock-jwt');
      expect(result.emailVerified).toBe(false);
      expect(mockEmail.sendEmailVerification).toHaveBeenCalledWith('new@example.com', 'Alice', expect.stringContaining('token='));
    });
  });

  // ── localLogin ──────────────────────────────────────────────────────────────

  describe('localLogin', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.localLogin('x@x.com', 'pass')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', passwordHash: hash });
      await expect(service.localLogin('x@x.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns JWT on correct credentials', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', passwordHash: hash, name: null, avatarUrl: null, emailVerified: true });
      const result = await service.localLogin('x@x.com', 'correct');
      expect(result.token).toBe('mock-jwt');
    });
  });

  // ── verifyEmail ─────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('throws BadRequestException for unknown token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', emailVerified: false,
        emailVerificationExpiry: new Date(Date.now() - 1000),
      });
      await expect(service.verifyEmail('expired')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks email as verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1', emailVerified: false,
        emailVerificationExpiry: new Date(Date.now() + 3_600_000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.verifyEmail('valid-token');
      expect(result.message).toMatch(/verified/i);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ emailVerified: true }),
      }));
    });
  });

  // ── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns success even when email not found (anti-enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword('unknown@x.com');
      expect(result.message).toBeTruthy();
      expect(mockEmail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('sends reset email when user found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'Alice', passwordHash: 'hash' });
      mockPrisma.user.update.mockResolvedValue({});
      await service.forgotPassword('x@x.com');
      expect(mockEmail.sendPasswordReset).toHaveBeenCalledWith('x@x.com', 'Alice', expect.stringContaining('token='));
    });
  });

  // ── Firebase sign-in ────────────────────────────────────────────────────────

  describe('signInWithFirebase', () => {
    it('throws UnauthorizedException for invalid Firebase token', async () => {
      mockFirebase.verifyIdToken.mockRejectedValue(new Error('invalid'));
      await expect(service.signInWithFirebase('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns JWT on valid Firebase token', async () => {
      mockFirebase.verifyIdToken.mockResolvedValue({
        uid: 'fb-uid', email: 'fb@test.com', name: 'FB User', picture: null,
        firebase: { sign_in_provider: 'google.com' },
      });
      mockUsers.upsert.mockResolvedValue({ id: 'u1', email: 'fb@test.com', name: 'FB User', avatarUrl: null });
      const result = await service.signInWithFirebase('valid-fb-token');
      expect(result.token).toBe('mock-jwt');
    });
  });
});
