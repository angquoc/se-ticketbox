'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import ProfileForm from '@/components/auth/ProfileForm';
import { useAuth } from '@/hooks/useAuth';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/account')}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Tài khoản</h1>
        <p className="mt-1 text-sm text-slate-600">
          Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.
        </p>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Hồ sơ cá nhân</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cập nhật tên hiển thị cho tài khoản {user?.email}.
          </p>
          <div className="mt-5">
            <ProfileForm />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Đơn hàng & vé</h2>
          <p className="mt-1 text-sm text-slate-600">
            Xem lịch sử đơn hàng, tiếp tục thanh toán hoặc mở vé điện tử.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/orders"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Đơn hàng của tôi
            </Link>
            <Link
              href="/tickets"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Vé điện tử
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Đổi mật khẩu</h2>
          <p className="mt-1 text-sm text-slate-600">
            Nhập mật khẩu hiện tại để xác nhận trước khi đặt mật khẩu mới.
          </p>
          <div className="mt-5">
            <ChangePasswordForm />
          </div>
        </section>
      </main>
    </div>
  );
}
