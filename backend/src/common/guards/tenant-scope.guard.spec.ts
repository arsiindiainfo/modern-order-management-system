import { ExecutionContext } from '@nestjs/common';
import { TenantScopeGuard } from './tenant-scope.guard';
import { AuthUser } from '../types/auth-user.interface';

function createContext(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('TenantScopeGuard', () => {
  const guard = new TenantScopeGuard();

  it('allows a request whose verified user carries a tenantId', () => {
    expect(
      guard.canActivate(
        createContext({
          userId: '1',
          tenantId: 't-1',
          role: 'STAFF',
          email: 'a@b.com',
        }),
      ),
    ).toBe(true);
  });

  it('throws UNAUTHENTICATED when there is no user on the request', () => {
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    );
  });

  it('throws UNAUTHENTICATED when the user has no tenantId', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          userId: '1',
          tenantId: '',
          role: 'STAFF',
          email: 'a@b.com',
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'UNAUTHENTICATED' }));
  });
});
