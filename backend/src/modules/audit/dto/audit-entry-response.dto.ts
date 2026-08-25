import { ApiProperty } from '@nestjs/swagger';

/** §10/§11.4: minimal fields only — no raw before/after payload. */
export class AuditEntryResponseDto {
  @ApiProperty({ example: 'Order' })
  entityName!: string;

  @ApiProperty({ example: '6f1a2e10-...' })
  entityId!: string;

  @ApiProperty({ example: 'CREATE' })
  action!: string;

  @ApiProperty({ example: 'Priya Shah', nullable: true })
  changedBy!: string | null;

  @ApiProperty({ example: '2026-08-22T14:03:00Z' })
  changedAt!: string;
}
