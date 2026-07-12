import { NextResponse } from 'next/server';
import { getBearerToken } from '@/lib/api/get-bearer-token';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { AuthUser } from '@/types/auth';

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ success: false, message: 'Chưa đăng nhập' }, { status: 401 });
  }

  try {
    const data = await backendFetch<AuthUser>('/auth/me', {
      method: 'GET',
      token,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được thông tin tài khoản';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
