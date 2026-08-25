import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class OrderLineInputDto {
  @ApiProperty({ example: 'p1a2b3c4-...' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}
