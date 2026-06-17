import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { CreateOrderResponse } from '@/types/order';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function POST(request: Request) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { success: false, message: 'Thiếu header Idempotency-Key' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const data = await backendFetch<CreateOrderResponse>('/orders', {
      method: 'POST',
      token,
      body,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tạo đơn hàng thất bại';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
