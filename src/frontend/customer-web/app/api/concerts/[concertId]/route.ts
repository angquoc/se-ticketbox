import { NextResponse } from 'next/server';
import { fetchConcertByIdFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { getMockConcertDetail } from '@/lib/mock-concerts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ concertId: string }> },
) {
  const { concertId } = await params;

  try {
    const concert = await fetchConcertByIdFromBackend(concertId);
    if (!concert) {
      const mock = getMockConcertDetail(concertId);
      if (mock) {
        return NextResponse.json({
          success: true,
          source: 'mock',
          backendError: `Không tìm thấy concert "${concertId}" trên backend. Đang dùng dữ liệu demo.`,
          data: mock,
        });
      }

      return NextResponse.json(
        { success: false, message: 'Không tìm thấy sự kiện' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, source: 'backend', data: concert });
  } catch (error) {
    const mock = getMockConcertDetail(concertId);
    if (mock) {
      return NextResponse.json({
        success: true,
        source: 'mock',
        backendError: getBackendErrorMessage(error),
        data: mock,
      });
    }

    return NextResponse.json(
      { success: false, message: getBackendErrorMessage(error) },
      { status: 502 },
    );
  }
}
