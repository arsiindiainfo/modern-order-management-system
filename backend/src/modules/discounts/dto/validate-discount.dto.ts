import { ApiProperty } from '@nestjs/swagger';
import { IsPositive, IsNumber, IsString, MinLength } from 'class-validator';

export class ValidateDiscountDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({ example: 99.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  subtotal!: number;
}
