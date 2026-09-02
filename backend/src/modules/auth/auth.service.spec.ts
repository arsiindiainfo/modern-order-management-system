import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthRepository, UserWithPasswordHash } from './auth.repository';
import { RecaptchaService } from './recaptcha.service';
import { AppException } from '../../common/exceptions/app.exception';

const JWT_CONFIG = {
  secret: 'test-secret-at-least-32-characters-long',
  accessExpiresIn: '15m',
  refreshExpiresDays: 7,
};

function buildUser(
  overrides: Partial<UserWithPasswordHash> = {},
): UserWithPasswordHash {
  return {
    Id: 'user-1',
    TenantId: 'tenant-1',
    FullName: 'Priya Shah',
    Email: 'priya@acme-demo.com',
    PasswordHash: 'irrelevant',
    Role: 'MANAGER',
    IsActive: true,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let recaptchaService: jest.Mocked<RecaptchaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            getUserByEmail: jest.fn(),
            createRefreshToken: jest.fn(),
            rotateRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') },
        },
        { provide: ConfigService, useValue: { get: () => JWT_CONFIG } },
        {
          provide: RecaptchaService,
          // Defaults to "verified" so the existing login tests below
          // don't need to know anything about reCAPTCHA; the dedicated
          // tests further down override this per-case.
          useValue: { verify: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    recaptchaService = module.get(RecaptchaService);
  });

  describe('login', () => {
    it('throws RECAPTCHA_FAILED without touching the repository when verification fails', async () => {
      recaptchaService.verify.mockResolvedValue(false);

      await expect(
        service.login('priya@acme-demo.com', 'pw', 'bad-token'),
      ).rejects.toMatchObject({ code: 'RECAPTCHA_FAILED' });
      expect(repository.getUserByEmail).not.toHaveBeenCalled();
    });

    it('passes the recaptcha token through to RecaptchaService', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      repository.getUserByEmail.mockResolvedValue(
        buildUser({ PasswordHash: hash }),
      );
      repository.createRefreshToken.mockResolvedValue({
        Id: 'rt-1',
        UserId: 'user-1',
        TokenHash: 'hashed',
        ExpiresAt: new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
      });

      await service.login('priya@acme-demo.com', 'correct-password', 'good-token');

      expect(recaptchaService.verify).toHaveBeenCalledWith('good-token');
    });

    it('throws INVALID_CREDENTIALS when no user matches the email', async () => {
      repository.getUserByEmail.mockResolvedValue(undefined);

      await expect(service.login('nobody@x.com', 'pw')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('throws INVALID_CREDENTIALS when the user is inactive', async () => {
      repository.getUserByEmail.mockResolvedValue(
        buildUser({ IsActive: false }),
      );

      await expect(
        service.login('priya@acme-demo.com', 'pw'),
      ).rejects.toBeInstanceOf(AppException);
    });

    it('throws INVALID_CREDENTIALS on a password mismatch', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      repository.getUserByEmail.mockResolvedValue(
        buildUser({ PasswordHash: hash }),
      );

      await expect(
        service.login('priya@acme-demo.com', 'wrong-password'),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('issues a token pair and returns the user summary on success', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      repository.getUserByEmail.mockResolvedValue(
        buildUser({ PasswordHash: hash }),
      );
      repository.createRefreshToken.mockResolvedValue({
        Id: 'rt-1',
        UserId: 'user-1',
        TokenHash: 'hashed',
        ExpiresAt: new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
      });

      const result = await service.login(
        'priya@acme-demo.com',
        'correct-password',
      );

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.expiresIn).toBe(900);
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: 'user-1',
        fullName: 'Priya Shah',
        email: 'priya@acme-demo.com',
        role: 'MANAGER',
        tenantId: 'tenant-1',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
          email: 'priya@acme-demo.com',
        },
        expect.objectContaining({ expiresIn: 900 }),
      );
    });
  });

  describe('refresh', () => {
    it('rotates the token and reissues an access token from the joined user claims', async () => {
      repository.rotateRefreshToken.mockResolvedValue({
        Id: 'rt-2',
        UserId: 'user-1',
        TokenHash: 'new-hash',
        ExpiresAt: new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
        TenantId: 'tenant-1',
        Email: 'priya@acme-demo.com',
        Role: 'MANAGER',
      });

      const result = await service.refresh('old-raw-token');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(repository.rotateRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('logout', () => {
    it('revokes the hashed token', async () => {
      await service.logout('raw-refresh-token');
      expect(repository.revokeRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
      );
    });
  });

  describe('getCurrentUser', () => {
    it('maps the repository row to CurrentUserDto', async () => {
      repository.getUserByEmail.mockResolvedValue(buildUser());

      const result = await service.getCurrentUser('priya@acme-demo.com');

      expect(result).toEqual({
        id: 'user-1',
        fullName: 'Priya Shah',
        email: 'priya@acme-demo.com',
        role: 'MANAGER',
        tenantId: 'tenant-1',
      });
    });

    it('throws UNAUTHENTICATED when the user is missing or inactive', async () => {
      repository.getUserByEmail.mockResolvedValue(undefined);

      await expect(service.getCurrentUser('gone@x.com')).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    });
  });
});
