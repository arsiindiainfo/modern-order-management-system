import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Only usable behind JwtAuthGuard + TenantScopeGuard — both already
 * guarantee request.user.tenantId is present, so this never falls back to
 * a client-supplied value.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user!.tenantId;
  },
);
