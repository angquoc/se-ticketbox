import { NextResponse } from 'next/server';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { backendFetch } from '@/lib/api/backend-fetch';
import { collectZoneAvailabilityUpdates } from '@/lib/seatmap-data';
import { getMockSeatMap } from '@/lib/mock-seatmap';
import { buildSeatMapFromBackend } from '@/lib/seatmap-builder';
import type { TicketTypeAvailability } from '@/types/order';

interface TicketTypeListResponse {
  data: TicketTypeAvailability[];
  total: number;
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;

  try {
    const seatMap = await resolveSeatMap(concertId);

    return NextResponse.json({
      success: true,
      data: {
        updates: collectZoneAvailabilityUpdates(seatMap),
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
