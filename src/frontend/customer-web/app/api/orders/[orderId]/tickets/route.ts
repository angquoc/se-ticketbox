import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend } from '@/lib/fetch-concerts';
import { mapOrderTicketsToList } from '@/lib/map-order-tickets';
import type { Order } from '@/types/order';
import type { TicketListResponse } from '@/types/ticket';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    const order = await backendFetch<Order>(`/orders/${orderId}`, {
      method: 'GET',
      token,
    });

    const concert = await fetchConcertByIdFromBackend(order.concertId);
    const data: TicketListResponse = mapOrderTicketsToList(
      order,
      concert
        ? { venue: concert.venue, startsAt: concert.startsAt }
        : null,
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được vé điện tử';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
