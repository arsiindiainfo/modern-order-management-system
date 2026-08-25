import { ApiProperty } from '@nestjs/swagger';

class OrderRefDto {
  @ApiProperty({ example: '6f1a2e10-...' })
  id!: string;

  @ApiProperty({ example: 'SHIPPED' })
  status!: string;

  @ApiProperty({ example: 5 })
  version!: number;
}

export class ShipmentResultResponseDto {
  @ApiProperty({ example: 's1a2b3c4-...' })
  shipmentId!: string;

  @ApiProperty({ example: 'UPS' })
  carrier!: string;

  @ApiProperty({ example: '1Z999AA10123456784' })
  trackingNumber!: string;

  @ApiProperty()
  order!: OrderRefDto;
}
