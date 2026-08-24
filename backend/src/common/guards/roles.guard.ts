import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppException } from '../exceptions/app.exception';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../types/auth-user.interface';

/**
 * Reads @Roles(...) metadata off the handler and compares it against
 * request.user.role (set by JwtAuthGuard, which must run first). No
 * @Roles() on a route means no role restriction — only JwtAuthGuard's
 * authentication check applies (§7.2/§7.3).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new AppException('FORBIDDEN_ROLE');
    }
    return true;
  }
}
