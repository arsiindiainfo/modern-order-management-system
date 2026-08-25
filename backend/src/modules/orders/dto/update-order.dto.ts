import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

/**
 * §17's PUT /orders/:id example updates shippingAddress, which has no
 * backing Orders column (§6.2) — see the Phase 3 plan's flagged decision.
 * CustomerId is the one plausibly-editable field the real schema has.
 */
export class UpdateOrderDto {
  @ApiProperty({ example: 1, description: "The caller's last-known version" })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ example: 'c9d1e2f3-...' })
  @IsUUID()
  customerId!: string;
}
