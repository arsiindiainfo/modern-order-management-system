import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';

describe('RecaptchaService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function buildService(secretKey: string): Promise<RecaptchaService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        { provide: ConfigService, useValue: { get: () => ({ secretKey }) } },
      ],
    }).compile();
    return module.get(RecaptchaService);
  }

  it('treats an unconfigured secret key as disabled — verifies without calling Google', async () => {
    const service = await buildService('');

    await expect(service.verify(undefined)).resolves.toBe(true);
    await expect(service.verify('any-token')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing token once reCAPTCHA is configured', async () => {
    const service = await buildService('a-real-secret');

    await expect(service.verify(undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls Google siteverify with the secret and token, returning its success flag', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    const service = await buildService('a-real-secret');

    await expect(service.verify('user-token')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('secret')).toBe('a-real-secret');
    expect(body.get('response')).toBe('user-token');
  });

  it('returns false when Google reports failure', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });
    const service = await buildService('a-real-secret');

    await expect(service.verify('bad-token')).resolves.toBe(false);
  });

  it('returns false when the siteverify request itself fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const service = await buildService('a-real-secret');

    await expect(service.verify('user-token')).resolves.toBe(false);
  });
});
