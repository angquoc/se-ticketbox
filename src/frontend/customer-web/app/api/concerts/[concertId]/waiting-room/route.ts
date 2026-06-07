import { NextResponse } from 'next/server';
import { getConcertName } from '@/lib/concert-names';
import { joinWaitingRoom, pollWaitingRoom } from '@/lib/mock-waiting-room';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;
  let existingSessionId: string | undefined;

  try {
    const body = (await request.json()) as { sessionId?: string };
    existingSessionId = body.sessionId;
  } catch {
    existingSessionId = undefined;
  }

  const { sessionId, response } = joinWaitingRoom(concertId, existingSessionId);

  return NextResponse.json({
    success: true,
    data: {
      sessionId,
      concertName: getConcertName(concertId),
      ...response,
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;
  const sessionId = new URL(request.url).searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Thiếu sessionId' },
      { status: 400 },
    );
  }

  const status = pollWaitingRoom(sessionId);
  if (!status) {
    return NextResponse.json(
      { success: false, message: 'Phiên chờ không hợp lệ' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      concertId,
      ...status,
    },
  });
}
