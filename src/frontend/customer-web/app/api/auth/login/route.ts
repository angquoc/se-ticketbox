import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api/backend-fetch';
import type { AuthResponse } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await backendFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đăng nhập thất bại';
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
