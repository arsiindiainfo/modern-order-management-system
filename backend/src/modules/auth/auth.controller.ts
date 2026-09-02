import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiOkEnvelope } from '../../common/decorators/api-ok-envelope.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import type { AuthUser } from '../../common/types/auth-user.interface';
import { AuthService } from './auth.service';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TokenPairDto } from './dto/token-pair.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkEnvelope(LoginResponseDto)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto.email, dto.password, dto.recaptchaToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkEnvelope(TokenPairDto)
  refresh(@Body() dto: RefreshDto): Promise<TokenPairDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkEnvelope(LogoutResponseDto)
  async logout(@Body() dto: RefreshDto): Promise<LogoutResponseDto> {
    await this.authService.logout(dto.refreshToken);
    return { loggedOut: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
  @ApiOkEnvelope(CurrentUserDto)
  me(@CurrentUser() user: AuthUser): Promise<CurrentUserDto> {
    return this.authService.getCurrentUser(user.email);
  }
}
