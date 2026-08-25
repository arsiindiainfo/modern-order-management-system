import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty({ example: 'PERCENT', enum: ['PERCENT', 'FIXED'] })
  @IsIn(['PERCENT', 'FIXED'])
  type!: 'PERCENT' | 'FIXED';

  @ApiProperty({ example: 10 })
  @IsPositive()
  value!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  @IsISO8601()
  startsAt!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  endsAt!: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
}
