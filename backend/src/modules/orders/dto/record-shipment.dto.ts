import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class RecordShipmentDto {
  @ApiProperty({ example: 4, description: "The caller's last-known version" })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ example: 'UPS' })
  @IsString()
  @MinLength(1)
  carrier!: string;

  @ApiProperty({ example: '1Z999AA10123456784' })
  @IsString()
  @MinLength(1)
  trackingNumber!: string;
}
