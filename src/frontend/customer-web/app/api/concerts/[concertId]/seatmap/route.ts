import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { getMockSeatMap } from '@/lib/mock-seatmap';
import { buildSeatMapFromBackend } from '@/lib/seatmap-builder';
import { getMockConcertName } from '@/lib/mock-concerts';
import type { TicketTypeAvailability } from '@/types/order';

interface TicketTypeListResponse {
  data: TicketTypeAvailability[];
  total: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;

  try {
    const [concert, ticketTypesResponse] = await Promise.all([
      fetchConcertByIdFromBackend(concertId),
      backendFetch<TicketTypeListResponse>(`/concerts/${concertId}/ticket-types`),
    ]);

    if (!concert) {
      throw new Error('Không tìm thấy concert trên backend');
    }

    const backendSeatMap = await buildSeatMapFromBackend({
      concertId: concert.id,
      concertName: concert.title,
      concertSlug: concert.slug,
      seatMapUrl: concert.seatMapUrl,
      ticketTypes: ticketTypesResponse.data,
    });

    if (backendSeatMap) {
      return NextResponse.json({
        success: true,
        source: 'backend',
        data: backendSeatMap,
      });
    }

    const mockData = await getMockSeatMap(concert.id, {
      concertSlug: concert.slug,
      concertName: concert.title,
    });
    return NextResponse.json({
      success: true,
      source: 'mock',
      warning:
        concert.status === 'COMPLETED' || concert.status === 'SALE_CLOSED'
          ? 'Sự kiện không còn mở bán. Đang hiển thị sơ đồ ghế demo để thử nghiệm giao diện.'
          : 'Chưa có loại vé khả dụng trên backend. Đang hiển thị sơ đồ ghế demo.',
      data: mockData,
    });
  } catch (error) {
    const mockData = await getMockSeatMap(concertId, {
      concertName: getMockConcertName(concertId),
    });
    return NextResponse.json({
      success: true,
      source: 'mock',
      backendError: getBackendErrorMessage(error),
      warning: 'Không tải được dữ liệu từ backend. Đang hiển thị sơ đồ ghế demo.',
      data: mockData,
    });
  }
}
