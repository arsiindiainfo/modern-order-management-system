import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ example: '8f3c1a...' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
