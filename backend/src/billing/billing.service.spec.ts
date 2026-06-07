import { Test, TestingModule }    from '@nestjs/testing';
import { HttpException }           from '@nestjs/common';
import { ConfigService }           from '@nestjs/config';
import { BillingService }          from './billing.service';
import { PrismaService }           from '../prisma/prisma.service';
import { EmailService }            from '../email/email.service';
import { TokenCostService }        from '../common/token-cost.service';
import { PLAN_LIMITS }             from './plan-limits';

const mockPrisma = {
  usageRecord: {
    findUnique:  jest.fn(),
    upsert:      jest.fn(),
    update:      jest.fn(),
  },
  user: { findUnique: jest.fn(), update: jest.fn() },
  subscription: { findUnique: jest.fn() },
};
const mockEmail  = { sendQuotaWarning: jest.fn(), sendQuotaExceeded: jest.fn() };
const mockConfig = { get: jest.fn((k: string, d?: unknown) => d ?? null) };
const mockTokenCost = { calculateManaged: jest.fn(), getManagedMarkup: jest.fn().mockReturnValue(0.2) };

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService,     useValue: mockPrisma    },
        { provide: EmailService,      useValue: mockEmail     },
        { provide: ConfigService,     useValue: mockConfig    },
        { provide: TokenCostService,  useValue: mockTokenCost },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  describe('checkQuota', () => {
    it('allows request when under limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: 500 });
      const result = await service.checkQuota('u1');
      expect(result).toMatchObject({ useManaged: false });
    });

    it('throws 402 when FREE quota exceeded and no payAsYouGo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: PLAN_LIMITS.FREE.liveRequestsPerMonth });
      await expect(service.checkQuota('u1')).rejects.toBeInstanceOf(HttpException);
    });

    it('fires quota warning at 80%', async () => {
      const limit = PLAN_LIMITS.FREE.liveRequestsPerMonth;
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: Math.floor(limit * 0.8) });
      await service.checkQuota('u1');
      expect(mockEmail.sendQuotaWarning).toHaveBeenCalled();
    });
  });

  describe('limits', () => {
    it('returns correct limits for each plan', () => {
      expect(service.limits('FREE').liveRequestsPerMonth).toBe(PLAN_LIMITS.FREE.liveRequestsPerMonth);
      expect(service.limits('PRO').liveRequestsPerMonth).toBe(PLAN_LIMITS.PRO.liveRequestsPerMonth);
      expect(service.limits('ENTERPRISE').liveRequestsPerMonth).toBe(PLAN_LIMITS.ENTERPRISE.liveRequestsPerMonth);
    });
  });
});
