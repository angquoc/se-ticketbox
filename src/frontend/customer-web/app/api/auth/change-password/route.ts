import { NextResponse } from 'next/server';
import { getBearerToken } from '@/lib/api/get-bearer-token';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { ChangePasswordResponse } from '@/types/auth';

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = await backendFetch<ChangePasswordResponse>('/auth/change-password', {
      method: 'POST',
      token,
      body,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đổi mật khẩu thất bại';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
