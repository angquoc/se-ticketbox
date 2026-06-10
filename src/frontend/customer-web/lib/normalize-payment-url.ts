import { getBackendApiUrl } from '@/lib/backend-url';

/**
 * Older builds pointed mock payment at the Next.js app (port 3001) with path
 * `/payment/mock-page`. The gateway actually lives on the NestJS backend.
 */
export function normalizeMockPaymentUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const backendBase = new URL(getBackendApiUrl());

    if (parsed.pathname === '/payment/mock-page') {
      parsed.pathname = '/payments/mock-page';
    }

    if (parsed.pathname === '/payments/mock-page') {
      parsed.protocol = backendBase.protocol;
      parsed.hostname = backendBase.hostname;
      parsed.port = backendBase.port;
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
