import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({
    example: 50,
    description: 'Positive to receive stock, negative to remove it',
  })
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @ApiProperty({ example: 'Received shipment PO-2026-0042' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
