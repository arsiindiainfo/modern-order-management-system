import { ApiProperty } from '@nestjs/swagger';
import {
  IsPositive,
  IsNumber,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty({ example: 'STRIPE' })
  @IsString()
  @MinLength(1)
  provider!: string;

  @ApiProperty({ example: 101.23 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ example: 'pi_3P9x...' })
  @IsString()
  @MinLength(1)
  transactionRef!: string;
}
