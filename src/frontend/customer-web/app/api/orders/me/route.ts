import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { Order } from '@/types/order';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function GET(request: Request) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = query ? `/orders/me?${query}` : '/orders/me';

  try {
    const data = await backendFetch<OrderListResponse>(path, {
      method: 'GET',
      token,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách đơn hàng';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
