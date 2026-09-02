import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'manager@acme-demo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Google reCAPTCHA v2 response token. Omitted (or ignored server-side) when reCAPTCHA is not configured.',
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
