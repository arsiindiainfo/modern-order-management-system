import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface SiteverifyResponse {
  success: boolean;
}

/**
 * Verifies a Google reCAPTCHA v2 token server-side. No secret key
 * configured (local dev without one, or the .env.test/CI environment)
 * means reCAPTCHA is treated as disabled rather than blocking every
 * login — mirrors how other optional config in this app degrades.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async verify(token: string | undefined): Promise<boolean> {
    const secretKey = this.configService.get('recaptcha', {
      infer: true,
    }).secretKey;
    if (!secretKey) {
      return true;
    }
    if (!token) {
      return false;
    }

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    if (!response.ok) {
      this.logger.warn(`reCAPTCHA siteverify returned HTTP ${response.status}`);
      return false;
    }

    const result = (await response.json()) as SiteverifyResponse;
    return result.success === true;
  }
}
