import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { getSeatAvailability } from '@/lib/seat-layout';
import { getMockSeatMap } from '@/lib/mock-seatmap';
import { buildSeatMapFromBackend } from '@/lib/seatmap-builder';
import type { TicketTypeAvailability } from '@/types/order';

interface TicketTypeListResponse {
  data: TicketTypeAvailability[];
  total: number;
}

interface SeatAvailabilityRequest {
  seatNumbers?: string[];
}

async function resolveSeatMap(concertId: string) {
  const concert = await fetchConcertByIdFromBackend(concertId);
  if (!concert) {
    throw new Error('Không tìm thấy concert trên backend');
  }

  const ticketTypesResponse = await backendFetch<TicketTypeListResponse>(
    `/concerts/${concertId}/ticket-types`,
  );

  const backendSeatMap = await buildSeatMapFromBackend({
    concertId: concert.id,
    concertName: concert.title,
    concertSlug: concert.slug,
    seatMapUrl: concert.seatMapUrl,
    ticketTypes: ticketTypesResponse.data,
  });

  if (backendSeatMap) {
    return backendSeatMap;
  }

  return getMockSeatMap(concert.id, {
    concertSlug: concert.slug,
    concertName: concert.title,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;

  let body: SeatAvailabilityRequest;
  try {
    body = (await request.json()) as SeatAvailabilityRequest;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Payload không hợp lệ' },
      { status: 400 },
    );
  }

  const seatNumbers = body.seatNumbers?.filter(Boolean) ?? [];
  if (seatNumbers.length === 0) {
    return NextResponse.json(
      { success: false, message: 'seatNumbers là bắt buộc' },
      { status: 400 },
    );
  }

  if (seatNumbers.length > 200) {
    return NextResponse.json(
      { success: false, message: 'Tối đa 200 ghế mỗi lần truy vấn' },
      { status: 400 },
    );
  }

  try {
    const seatMap = await resolveSeatMap(concertId);
    const availability = getSeatAvailability(seatMap.seats, seatNumbers);

    return NextResponse.json({
      success: true,
      data: {
        availability,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: getBackendErrorMessage(error),
      },
      { status: 502 },
    );
  }
}
