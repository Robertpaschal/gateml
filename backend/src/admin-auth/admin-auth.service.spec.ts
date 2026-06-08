import { Test, TestingModule }                      from '@nestjs/testing';
import { JwtService }                               from '@nestjs/jwt';
import { ConfigService }                            from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AdminAuthService }                         from './admin-auth.service';
import { PrismaService }                            from '../prisma/prisma.service';
import { EmailService }                             from '../email/email.service';
import * as bcrypt                                  from 'bcryptjs';

const mockPrisma = {
  adminUser: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
    findMany:   jest.fn(),
  },
  adminDomain: {
    findMany:  jest.fn().mockResolvedValue([]),
    upsert:    jest.fn(),
    delete:    jest.fn(),
  },
};
const mockJwt    = { sign: jest.fn().mockReturnValue('admin-jwt') };
const mockConfig = { get: jest.fn((k: string, d?: unknown) => {
  if (k === 'ADMIN_ALLOWED_DOMAINS') return '';  // empty = allow any
  return d ?? null;
})};
const mockEmail  = { sendAdminInvite: jest.fn() };

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt    },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService,  useValue: mockEmail  },
      ],
    }).compile();
    service = module.get<AdminAuthService>(AdminAuthService);

    // Bypass MX record lookup in tests
    jest.spyOn<any, any>(service, 'assertDomainAllowed').mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('throws UnauthorizedException when admin not found', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      await expect(service.login('x@x.com', 'pass')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ForbiddenException when admin is inactive', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', isActive: false, passwordHash: 'h' });
      await expect(service.login('x@x.com', 'pass')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'a1', isActive: true, passwordHash: hash });
      await expect(service.login('x@x.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns JWT on correct credentials', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'a1', email: 'a@x.com', name: 'Admin', role: 'SUPER_ADMIN',
        isActive: true, passwordHash: hash,
      });
      mockPrisma.adminUser.update.mockResolvedValue({});
      const result = await service.login('a@x.com', 'correct');
      expect(result.token).toBe('admin-jwt');
    });
  });

  describe('bootstrap', () => {
    it('throws ForbiddenException when admins already exist', async () => {
      mockPrisma.adminUser.count.mockResolvedValue(1);
      await expect(service.bootstrap('a@gateml.com', 'Admin')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates first admin and sends invite when no admins exist', async () => {
      mockPrisma.adminUser.count.mockResolvedValue(0);
      mockPrisma.adminUser.create.mockResolvedValue({ id: 'a1', email: 'a@gateml.com', name: 'Admin' });
      const result = await service.bootstrap('a@gateml.com', 'Admin');
      expect(result.message).toMatch(/invite/i);
      expect(mockEmail.sendAdminInvite).toHaveBeenCalledWith('a@gateml.com', 'Admin', 'SUPER_ADMIN', expect.any(String), 'GateML System');
    });
  });

  describe('acceptInvite', () => {
    it('throws BadRequestException for invalid token', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvite('bad', 'pass1234')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('activates account on valid invite', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'a1', email: 'a@x.com', name: 'Admin', role: 'SUPPORT',
        inviteExpiry: new Date(Date.now() + 3_600_000),
        passwordHash: null,
        isActive: true,
      });
      mockPrisma.adminUser.update.mockResolvedValue({
        id: 'a1', email: 'a@x.com', name: 'Admin', role: 'SUPPORT', isActive: true,
      });
      const result = await service.acceptInvite('valid-token', 'securePass123!!');
      expect(result.token).toBe('admin-jwt');
    });
  });
});
