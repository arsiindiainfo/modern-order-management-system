import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthUser } from '../types/auth-user.interface';

function createContext(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when the route has no @Roles() metadata', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createContext({
          userId: '1',
          tenantId: 't',
          role: 'STAFF',
          email: 'a@b.com',
        }),
      ),
    ).toBe(true);
  });

  it('allows the request when the user role is in the required list', () => {
    const reflector = {
      getAllAndOverride: () => ['MANAGER', 'TENANT_ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createContext({
          userId: '1',
          tenantId: 't',
          role: 'MANAGER',
          email: 'a@b.com',
        }),
      ),
    ).toBe(true);
  });

  it('throws FORBIDDEN_ROLE when the user role is not in the required list', () => {
    const reflector = {
      getAllAndOverride: () => ['TENANT_ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createContext({
          userId: '1',
          tenantId: 't',
          role: 'STAFF',
          email: 'a@b.com',
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'FORBIDDEN_ROLE' }));
  });

  it('throws FORBIDDEN_ROLE when there is no authenticated user at all', () => {
    const reflector = {
      getAllAndOverride: () => ['MANAGER'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN_ROLE' }),
    );
  });
});
