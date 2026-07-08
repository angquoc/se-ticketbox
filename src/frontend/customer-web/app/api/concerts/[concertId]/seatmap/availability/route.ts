import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { collectZoneAvailabilityUpdates } from '@/lib/seatmap-data';
import { getMockSeatMap } from '@/lib/mock-seatmap';
import { buildSeatMapFromBackend } from '@/lib/seatmap-builder';
import { resolveBackendConcertId } from '@/lib/concert-backend-mapping';
import type { TicketTypeAvailability } from '@/types/order';
import type { ZoneAvailabilityUpdate } from '@/types/seatmap';

interface TicketTypeListResponse {
  data: TicketTypeAvailability[];
  total: number;
}

interface BackendAvailabilityResponse {
  updates: ZoneAvailabilityUpdate[];
}

async function resolveSeatMapFallback(concertId: string) {
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
  const backendConcertId = resolveBackendConcertId(concertId);

  try {
    const backendData = await backendFetch<BackendAvailabilityResponse>(
      `/concerts/${backendConcertId}/seatmap/availability`,
    );

    return NextResponse.json({
      success: true,
      source: 'backend',
      data: backendData,
    });
  } catch (error) {
    try {
      const seatMap = await resolveSeatMapFallback(concertId);
      return NextResponse.json({
        success: true,
        source: 'mock',
        warning: getBackendErrorMessage(error),
        data: {
          updates: collectZoneAvailabilityUpdates(seatMap),
        },
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          success: false,
          message: getBackendErrorMessage(fallbackError),
        },
        { status: 502 },
      );
    }
  }
}
