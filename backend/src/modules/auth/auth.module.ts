import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../../config/configuration';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RecaptchaService } from './recaptcha.service';
import { parseDurationToSeconds } from './token.util';

@Module({
  imports: [
    StoredProcedureRunnerModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('jwt', { infer: true }).secret,
        signOptions: {
          expiresIn: parseDurationToSeconds(
            configService.get('jwt', { infer: true }).accessExpiresIn,
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, RecaptchaService],
})
export class AuthModule {}
