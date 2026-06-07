import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService }       from '@nestjs/config';
import { EventEmitter2 }       from '@nestjs/event-emitter';
import { EmailService }        from './email.service';
import { EMAIL_SEND }          from './email.events';

const mockConfig = { get: jest.fn((k: string, d?: unknown) => {
  const map: Record<string, string> = {
    APP_URL:            'https://app.gateml.com',
    ADMIN_FRONTEND_URL: 'https://admin.gateml.com',
    ADMIN_EMAIL:        'team@gateml.com',
  };
  return map[k] ?? d ?? null;
})};

const mockEmitter = { emit: jest.fn() };

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfig  },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  describe('enqueue', () => {
    it('emits EMAIL_SEND event with correct payload', () => {
      service.enqueue('user@test.com', 'Test Subject', 'welcome', { name: 'Alice' });
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        EMAIL_SEND,
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
    it('enqueues welcome email', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendWelcome('u@test.com', 'Bob');
      expect(spy).toHaveBeenCalledWith('u@test.com', expect.any(String), 'welcome', expect.objectContaining({ name: 'Bob' }));
    });
  });

  describe('sendEmailVerification', () => {
    it('enqueues email-verification template', () => {
      const spy = jest.spyOn(service, 'enqueue');
      service.sendEmailVerification('u@test.com', 'Alice', 'https://example.com/verify?token=abc');
      expect(spy).toHaveBeenCalledWith('u@test.com', expect.any(String), 'email-verification',
        expect.objectContaining({ verifyUrl: 'https://example.com/verify?token=abc' }));
    });
  });

  describe('notifyAdminNewMessage', () => {
    it('sends to admin email with enterprise-lead category', () => {
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

  describe('handleEmailSend — retry', () => {
    it('retries on failure up to MAX_RETRIES times', async () => {
      jest.useFakeTimers();
      const deliverSpy = jest.spyOn(service as any, 'renderTemplate').mockImplementation(() => { throw new Error('render fail'); });
      const emitSpy    = jest.spyOn(mockEmitter, 'emit');

      await service.handleEmailSend({ to: 'x@x.com', subject: 'S', template: 'welcome', context: {}, retries: 0 });

      // Advance timers to trigger the retry emit
      jest.runAllTimers();
      expect(emitSpy).toHaveBeenCalledWith(EMAIL_SEND, expect.objectContaining({ retries: 1 }));
      jest.useRealTimers();
      deliverSpy.mockRestore();
    });
  });
});
