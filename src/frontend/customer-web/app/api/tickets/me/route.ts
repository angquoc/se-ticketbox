import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend } from '@/lib/fetch-concerts';
import { mapMyTicketsToList } from '@/lib/map-my-tickets';
import type { BackendTicketListResponse } from '@/types/ticket';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(request: Request) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';
  const query = `?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;

  try {
    const raw = await backendFetch<BackendTicketListResponse>(`/tickets/me${query}`, {
      method: 'GET',
      token,
    });

    const concertIds = [...new Set(raw.data.map((ticket) => ticket.concertId))];
    const concertEntries = await Promise.all(
      concertIds.map(async (concertId) => {
        const concert = await fetchConcertByIdFromBackend(concertId);
        return [concertId, concert] as const;
      }),
    );

    const concertsById = new Map(
      concertEntries
        .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null)
        .map(([concertId, concert]) => [
          concertId,
          { title: concert.title, venue: concert.venue, startsAt: concert.startsAt },
        ]),
    );

    const data = mapMyTicketsToList(raw, concertsById);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được vé điện tử';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
