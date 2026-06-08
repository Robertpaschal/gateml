import { Test, TestingModule }       from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PromosService }             from './promos.service';
import { PrismaService }             from '../prisma/prisma.service';
import { ConfigService }             from '@nestjs/config';

const mockPrisma = {
  promoCode: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    count:      jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn((k: string) => k === 'STRIPE_SECRET_KEY' ? undefined : undefined),
};

describe('PromosService', () => {
  let service: PromosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(PromosService);
  });

  describe('create', () => {
    it('throws ConflictException when code already exists', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({ id: 'p1', code: 'SAVE20' });
      await expect(service.create({ code: 'save20', discountPercent: 20 })).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for invalid discount', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue(null);
      await expect(service.create({ code: 'BAD', discountPercent: 0 })).rejects.toThrow(BadRequestException);
      await expect(service.create({ code: 'BAD', discountPercent: 101 })).rejects.toThrow(BadRequestException);
    });

    it('creates a promo code without Stripe (no key configured)', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue(null);
      mockPrisma.promoCode.create.mockResolvedValue({ id: 'p1', code: 'SAVE20', discountPercent: 20 });

      const result = await service.create({ code: 'save20', discountPercent: 20 });

      expect(mockPrisma.promoCode.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'SAVE20', discountPercent: 20 }) }),
      );
      expect(result.id).toBe('p1');
    });
  });

  describe('validate', () => {
    it('returns invalid for unknown code', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue(null);
      const result = await service.validate('GHOST');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Code not found.');
    });

    it('returns invalid for inactive code', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({ id: 'p1', code: 'OLD', isActive: false, usedCount: 0, maxUses: null, validFrom: new Date(0), validUntil: null });
      const result = await service.validate('OLD');
      expect(result.valid).toBe(false);
    });

    it('returns invalid for expired code', async () => {
      const yesterday = new Date(Date.now() - 86_400_000);
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: 'p1', code: 'EXP', isActive: true, usedCount: 0, maxUses: null,
        validFrom: new Date(0), validUntil: yesterday,
      });
      const result = await service.validate('EXP');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/expired/i);
    });

    it('returns invalid when usage limit reached', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: 'p1', code: 'FULL', isActive: true, usedCount: 5, maxUses: 5,
        validFrom: new Date(0), validUntil: null,
      });
      const result = await service.validate('FULL');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/limit/i);
    });

    it('returns valid for an active, unexpired code with uses remaining', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({
        id: 'p1', code: 'SAVE20', isActive: true, usedCount: 2, maxUses: 10,
        validFrom: new Date(0), validUntil: null, discountPercent: 20, stripeCouponId: 'cou_abc',
      });
      const result = await service.validate('SAVE20');
      expect(result.valid).toBe(true);
      expect(result.discountPercent).toBe(20);
    });
  });

  describe('toggle', () => {
    it('throws NotFoundException for missing code', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue(null);
      await expect(service.toggle('nonexistent', false)).rejects.toThrow(NotFoundException);
    });

    it('deactivates a promo code', async () => {
      mockPrisma.promoCode.findUnique.mockResolvedValue({ id: 'p1', isActive: true, stripeCouponId: null });
      mockPrisma.promoCode.update.mockResolvedValue({ id: 'p1', isActive: false });
      const result = await service.toggle('p1', false);
      expect(result.isActive).toBe(false);
    });
  });
});
