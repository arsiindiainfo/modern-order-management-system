import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AppConfig } from '../../config/configuration';

describe('JwtStrategy', () => {
  it('maps verified JWT claims onto AuthUser', () => {
    const configService = {
      get: () => ({ secret: 'test-secret-at-least-32-characters-long' }),
    } as unknown as ConfigService<AppConfig, true>;
    const strategy = new JwtStrategy(configService);

    const result = strategy.validate({
      sub: 'user-1',
      tenantId: 'tenant-1',
      role: 'MANAGER',
      email: 'priya@acme-demo.com',
    });

    expect(result).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'MANAGER',
      email: 'priya@acme-demo.com',
    });
  });
});
