import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import { getBackendErrorMessage } from '@/lib/fetch-concerts';
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
    const data = await backendFetch<TicketTypeListResponse>(
      `/concerts/${concertId}/ticket-types`,
    );
    return NextResponse.json({ success: true, source: 'backend', data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        source: 'backend',
        message: getBackendErrorMessage(error),
        data: { data: [], total: 0 },
      },
      { status: 502 },
    );
  }
}
