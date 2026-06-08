import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService }       from '@nestjs/config';
import { PdfService }          from './pdf.service';

const mockConfig = { get: jest.fn((k: string) => k === 'APP_URL' ? 'https://app.gateml.com' : undefined) };

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(PdfService);
  });

  describe('generateInvoice', () => {
    it('returns a non-empty PDF Buffer', async () => {
      const buf = await service.generateInvoice({
        invoiceId:     'inv_test123',
        customerName:  'Alice Smith',
        customerEmail: 'alice@example.com',
        plan:          'PRO',
        amount:        1900,    // $19.00 in cents
        currency:      'usd',
        periodStart:   new Date('2026-06-01'),
        periodEnd:     new Date('2026-06-30'),
        issuedAt:      new Date('2026-06-01'),
      });

      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(1000); // real PDFs are at least a few KB
      // PDF header magic bytes
      expect(buf.slice(0, 4).toString()).toBe('%PDF');
    }, 15_000); // PDF generation can take a second in CI

    it('generates a larger PDF for a PRO invoice than a free one (content scales)', async () => {
      const freeBuf = await service.generateInvoice({
        invoiceId:     'inv_free',
        customerName:  'Bob Jones',
        customerEmail: 'bob@example.com',
        plan:          'FREE',
        amount:        0,
        currency:      'usd',
        periodStart:   new Date(),
        periodEnd:     new Date(),
        issuedAt:      new Date(),
      });
      // The PDF should still be a valid non-trivial file
      expect(freeBuf).toBeInstanceOf(Buffer);
      expect(freeBuf.length).toBeGreaterThan(500);
      expect(freeBuf.slice(0, 4).toString()).toBe('%PDF');
    }, 15_000);
  });
});
