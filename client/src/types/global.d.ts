/**
 * Ambient type declarations for third-party globals that lack TypeScript definitions.
 */

interface NoSleep {
  enable(): Promise<void>;
  disable(): void;
  isEnabled: boolean;
}

interface GrecaptchaRenderParams {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal' | 'invisible';
  callback?: (token: string) => void;
}

interface Grecaptcha {
  render(container: string | HTMLElement, params: GrecaptchaRenderParams): number;
  getResponse(widgetId?: number): string;
  reset(widgetId?: number): void;
  execute(widgetId?: number): void;
}

interface Window {
  NoSleep: new () => NoSleep;
  grecaptcha: Grecaptcha;
}

declare let grecaptcha: Grecaptcha;
