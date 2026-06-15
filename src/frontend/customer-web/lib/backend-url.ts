export function getBackendApiUrl(): string {
  return process.env.BACKEND_API_URL ?? 'http://localhost:3001';
}
