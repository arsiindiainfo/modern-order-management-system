import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({ example: 'p1a2b3c4-...' })
  productId!: string;

  @ApiProperty({ example: 'MUG-BLK-11OZ' })
  sku!: string;

  @ApiProperty({ example: 480 })
  quantityOnHand!: number;

  @ApiProperty({ example: 36 })
  quantityReserved!: number;

  @ApiProperty({ example: 444 })
  quantityAvailable!: number;

  @ApiProperty({ example: 50 })
  reorderLevel!: number;
}
