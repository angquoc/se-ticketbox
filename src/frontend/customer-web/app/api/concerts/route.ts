import { NextResponse } from 'next/server';
import { fetchConcertsFromBackend, getBackendErrorMessage } from '@/lib/fetch-concerts';
import { MOCK_CONCERTS } from '@/lib/mock-concerts';

export async function GET() {
  try {
    const concerts = await fetchConcertsFromBackend();

    if (concerts.length === 0) {
      return NextResponse.json({
        success: true,
        source: 'mock',
        backendError:
          'Backend trả về danh sách rỗng (chưa có concert PUBLISHED/SALE_OPEN/COMPLETED). Đang hiển thị dữ liệu demo.',
        data: MOCK_CONCERTS,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'backend',
      data: concerts.map((concert) => ({
        id: concert.id,
        title: concert.title,
        venue: concert.venue,
        startsAt: concert.startsAt,
        status: concert.status,
        coverImageUrl: concert.coverImageUrl,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      source: 'mock',
      backendError: getBackendErrorMessage(error),
      data: MOCK_CONCERTS,
    });
  }
}
