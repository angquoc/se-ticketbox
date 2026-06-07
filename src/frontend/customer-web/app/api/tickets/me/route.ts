import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { TicketListResponse } from '@/types/ticket';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(request: Request) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';

  try {
    const data = await backendFetch<TicketListResponse>(`/tickets/me${query}`, {
      method: 'GET',
      token,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được vé điện tử';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
