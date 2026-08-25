import { ApiProperty } from '@nestjs/swagger';

export class OrderHistoryEntryResponseDto {
  @ApiProperty({ example: null, nullable: true })
  fromStatus!: string | null;

  @ApiProperty({ example: 'PENDING' })
  toStatus!: string;

  @ApiProperty({ example: 'Priya Shah', nullable: true })
  changedBy!: string | null;

  @ApiProperty({ example: 'Payment captured', nullable: true })
  note!: string | null;

  @ApiProperty({ example: '2026-08-22T14:03:00Z' })
  changedAt!: string;
}
