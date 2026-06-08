import { Test, TestingModule }  from '@nestjs/testing';
import { getQueueToken }        from '@nestjs/bullmq';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignsService }     from './campaigns.service';
import { PrismaService }        from '../prisma/prisma.service';
import { EmailService }         from '../email/email.service';
import { ConfigService }        from '@nestjs/config';
import { CAMPAIGN_EMAIL_QUEUE } from '../email/email.queue';

const mockPrisma = {
  campaign: {
    create:     jest.fn(),
    findMany:   jest.fn(),
    count:      jest.fn(),
    findUnique: jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

const mockQueue = {
  addBulk: jest.fn().mockResolvedValue([]),
};

const mockEmail  = { deliverRaw: jest.fn() };
const mockConfig = { get: jest.fn((k: string) => k === 'APP_URL' ? 'https://app.gateml.com' : undefined) };

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService,             useValue: mockPrisma  },
        { provide: EmailService,              useValue: mockEmail   },
        { provide: ConfigService,             useValue: mockConfig  },
        { provide: getQueueToken(CAMPAIGN_EMAIL_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(CampaignsService);
  });

  describe('create', () => {
    it('creates a campaign record', async () => {
      const now = new Date();
      mockPrisma.campaign.create.mockResolvedValue({ id: 'camp1', title: 'Test', status: 'DRAFT', createdAt: now });
      const result = await service.create({ title: 'Test', subject: 'Hello', body: '<p>Hi</p>', target: 'ALL' });
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Test', target: 'ALL' }) }),
      );
      expect(result.id).toBe('camp1');
    });
  });

  describe('list', () => {
    it('returns paginated campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'c1' }]);
      mockPrisma.campaign.count.mockResolvedValue(1);
      const result = await service.list(1, 25);
      expect(result).toEqual({ campaigns: [{ id: 'c1' }], total: 1, page: 1, pages: 1 });
    });
  });

  describe('get', () => {
    it('throws NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.get('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns campaign when found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'c1', status: 'DRAFT' });
      const result = await service.get('c1');
      expect(result.id).toBe('c1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException for missing campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { title: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when campaign is already sent', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'c1', status: 'SENT' });
      await expect(service.update('c1', { title: 'New' })).rejects.toThrow(BadRequestException);
    });

    it('updates a draft campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'c1', status: 'DRAFT' });
      mockPrisma.campaign.update.mockResolvedValue({ id: 'c1', title: 'Updated' });
      const result = await service.update('c1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('send', () => {
    it('throws NotFoundException for missing campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.send('x')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if already sent', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'c1', status: 'SENT' });
      await expect(service.send('c1')).rejects.toThrow(BadRequestException);
    });

    it('enqueues jobs for all verified users and marks campaign sent', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1', status: 'DRAFT', target: 'ALL', title: 'Test', subject: 'Hi',
        body: '<p>Hello</p>',
      });
      mockPrisma.campaign.update.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'a@test.com', name: 'Alice' },
        { email: 'b@test.com', name: 'Bob' },
      ]);

      const result = await service.send('c1');

      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SENDING' }) }),
      );
      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ data: expect.objectContaining({ to: 'a@test.com' }) }),
          expect.objectContaining({ data: expect.objectContaining({ to: 'b@test.com' }) }),
        ]),
      );
      expect(result.queued).toBe(2);
    });
  });
});
