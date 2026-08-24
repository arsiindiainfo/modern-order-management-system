import { ApiProperty } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  accessToken!: string;

  @ApiProperty({ example: '8f3c1a...' })
  refreshToken!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds',
  })
  expiresIn!: number;
}
