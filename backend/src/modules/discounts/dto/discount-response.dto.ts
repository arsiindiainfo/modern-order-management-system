import { ApiProperty } from '@nestjs/swagger';

export class DiscountResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-...' })
  id!: string;

  @ApiProperty({ example: 'WELCOME10' })
  code!: string;

  @ApiProperty({ example: 'PERCENT' })
  type!: string;

  @ApiProperty({ example: 10 })
  value!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  startsAt!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  endsAt!: string;

  @ApiProperty({ required: false, example: 100, nullable: true })
  usageLimit!: number | null;

  @ApiProperty({ example: 3 })
  timesUsed!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
