import { NextResponse } from 'next/server';
import { getMockSeatMap } from '@/lib/mock-seatmap';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;
  const data = getMockSeatMap(concertId);

  return NextResponse.json({
    success: true,
    data,
  });
}
