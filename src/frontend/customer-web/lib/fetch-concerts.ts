import { backendFetch } from '@/lib/api/backend-fetch';
import type { Concert, ConcertListResponse, ConcertStatus } from '@/types/concert';

const LIST_STATUSES: ConcertStatus[] = ['SALE_OPEN', 'PUBLISHED', 'COMPLETED'];

export async function fetchConcertsFromBackend(): Promise<Concert[]> {
  const responses = await Promise.allSettled(
    LIST_STATUSES.map((status) =>
      backendFetch<ConcertListResponse>(`/concerts?status=${status}&limit=50`),
    ),
  );

  const merged = new Map<string, Concert>();
  for (const result of responses) {
    if (result.status === 'fulfilled') {
      for (const concert of result.value.data) {
        merged.set(concert.id, concert);
      }
    }
  }

  if (merged.size === 0) {
    const errors = responses
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);

    if (errors.length === LIST_STATUSES.length) {
      const message =
        errors[0] instanceof Error
          ? errors[0].message
          : 'Không kết nối được Backend API';
      throw new Error(message);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export async function fetchConcertByIdFromBackend(concertId: string): Promise<Concert | null> {
  try {
    return await backendFetch<Concert>(`/concerts/${concertId}`);
  } catch {
    const concerts = await fetchConcertsFromBackend();
    return concerts.find((concert) => concert.id === concertId) ?? null;
  }
}

export function getBackendErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Không kết nối được Backend API';
}
