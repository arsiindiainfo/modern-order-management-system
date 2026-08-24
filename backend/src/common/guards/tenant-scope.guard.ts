import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AppException } from '../exceptions/app.exception';

/**
 * Asserts a tenant-scoped request actually carries a tenantId — always
 * true once JwtAuthGuard has run, since tenantId comes only from the
 * verified JWT claim, never from a client-supplied header/body/query
 * (§5.1). Kept as its own guard (composed explicitly alongside
 * JwtAuthGuard/RolesGuard per §7.3) so tenant-scoping is an explicit,
 * visible part of every protected route's guard list rather than implicit.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user?.tenantId) {
      throw new AppException('UNAUTHENTICATED');
    }
    return true;
  }
}
