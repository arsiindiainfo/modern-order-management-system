import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'p1a2b3c4-...' })
  id!: string;

  @ApiProperty({ example: 'MUG-BLK-11OZ' })
  sku!: string;

  @ApiProperty({ example: 'Black Ceramic Mug, 11oz' })
  name!: string;

  @ApiProperty({ example: 12.99 })
  unitPrice!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-08-01T09:12:00Z' })
  createdAt!: string;
}
