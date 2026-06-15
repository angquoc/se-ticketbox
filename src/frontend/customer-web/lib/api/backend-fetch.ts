import { getBackendApiUrl } from '@/lib/backend-url';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface BackendFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

export async function backendFetch<T>(
  path: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const url = `${getBackendApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof (parsed as { message: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : typeof parsed === 'object' &&
            parsed !== null &&
            'message' in parsed &&
            Array.isArray((parsed as { message: unknown[] }).message)
          ? (parsed as { message: string[] }).message.join(', ')
          : `Request failed (${response.status})`;

    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
