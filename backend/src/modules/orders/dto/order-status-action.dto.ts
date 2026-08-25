import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Shared by resume/cancel — hold has its own DTO since it requires a reason. */
export class OrderStatusActionDto {
  @ApiProperty({ example: 4, description: "The caller's last-known version" })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    required: false,
    example: 'Customer confirmed the substitute.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
