import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from '../../../common/dto/address.dto';

export class CustomerResponseDto {
  @ApiProperty({ example: '6f1a2e10-9c3d-4b7a-8e2f-1a2b3c4d5e6f' })
  id!: string;

  @ApiProperty({ example: 'Blue Sky Retail' })
  name!: string;

  @ApiProperty({ example: 'orders@blueskyretail.com' })
  email!: string;

  @ApiProperty({ required: false, nullable: true, example: '+44 20 7946 0958' })
  phone!: string | null;

  @ApiProperty({ required: false, nullable: true, type: () => AddressDto })
  billingAddress!: AddressDto | null;

  @ApiProperty({ required: false, nullable: true, type: () => AddressDto })
  shippingAddress!: AddressDto | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-08-01T09:12:00Z' })
  createdAt!: string;
}
