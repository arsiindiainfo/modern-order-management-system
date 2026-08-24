import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from '../../../common/dto/address.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Blue Sky Retail' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'orders@blueskyretail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false, example: '+44 20 7946 0958' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, type: () => AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiProperty({ required: false, type: () => AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;
}
