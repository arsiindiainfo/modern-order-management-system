import { ApiProperty } from '@nestjs/swagger';

export class DiscountValidationResponseDto {
  @ApiProperty({ example: 'WELCOME10' })
  code!: string;

  @ApiProperty({ example: 'PERCENT' })
  type!: string;

  @ApiProperty({ example: 10 })
  value!: number;

  @ApiProperty({ example: 9.9 })
  discountAmount!: number;
}
