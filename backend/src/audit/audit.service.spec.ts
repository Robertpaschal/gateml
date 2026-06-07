import { Test, TestingModule } from '@nestjs/testing';
import { AuditService }        from './audit.service';
import { PrismaService }       from '../prisma/prisma.service';

const mockPrisma = {
  auditLog: {
    create:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('writes an audit record to the database', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      await service.log({ adminId: 'a1', action: 'user.plan_changed', resource: 'user', resourceId: 'u1' });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: 'a1', action: 'user.plan_changed', resource: 'user', resourceId: 'u1',
          }),
        }),
      );
    });

    it('does not throw when DB write fails (non-blocking)', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      await expect(service.log({ action: 'test', resource: 'test' })).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    it('returns paginated logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);
      const result = await service.query({ resource: 'user', page: 1, limit: 10 });
      expect(result).toMatchObject({ logs: [], total: 0, page: 1 });
    });
  });
});
