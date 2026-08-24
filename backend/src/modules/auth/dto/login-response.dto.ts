import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserDto } from './current-user.dto';
import { TokenPairDto } from './token-pair.dto';

export class LoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: () => CurrentUserDto })
  user!: CurrentUserDto;
}
