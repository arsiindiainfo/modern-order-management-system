import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

/** Sku is immutable once created — not part of the update contract. */
export class UpdateProductDto {
  @ApiProperty({ example: 'Black Ceramic Mug, 11oz' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 12.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice!: number;

  @ApiProperty({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
