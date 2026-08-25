import { ApiProperty } from '@nestjs/swagger';

/** The shape usp_Orders_Create/_Update/_UpdateStatus return: SELECT * FROM Orders — header fields only, no customerName, no lines. */
export class OrderSummaryResponseDto {
  @ApiProperty({ example: '6f1a2e10-...' })
  id!: string;

  @ApiProperty({ example: 'ORD-2026-000513' })
  orderNumber!: string;

  @ApiProperty({ example: 'c9d1e2f3-...' })
  customerId!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 99.0 })
  subtotal!: number;

  @ApiProperty({ example: 0 })
  discountTotal!: number;

  @ApiProperty({ example: 0 })
  taxTotal!: number;

  @ApiProperty({ example: 0 })
  shippingTotal!: number;

  @ApiProperty({ example: 99.0 })
  grandTotal!: number;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: '2026-08-22T14:03:00Z' })
  placedAt!: string;
}
