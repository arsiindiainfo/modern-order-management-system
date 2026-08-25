import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditListRow, AuditRepository } from './audit.repository';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<AuditRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditRepository, useValue: { list: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuditService);
    repository = module.get(AuditRepository);
  });

  describe('list', () => {
    it('strips TotalItems and maps to the minimal audit-entry shape', async () => {
      const row: AuditListRow = {
        EntityName: 'Order',
        EntityId: 'order-1',
        Action: 'CREATE',
        ChangedByName: 'Priya Shah',
        ChangedAt: '2026-08-22T14:03:00Z',
        TotalItems: 1,
      };
      repository.list.mockResolvedValue([row]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toEqual([
        {
          entityName: 'Order',
          entityId: 'order-1',
          action: 'CREATE',
          changedBy: 'Priya Shah',
          changedAt: '2026-08-22T14:03:00Z',
        },
      ]);
      expect(result.meta.totalItems).toBe(1);
    });
  });
});
