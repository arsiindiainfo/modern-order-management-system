import { ApiProperty } from '@nestjs/swagger';

class OrderRefDto {
  @ApiProperty({ example: '6f1a2e10-...' })
  id!: string;

  @ApiProperty({ example: 'CONFIRMED' })
  status!: string;

  @ApiProperty({ example: 4 })
  version!: number;
}

export class PaymentResultResponseDto {
  @ApiProperty({ example: 'p1a2b3c4-...' })
  paymentId!: string;

  @ApiProperty({ example: 'CAPTURED' })
  status!: string;

  @ApiProperty()
  order!: OrderRefDto;
}
