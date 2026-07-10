export function getBackendApiUrl(): string {
  return (
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001'
  );
}
