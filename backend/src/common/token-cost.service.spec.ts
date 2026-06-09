import { Test, TestingModule } from '@nestjs/testing';
import { TokenCostService }    from './token-cost.service';

describe('TokenCostService', () => {
  let service: TokenCostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenCostService],
    }).compile();
    service = module.get<TokenCostService>(TokenCostService);
  });

  describe('getDefaultMarkup', () => {
    it('returns 0.20 (20%)', () => {
      expect(service.getDefaultMarkup()).toBe(0.20);
    });
  });

  describe('calculateManaged', () => {
    it('applies 20% markup over base model cost', () => {
      const base    = service.calculate('gpt-4o', 1000, 500);
      const managed = service.calculateManaged('gpt-4o', 1000, 500);
      expect(managed).toBeCloseTo(base * 1.20, 8);
    });

    it('returns 0 for unknown model', () => {
      expect(service.calculateManaged('unknown-model', 1000, 500)).toBe(0);
    });
  });

  describe('calculate', () => {
    it('returns 0 for zero tokens', () => {
      expect(service.calculate('gpt-4o', 0, 0)).toBe(0);
    });

    it('returns positive cost for known model with tokens', () => {
      const cost = service.calculate('gpt-4o', 10000, 1000);
      expect(cost).toBeGreaterThan(0);
    });
  });
});
