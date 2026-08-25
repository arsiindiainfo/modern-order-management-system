import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsUUID, ValidateNested } from 'class-validator';
import { OrderLineInputDto } from './order-line-input.dto';

export class CreateOrderDto {
  @ApiProperty({ example: 'c9d1e2f3-...' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ type: [OrderLineInputDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines!: OrderLineInputDto[];
}
