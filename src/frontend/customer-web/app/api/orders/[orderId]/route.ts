import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { Order } from '@/types/order';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    const data = await backendFetch<Order>(`/orders/${orderId}`, {
      method: 'GET',
      token,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được đơn hàng';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
