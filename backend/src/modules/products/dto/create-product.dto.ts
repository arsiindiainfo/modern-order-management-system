import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'MUG-BLK-11OZ' })
  @IsString()
  @MinLength(1)
  sku!: string;

  @ApiProperty({ example: 'Black Ceramic Mug, 11oz' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 12.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice!: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    required: false,
    example: 100,
    description: 'Starting stock quantity',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
