export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'STAFF';

/**
 * The verified JWT payload, attached to `request.user` by Passport once
 * JwtStrategy.validate() runs (§7.1). Never sourced from client input —
 * TenantScopeGuard/RolesGuard/@CurrentUser()/@TenantId() all read this off
 * the request, never off a body/header/query the caller controls.
 */
export interface AuthUser {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}
