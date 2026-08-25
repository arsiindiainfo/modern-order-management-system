import { ApiProperty } from '@nestjs/swagger';
import { OrderLineResponseDto } from './order-line-response.dto';
import { OrderSummaryResponseDto } from './order-summary-response.dto';

/** usp_Orders_GetById's shape: the header (with the joined customerName) plus lines from its second result set. */
export class OrderDetailResponseDto extends OrderSummaryResponseDto {
  @ApiProperty({ example: 'Blue Sky Retail' })
  customerName!: string;

  @ApiProperty({ type: [OrderLineResponseDto] })
  lines!: OrderLineResponseDto[];
}
