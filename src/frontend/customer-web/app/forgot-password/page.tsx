import { Suspense } from 'react';
import CustomerHeader from '@/components/layout/CustomerHeader';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-600">
          Nhập email của bạn để nhận mật khẩu khôi phục tài khoản
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
