import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

/** Matches the {line1, city, postalCode, country} JSON shape stored in Customers.BillingAddress/ShippingAddress (§6.2). */
export class AddressDto {
  @ApiProperty({ example: '221B Baker Street' })
  @IsString()
  @MinLength(1)
  line1!: string;

  @ApiProperty({ example: 'London' })
  @IsString()
  @MinLength(1)
  city!: string;

  @ApiProperty({ example: 'NW1 6XE' })
  @IsString()
  @MinLength(1)
  postalCode!: string;

  @ApiProperty({ example: 'GB' })
  @IsString()
  @Length(2, 2)
  country!: string;
}
