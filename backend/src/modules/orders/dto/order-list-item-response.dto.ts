import { ApiProperty } from '@nestjs/swagger';

export class OrderListItemResponseDto {
  @ApiProperty({ example: '6f1a2e10-...' })
  id!: string;

  @ApiProperty({ example: 'ORD-2026-000512' })
  orderNumber!: string;

  @ApiProperty({ example: 'Blue Sky Retail' })
  customerName!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 89.5 })
  grandTotal!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: '2026-08-22T14:03:00Z' })
  placedAt!: string;
}
