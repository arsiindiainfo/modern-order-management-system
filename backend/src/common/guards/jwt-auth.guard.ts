import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the bearer access token via Passport's 'jwt' strategy
 * (JwtStrategy) and attaches the verified payload to `request.user`.
 * A missing/invalid/expired token throws Nest's default UnauthorizedException,
 * which AllExceptionsFilter (Phase 0) already maps to 401 UNAUTHENTICATED.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
