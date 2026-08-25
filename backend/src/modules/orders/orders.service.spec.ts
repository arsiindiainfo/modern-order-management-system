import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import {
  OrderDetailHeaderRow,
  OrderHistoryRow,
  OrderLineRow,
  OrderListRow,
  OrderRow,
  OrdersRepository,
} from './orders.repository';

function buildOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    Id: 'order-1',
    OrderNumber: 'ORD-2026-000001',
    CustomerId: 'customer-1',
    Status: 'PENDING',
    Currency: 'USD',
    Subtotal: 25.98,
    DiscountTotal: 0,
    TaxTotal: 0,
    ShippingTotal: 0,
    GrandTotal: 25.98,
    Version: 1,
    PlacedAt: '2026-08-22T14:03:00Z',
    ...overrides,
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<OrdersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            list: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            getHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    repository = module.get(OrdersRepository);
  });

  describe('list', () => {
    it('strips TotalItems and maps to the list DTO shape', async () => {
      const row: OrderListRow = {
        Id: 'order-1',
        OrderNumber: 'ORD-2026-000512',
        CustomerName: 'Blue Sky Retail',
        Status: 'PENDING',
        GrandTotal: 89.5,
        Currency: 'USD',
        Version: 1,
        PlacedAt: '2026-08-22T14:03:00Z',
        TotalItems: 1,
      };
      repository.list.mockResolvedValue([row]);

      const result = await service.list('tenant-1', { page: 1, pageSize: 20 });

      expect(result.data).toEqual([
        {
          id: 'order-1',
          orderNumber: 'ORD-2026-000512',
          customerName: 'Blue Sky Retail',
          status: 'PENDING',
          grandTotal: 89.5,
          currency: 'USD',
          version: 1,
          placedAt: '2026-08-22T14:03:00Z',
        },
      ]);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('getById', () => {
    it('maps the header and its joined lines', async () => {
      const header: OrderDetailHeaderRow = {
        ...buildOrderRow(),
        CustomerName: 'Blue Sky Retail',
      };
      const lines: OrderLineRow[] = [
        {
          Id: 'line-1',
          ProductId: 'product-1',
          ProductName: 'Black Ceramic Mug, 11oz',
          UnitPrice: 12.99,
          Quantity: 2,
          LineTotal: 25.98,
        },
      ];
      repository.getById.mockResolvedValue({ header, lines });

      const result = await service.getById('tenant-1', 'order-1');

      expect(result.customerName).toBe('Blue Sky Retail');
      expect(result.lines).toEqual([
        {
          id: 'line-1',
          productId: 'product-1',
          productName: 'Black Ceramic Mug, 11oz',
          unitPrice: 12.99,
          quantity: 2,
          lineTotal: 25.98,
        },
      ]);
    });

    it('throws RESOURCE_NOT_FOUND when the repository returns no order (incl. cross-tenant)', async () => {
      repository.getById.mockResolvedValue(undefined);

      await expect(
        service.getById('tenant-1', 'nonexistent'),
      ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    });
  });

  describe('create', () => {
    it('passes customerId/lines through and maps the summary response', async () => {
      repository.create.mockResolvedValue(buildOrderRow());

      const result = await service.create('tenant-1', 'user-1', {
        customerId: 'customer-1',
        lines: [{ productId: 'product-1', quantity: 2 }],
      });

      expect(repository.create).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'customer-1',
        [{ productId: 'product-1', quantity: 2 }],
      );
      expect(result.orderNumber).toBe('ORD-2026-000001');
      expect(result.grandTotal).toBe(25.98);
    });
  });

  describe('hold / resume / cancel', () => {
    it('hold fixes @ToStatus to ON_HOLD and forwards the reason as the note', async () => {
      repository.updateStatus.mockResolvedValue(
        buildOrderRow({ Status: 'ON_HOLD', Version: 2 }),
      );

      await service.hold('tenant-1', 'user-1', 'order-1', {
        version: 1,
        reason: 'Awaiting customer confirmation on substitute item',
      });

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'order-1',
        1,
        'ON_HOLD',
        'Awaiting customer confirmation on substitute item',
      );
    });

    it('resume fixes @ToStatus to PENDING', async () => {
      repository.updateStatus.mockResolvedValue(
        buildOrderRow({ Status: 'PENDING', Version: 3 }),
      );

      await service.resume('tenant-1', 'user-1', 'order-1', { version: 2 });

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'order-1',
        2,
        'PENDING',
        undefined,
      );
    });

    it('cancel fixes @ToStatus to CANCELLED', async () => {
      repository.updateStatus.mockResolvedValue(
        buildOrderRow({ Status: 'CANCELLED', Version: 2 }),
      );

      await service.cancel('tenant-1', 'user-1', 'order-1', { version: 1 });

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'order-1',
        1,
        'CANCELLED',
        undefined,
      );
    });
  });

  describe('getHistory', () => {
    it('maps history rows to the response shape', async () => {
      const row: OrderHistoryRow = {
        FromStatus: null,
        ToStatus: 'PENDING',
        ChangedByName: 'Priya Shah',
        Note: null,
        ChangedAt: '2026-08-22T14:03:00Z',
      };
      repository.getHistory.mockResolvedValue([row]);

      const result = await service.getHistory('tenant-1', 'order-1');

      expect(result).toEqual([
        {
          fromStatus: null,
          toStatus: 'PENDING',
          changedBy: 'Priya Shah',
          note: null,
          changedAt: '2026-08-22T14:03:00Z',
        },
      ]);
    });
  });
});
