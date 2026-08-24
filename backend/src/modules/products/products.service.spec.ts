import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import {
  ProductsRepository,
  ProductRow,
  InventoryRow,
} from './products.repository';

function buildProductRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    Id: 'prod-1',
    Sku: 'MUG-BLK-11OZ',
    Name: 'Black Ceramic Mug, 11oz',
    UnitPrice: 12.99,
    Currency: 'USD',
    IsActive: true,
    CreatedAt: '2026-08-01T09:12:00Z',
    ...overrides,
  };
}

function buildInventoryRow(
  overrides: Partial<InventoryRow> = {},
): InventoryRow {
  return {
    ProductId: 'prod-1',
    Sku: 'MUG-BLK-11OZ',
    QuantityOnHand: 480,
    QuantityReserved: 36,
    QuantityAvailable: 444,
    ReorderLevel: 50,
    ...overrides,
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: {
            list: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
            getInventory: jest.fn(),
            adjustInventory: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    repository = module.get(ProductsRepository);
  });

  describe('list', () => {
    it('strips TotalItems and builds pagination meta', async () => {
      repository.list.mockResolvedValue([
        { ...buildProductRow(), TotalItems: 1 },
      ]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toEqual([
        {
          id: 'prod-1',
          sku: 'MUG-BLK-11OZ',
          name: 'Black Ceramic Mug, 11oz',
          unitPrice: 12.99,
          currency: 'USD',
          isActive: true,
          createdAt: '2026-08-01T09:12:00Z',
        },
      ]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });

  describe('getById', () => {
    it('throws RESOURCE_NOT_FOUND when the repository returns no row (incl. cross-tenant)', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(
        service.getById('tenant-1', 'nonexistent'),
      ).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  describe('getInventory', () => {
    it('maps the joined Products+InventoryItems row', async () => {
      repository.getInventory.mockResolvedValue(buildInventoryRow());

      const result = await service.getInventory('tenant-1', 'prod-1');

      expect(result).toEqual({
        productId: 'prod-1',
        sku: 'MUG-BLK-11OZ',
        quantityOnHand: 480,
        quantityReserved: 36,
        quantityAvailable: 444,
        reorderLevel: 50,
      });
    });

    it('throws RESOURCE_NOT_FOUND for an unknown product', async () => {
      repository.getInventory.mockResolvedValue(undefined);

      await expect(
        service.getInventory('tenant-1', 'nonexistent'),
      ).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  describe('adjustInventory', () => {
    it('passes the delta and reason through to the repository', async () => {
      repository.adjustInventory.mockResolvedValue(
        buildInventoryRow({ QuantityOnHand: 530, QuantityAvailable: 494 }),
      );

      const result = await service.adjustInventory('tenant-1', 'prod-1', {
        quantityDelta: 50,
        reason: 'Received shipment PO-2026-0042',
      });

      expect(repository.adjustInventory).toHaveBeenCalledWith(
        'tenant-1',
        'prod-1',
        50,
        'Received shipment PO-2026-0042',
      );
      expect(result.quantityOnHand).toBe(530);
    });

    it('throws RESOURCE_NOT_FOUND when the product does not exist', async () => {
      repository.adjustInventory.mockResolvedValue(undefined);

      await expect(
        service.adjustInventory('tenant-1', 'nonexistent', {
          quantityDelta: 1,
          reason: 'x',
        }),
      ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    });
  });
});
