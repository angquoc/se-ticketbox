/**
 * Backend URL exposed to browser code (WebSocket, etc.).
 * Server routes should keep using getBackendApiUrl() from backend-url.ts.
 */
export function getPublicBackendApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001'
  );
}
