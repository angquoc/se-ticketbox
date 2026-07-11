import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await backendFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Khôi phục mật khẩu thất bại';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
