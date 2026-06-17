import { Suspense } from 'react';
import CustomerHeader from '@/components/layout/CustomerHeader';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-600">
          Đăng nhập để tiếp tục mua vé và thanh toán
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
