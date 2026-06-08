/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService }       from '@nestjs/config';
import { getQueueToken }       from '@nestjs/bullmq';
import { EmailService }        from './email.service';
import { EMAIL_QUEUE }         from './email.queue';

const mockConfig = { get: jest.fn((k: string, d?: unknown) => {
  const map: Record<string, string> = {
    APP_URL:            'https://app.gateml.com',
    ADMIN_FRONTEND_URL: 'https://admin.gateml.com',
    ADMIN_EMAIL:        'team@gateml.com',
  };
  return map[k] ?? d ?? null;
})};

const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService,              useValue: mockConfig },
        { provide: getQueueToken(EMAIL_QUEUE), useValue: mockQueue  },
      ],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  describe('enqueue', () => {
    it('adds a job to the BullMQ queue', () => {
      service.enqueue('user@test.com', 'Test Subject', 'welcome', { name: 'Alice' });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          to:       'user@test.com',
          subject:  'Test Subject',
          template: 'welcome',
          context:  expect.objectContaining({ name: 'Alice' }),
        }),
      );
    });
  });

  describe('sendWelcome', () => {
    it('enqueues welcome email with correct template', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendWelcome('u@test.com', 'Bob');
      expect(spy).toHaveBeenCalledWith(
        'u@test.com', expect.any(String), 'welcome',
        expect.objectContaining({ name: 'Bob' }),
      );
    });
  });

  describe('sendEmailVerification', () => {
    it('enqueues email-verification template with verify URL', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendEmailVerification('u@test.com', 'Alice', 'https://example.com/verify?token=abc');
      expect(spy).toHaveBeenCalledWith(
        'u@test.com', expect.any(String), 'email-verification',
        expect.objectContaining({ verifyUrl: 'https://example.com/verify?token=abc' }),
      );
    });
  });

  describe('notifyAdminNewMessage', () => {
    it('routes enterprise lead with correct subject prefix and category label', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.notifyAdminNewMessage('lead@co.com', 'Bob Corp', 'Pricing', 'Hi', 'msg1', 'Corp Inc', 'ENTERPRISE_LEAD');
      expect(spy).toHaveBeenCalledWith(
        'team@gateml.com',
        expect.stringContaining('[LEAD]'),
        'admin-new-message',
        expect.objectContaining({ categoryLabel: 'Enterprise Lead' }),
      );
    });
  });

  describe('sendAdminCustomMessage', () => {
    it('enqueues custom message to the user', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendAdminCustomMessage('u@test.com', 'Alice', 'Hello there', 'Welcome!', 'Admin Name');
      expect(spy).toHaveBeenCalledWith(
        'u@test.com',
        'Hello there',
        'admin-custom-message',
        expect.objectContaining({ body: 'Welcome!', adminName: 'Admin Name' }),
      );
    });
  });

  describe('sendInvoice', () => {
    it('enqueues invoice with PDF attachment when buffer provided', () => {
      const spy    = jest.spyOn(service, 'enqueue');
      const pdfBuf = Buffer.from('%PDF-1.4 test');
      service.sendInvoice('u@test.com', 'Alice', {
        invoiceId: 'inv_123', plan: 'PRO', amount: '$19.00 USD',
        periodStart: 'Jun 1', periodEnd: 'Jun 30', date: 'Jun 1, 2026',
      }, pdfBuf);
      expect(spy).toHaveBeenCalledWith(
        'u@test.com',
        expect.stringContaining('PRO'),
        'invoice',
        expect.objectContaining({ invoiceId: 'inv_123' }),
        expect.arrayContaining([
          expect.objectContaining({ filename: 'invoice-inv_123.pdf', contentType: 'application/pdf' }),
        ]),
      );
    });

    it('enqueues invoice without attachment when no buffer', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendInvoice('u@test.com', 'Alice', {
        invoiceId: 'inv_456', plan: 'PRO', amount: '$19.00 USD',
        periodStart: 'Jun 1', periodEnd: 'Jun 30', date: 'Jun 1, 2026',
      });
      expect(spy).toHaveBeenCalledWith(
        'u@test.com', expect.any(String), 'invoice',
        expect.objectContaining({ invoiceId: 'inv_456' }),
      );
    });
  });
});
