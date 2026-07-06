import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { getMockTicketTypes } from '@/lib/mock-concerts';
import type { TicketTypeAvailability } from '@/types/order';

interface TicketTypeListResponse {
  data: TicketTypeAvailability[];
  total: number;
}

function toAvailability(
  concertId: string,
  ticketTypes: ReturnType<typeof getMockTicketTypes>,
): TicketTypeAvailability[] {
  return ticketTypes.map((tt) => ({
    id: tt.id,
    concertId,
    name: tt.name,
    price: tt.price,
    totalQty: tt.totalQty,
    soldQty: tt.soldQty,
    reservedQty: tt.reservedQty,
    availableQty:
      tt.availableQty ?? Math.max(0, tt.totalQty - tt.soldQty - tt.reservedQty),
    maxPerUser: tt.maxPerUser ?? 4,
    saleStartsAt: tt.saleStartsAt,
    saleEndsAt: tt.saleEndsAt,
    status: tt.status,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;

  try {
    const data = await backendFetch<TicketTypeListResponse>(
      `/concerts/${concertId}/ticket-types`,
    );

    if (data.data.length > 0) {
      return NextResponse.json({ success: true, source: 'backend', data });
    }

    const concert = await fetchConcertByIdFromBackend(concertId);
    if (concert?.ticketTypes?.length) {
      return NextResponse.json({
        success: true,
        source: 'backend',
        data: {
          data: toAvailability(concertId, concert.ticketTypes),
          total: concert.ticketTypes.length,
        },
      });
    }

    const mockTypes = getMockTicketTypes(concertId);
    return NextResponse.json({
      success: true,
      source: 'mock',
      backendError: 'Backend trả về danh sách loại vé rỗng. Đang dùng dữ liệu demo.',
      data: { data: toAvailability(concertId, mockTypes), total: mockTypes.length },
    });
  } catch (error) {
    const concert = await fetchConcertByIdFromBackend(concertId).catch(() => null);
    if (concert?.ticketTypes?.length) {
      return NextResponse.json({
        success: true,
        source: 'backend',
        data: {
          data: toAvailability(concertId, concert.ticketTypes),
          total: concert.ticketTypes.length,
        },
      });
    }

    const mockTypes = getMockTicketTypes(concertId);
    return NextResponse.json({
      success: true,
      source: 'mock',
      backendError: getBackendErrorMessage(error),
      data: { data: toAvailability(concertId, mockTypes), total: mockTypes.length },
    });
  }
}
