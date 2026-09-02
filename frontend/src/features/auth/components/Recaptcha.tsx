import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
        },
      ) => number;
    };
    __onRecaptchaApiLoad?: () => void;
  }
}

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_URL =
  'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaApiLoad&render=explicit';

let scriptLoadPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (window.grecaptcha) {
    return Promise.resolve();
  }
  scriptLoadPromise ??= new Promise((resolve) => {
    window.__onRecaptchaApiLoad = () => resolve();
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export interface RecaptchaProps {
  onVerify: (token: string | null) => void;
}

/**
 * Renders nothing when no site key is configured — reCAPTCHA is opt-in
 * per environment (see backend RecaptchaService, which treats a missing
 * secret key the same way), not a hard requirement to run this app.
 */
export function Recaptcha({ onVerify }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current || renderedRef.current) {
      return;
    }
    let cancelled = false;

    void loadRecaptchaScript().then(() => {
      if (cancelled || renderedRef.current || !containerRef.current || !window.grecaptcha) {
        return;
      }
      renderedRef.current = true;
      window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify(token),
        'expired-callback': () => onVerify(null),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [onVerify]);

  if (!SITE_KEY) {
    return null;
  }

  return <div ref={containerRef} />;
}
