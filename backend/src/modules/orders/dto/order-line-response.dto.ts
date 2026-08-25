import { ApiProperty } from '@nestjs/swagger';

export class OrderLineResponseDto {
  @ApiProperty({ example: 'l1a2b3c4-...' })
  id!: string;

  @ApiProperty({ example: 'p1a2b3c4-...' })
  productId!: string;

  @ApiProperty({ example: 'Black Ceramic Mug, 11oz' })
  productName!: string;

  @ApiProperty({ example: 12.99 })
  unitPrice!: number;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 25.98 })
  lineTotal!: number;
}
