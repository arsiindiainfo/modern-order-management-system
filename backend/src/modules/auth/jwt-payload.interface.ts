import { UserRole } from '../../common/types/auth-user.interface';

/** Access token claims (§7.1): sub, tenantId, role, email (+ iat/exp added by the JWT library). */
export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}
