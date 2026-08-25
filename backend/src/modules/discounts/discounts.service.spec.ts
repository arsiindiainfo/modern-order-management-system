import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsService } from './discounts.service';
import { DiscountRow, DiscountsRepository } from './discounts.repository';

function buildRow(overrides: Partial<DiscountRow> = {}): DiscountRow {
  return {
    Id: 'discount-1',
    Code: 'WELCOME10',
    Type: 'PERCENT',
    Value: 10,
    StartsAt: '2026-01-01T00:00:00Z',
    EndsAt: '2026-12-31T23:59:59Z',
    UsageLimit: null,
    TimesUsed: 0,
    IsActive: true,
    ...overrides,
  };
}

describe('DiscountsService', () => {
  let service: DiscountsService;
  let repository: jest.Mocked<DiscountsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        {
          provide: DiscountsRepository,
          useValue: { list: jest.fn(), create: jest.fn(), validate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DiscountsService);
    repository = module.get(DiscountsRepository);
  });

  describe('list', () => {
    it('strips TotalItems and maps to the response shape', async () => {
      repository.list.mockResolvedValue([{ ...buildRow(), TotalItems: 1 }]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toEqual([
        {
          id: 'discount-1',
          code: 'WELCOME10',
          type: 'PERCENT',
          value: 10,
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-12-31T23:59:59Z',
          usageLimit: null,
          timesUsed: 0,
          isActive: true,
        },
      ]);
    });
  });

  describe('create', () => {
    it('passes the DTO and actor through to the repository', async () => {
      repository.create.mockResolvedValue(buildRow());

      const result = await service.create('tenant-1', 'user-1', {
        code: 'WELCOME10',
        type: 'PERCENT',
        value: 10,
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-12-31T23:59:59Z',
      });

      expect(repository.create).toHaveBeenCalledWith('tenant-1', 'user-1', {
        code: 'WELCOME10',
        type: 'PERCENT',
        value: 10,
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-12-31T23:59:59Z',
      });
      expect(result.code).toBe('WELCOME10');
    });
  });

  describe('validate', () => {
    it('maps a valid discount to the preview shape', async () => {
      repository.validate.mockResolvedValue({
        Code: 'WELCOME10',
        Type: 'PERCENT',
        Value: 10,
        DiscountAmount: 9.9,
      });

      const result = await service.validate('tenant-1', 'WELCOME10', 99.0);

      expect(result).toEqual({
        code: 'WELCOME10',
        type: 'PERCENT',
        value: 10,
        discountAmount: 9.9,
      });
    });

    it('throws DISCOUNT_NOT_APPLICABLE when the repository finds nothing', async () => {
      repository.validate.mockResolvedValue(undefined);

      await expect(
        service.validate('tenant-1', 'EXPIRED', 99.0),
      ).rejects.toMatchObject({ code: 'DISCOUNT_NOT_APPLICABLE' });
    });
  });
});
