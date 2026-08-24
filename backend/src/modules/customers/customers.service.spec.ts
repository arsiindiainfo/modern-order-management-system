import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { CustomersRepository, CustomerRow } from './customers.repository';

function buildRow(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    Id: 'cust-1',
    Name: 'Blue Sky Retail',
    Email: 'orders@blueskyretail.com',
    Phone: null,
    BillingAddress: null,
    ShippingAddress: null,
    IsActive: true,
    CreatedAt: '2026-08-01T09:12:00Z',
    ...overrides,
  };
}

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<CustomersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: CustomersRepository,
          useValue: {
            list: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CustomersService);
    repository = module.get(CustomersRepository);
  });

  describe('list', () => {
    it('strips TotalItems and builds pagination meta', async () => {
      repository.list.mockResolvedValue([
        { ...buildRow({ Id: 'a' }), TotalItems: 2 },
        { ...buildRow({ Id: 'b' }), TotalItems: 2 },
      ]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).not.toHaveProperty('TotalItems');
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      });
    });

    it('returns zeroed meta for an empty tenant', async () => {
      repository.list.mockResolvedValue([]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      });
    });
  });

  describe('getById', () => {
    it('parses stored JSON addresses back into objects', async () => {
      repository.getById.mockResolvedValue(
        buildRow({
          BillingAddress: JSON.stringify({
            line1: '1 Main St',
            city: 'London',
            postalCode: 'W1',
            country: 'GB',
          }),
        }),
      );

      const result = await service.getById('tenant-1', 'cust-1');

      expect(result.billingAddress).toEqual({
        line1: '1 Main St',
        city: 'London',
        postalCode: 'W1',
        country: 'GB',
      });
    });

    it('throws RESOURCE_NOT_FOUND when the repository returns no row (incl. cross-tenant)', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(
        service.getById('tenant-1', 'nonexistent'),
      ).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  describe('create', () => {
    it('passes the DTO through to the repository and maps the result', async () => {
      repository.create.mockResolvedValue(buildRow());

      const result = await service.create('tenant-1', {
        name: 'Blue Sky Retail',
        email: 'orders@blueskyretail.com',
      });

      expect(repository.create).toHaveBeenCalledWith('tenant-1', {
        name: 'Blue Sky Retail',
        email: 'orders@blueskyretail.com',
        phone: undefined,
        billingAddress: undefined,
        shippingAddress: undefined,
      });
      expect(result.id).toBe('cust-1');
    });
  });

  describe('deactivate', () => {
    it('delegates to the repository', async () => {
      await service.deactivate('tenant-1', 'cust-1');
      expect(repository.deactivate).toHaveBeenCalledWith('tenant-1', 'cust-1');
    });
  });
});
