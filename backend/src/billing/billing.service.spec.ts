import { Test, TestingModule }    from '@nestjs/testing';
import { HttpException }           from '@nestjs/common';
import { ConfigService }           from '@nestjs/config';
import { BillingService }          from './billing.service';
import { PrismaService }           from '../prisma/prisma.service';
import { EmailService }            from '../email/email.service';
import { PdfService }              from '../pdf/pdf.service';
import { PLAN_LIMITS }             from './plan-limits';

const DEFAULT_CONFIG = {
  id: 'global', trialDays: 7, paygRateProUsd: 0.001, paygRateFreeUsd: 0.002,
  managedMarkupPercent: 20, updatedAt: new Date(),
};

const mockPrisma = {
  usageRecord: {
    findUnique:  jest.fn(),
    upsert:      jest.fn(),
    update:      jest.fn(),
    findMany:    jest.fn(),
  },
  user: {
    findUnique:  jest.fn(),
    update:      jest.fn(),
    findFirst:   jest.fn(),
  },
  subscription: {
    findUnique:  jest.fn(),
    upsert:      jest.fn(),
    update:      jest.fn(),
  },
  billingConfig: {
    upsert:      jest.fn().mockResolvedValue(DEFAULT_CONFIG),
    update:      jest.fn(),
  },
  billingProduct: {
    findUnique:  jest.fn(),
    findMany:    jest.fn(),
    upsert:      jest.fn().mockResolvedValue({}),
    create:      jest.fn(),
    update:      jest.fn(),
  },
  customPlanAssignment: {
    findUnique:  jest.fn(),
    upsert:      jest.fn(),
    delete:      jest.fn(),
    findMany:    jest.fn(),
  },
};
const mockEmail = {
  sendQuotaWarning:   jest.fn(),
  sendQuotaExceeded:  jest.fn(),
  sendInvoice:        jest.fn(),
  sendPlanUpgraded:   jest.fn(),
};
const mockConfig = { get: jest.fn((k: string, d?: unknown) => d ?? null) };
const mockPdf    = { generateInvoice: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4')) };

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Re-set defaults that onModuleInit / getConfig need after clearAllMocks
    mockPrisma.billingConfig.upsert.mockResolvedValue(DEFAULT_CONFIG);
    mockPrisma.billingProduct.upsert.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: EmailService,   useValue: mockEmail  },
        { provide: ConfigService,  useValue: mockConfig },
        { provide: PdfService,     useValue: mockPdf    },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  // ── checkQuota ──────────────────────────────────────────────────────────────

  describe('checkQuota', () => {
    it('allows request when under limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: 500 });
      const result = await service.checkQuota('u1');
      expect(result).toMatchObject({ useManaged: false, isPaygOverage: false });
    });

    it('throws 402 when FREE quota exceeded and no payAsYouGo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: PLAN_LIMITS.FREE.liveRequestsPerMonth });
      await expect(service.checkQuota('u1')).rejects.toBeInstanceOf(HttpException);
    });

    it('returns isPaygOverage: true when quota exceeded and payAsYouGo enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FREE', payAsYouGo: true, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: PLAN_LIMITS.FREE.liveRequestsPerMonth });
      const result = await service.checkQuota('u1');
      expect(result).toMatchObject({ isPaygOverage: true });
    });

    it('allows unlimited for ENTERPRISE plan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'ENTERPRISE', payAsYouGo: false, useManaged: true });
      const result = await service.checkQuota('u1');
      expect(result).toMatchObject({ useManaged: true, isPaygOverage: false });
      expect(mockPrisma.usageRecord.findUnique).not.toHaveBeenCalled();
    });

    it('fires quota warning at 80%', async () => {
      const limit = PLAN_LIMITS.FREE.liveRequestsPerMonth;
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', plan: 'FREE', payAsYouGo: false, useManaged: false });
      mockPrisma.usageRecord.findUnique.mockResolvedValue({ requests: Math.floor(limit * 0.8) });
      await service.checkQuota('u1');
      expect(mockEmail.sendQuotaWarning).toHaveBeenCalled();
    });
  });

  // ── incrementUsage ──────────────────────────────────────────────────────────

  describe('incrementUsage', () => {
    it('upserts with paygRequests increment when isPaygOverage is true', async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue({});
      await service.incrementUsage('u1', true);
      const call = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      expect(call.update).toMatchObject({ paygRequests: { increment: 1 } });
      expect(call.create).toMatchObject({ paygRequests: 1 });
    });

    it('upserts without paygRequests when isPaygOverage is false', async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue({});
      await service.incrementUsage('u1', false);
      const call = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      expect(call.update).not.toHaveProperty('paygRequests');
      expect(call.create).toMatchObject({ paygRequests: 0 });
    });
  });

  // ── getManagedMarkupFactor ──────────────────────────────────────────────────

  describe('getManagedMarkupFactor', () => {
    it('returns managedMarkupPercent / 100 from BillingConfig', async () => {
      const factor = await service.getManagedMarkupFactor();
      expect(factor).toBeCloseTo(DEFAULT_CONFIG.managedMarkupPercent / 100);
    });

    it('reflects updated config when managedMarkupPercent is 30', async () => {
      mockPrisma.billingConfig.upsert.mockResolvedValue({ ...DEFAULT_CONFIG, managedMarkupPercent: 30 });
      const module = await Test.createTestingModule({
        providers: [
          BillingService,
          { provide: PrismaService,  useValue: mockPrisma },
          { provide: EmailService,   useValue: mockEmail  },
          { provide: ConfigService,  useValue: mockConfig },
          { provide: PdfService,     useValue: mockPdf    },
        ],
      }).compile();
      const fresh = module.get<BillingService>(BillingService);
      const factor = await fresh.getManagedMarkupFactor();
      expect(factor).toBeCloseTo(0.30);
    });
  });

  // ── limits ──────────────────────────────────────────────────────────────────

  describe('limits', () => {
    it('returns correct limits for each plan', () => {
      expect(service.limits('FREE').liveRequestsPerMonth).toBe(PLAN_LIMITS.FREE.liveRequestsPerMonth);
      expect(service.limits('PRO').liveRequestsPerMonth).toBe(PLAN_LIMITS.PRO.liveRequestsPerMonth);
      expect(service.limits('ENTERPRISE').liveRequestsPerMonth).toBe(PLAN_LIMITS.ENTERPRISE.liveRequestsPerMonth);
    });
  });
});
