import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class HoldOrderDto {
  @ApiProperty({ example: 3, description: "The caller's last-known version" })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({ example: 'Awaiting customer confirmation on substitute item' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
