'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api-client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authApi.forgotPassword(email);
      setMessage(response.message || 'Mật khẩu mới đã được gửi về email của bạn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yêu cầu khôi phục mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Nhập Email tài khoản của bạn
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
      >
        {submitting ? 'Đang gửi yêu cầu...' : 'Gửi mật khẩu mới'}
      </button>

      <p className="text-center text-sm text-slate-600">
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Quay lại Đăng nhập
        </Link>
      </p>
    </form>
  );
}
