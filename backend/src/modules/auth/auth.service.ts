import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../../config/configuration';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthRepository } from './auth.repository';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { JwtPayload } from './jwt-payload.interface';
import {
  generateRefreshToken,
  hashToken,
  parseDurationToSeconds,
} from './token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.authRepository.getUserByEmail(email);
    if (!user || !user.IsActive) {
      throw new AppException('INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordMatches) {
      throw new AppException('INVALID_CREDENTIALS');
    }

    const accessToken = this.signAccessToken({
      sub: user.Id,
      tenantId: user.TenantId,
      role: user.Role,
      email: user.Email,
    });
    const refreshToken = await this.issueRefreshToken(user.Id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtlSeconds(),
      user: {
        id: user.Id,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        tenantId: user.TenantId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const newToken = generateRefreshToken();
    const rotated = await this.authRepository.rotateRefreshToken(
      hashToken(refreshToken),
      hashToken(newToken),
      this.refreshTokenExpiresAt(),
    );

    const accessToken = this.signAccessToken({
      sub: rotated.UserId,
      tenantId: rotated.TenantId,
      role: rotated.Role,
      email: rotated.Email,
    });

    return {
      accessToken,
      refreshToken: newToken,
      expiresIn: this.accessTokenTtlSeconds(),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authRepository.revokeRefreshToken(hashToken(refreshToken));
  }

  async getCurrentUser(email: string): Promise<CurrentUserDto> {
    // No usp_Users_GetById exists yet (that's Phase 2's Users-module
    // scope) — usp_Auth_GetUserByEmail already returns everything /me
    // needs (including FullName, which isn't a JWT claim), and `email`
    // here comes only from the verified access token, never client input.
    const user = await this.authRepository.getUserByEmail(email);
    if (!user || !user.IsActive) {
      throw new AppException('UNAUTHENTICATED');
    }
    return {
      id: user.Id,
      fullName: user.FullName,
      email: user.Email,
      role: user.Role,
      tenantId: user.TenantId,
    };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = generateRefreshToken();
    await this.authRepository.createRefreshToken(
      userId,
      hashToken(token),
      this.refreshTokenExpiresAt(),
    );
    return token;
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt', { infer: true }).secret,
      expiresIn: this.accessTokenTtlSeconds(),
    });
  }

  private accessTokenTtlSeconds(): number {
    return parseDurationToSeconds(
      this.configService.get('jwt', { infer: true }).accessExpiresIn,
    );
  }

  private refreshTokenExpiresAt(): Date {
    const days = this.configService.get('jwt', {
      infer: true,
    }).refreshExpiresDays;
    return new Date(Date.now() + days * 86400 * 1000);
  }
}
