'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { orderApi } from '@/lib/api-client';
import { getConcertName } from '@/lib/concert-names';
import { formatVnd } from '@/lib/format';
import type { Order } from '@/types/order';

interface OrderDetailPageProps {
  orderId: string;
}

function statusLabel(status: Order['status']): string {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PENDING_PAYMENT':
      return 'Chờ thanh toán';
    case 'EXPIRED':
      return 'Hết hạn';
    case 'PAYMENT_FAILED':
      return 'Thanh toán thất bại';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}

export default function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const searchParams = useSearchParams();
  const concertId = searchParams.get('concertId') ?? '';
  const concertName = concertId ? getConcertName(concertId) : undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void orderApi
      .getById(orderId)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Lỗi tải đơn'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader concertName={concertName} />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-700">{error ?? 'Không tìm thấy đơn hàng'}</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            Về trang chủ
          </Link>
        </main>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={order.concertTitle} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div
          className={`rounded-xl border p-6 ${
            isPaid
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <h1 className="text-2xl font-bold text-slate-900">
            {isPaid ? 'Thanh toán thành công!' : 'Chi tiết đơn hàng'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {order.concertTitle} · {statusLabel(order.status)}
          </p>
          {isPaid && (
            <p className="mt-3 text-sm text-emerald-800">
              Vé điện tử đã sẵn sàng. Xem mã QR bên dưới hoặc kiểm tra email xác nhận.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Mã đơn</dt>
              <dd className="font-mono text-slate-900">{order.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tổng tiền</dt>
              <dd className="font-semibold text-indigo-600">
                {formatVnd(order.totalAmountInVnd)}
              </dd>
            </div>
            {order.paidAt && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Thời gian thanh toán</dt>
                <dd className="text-slate-900">
                  {new Date(order.paidAt).toLocaleString('vi-VN')}
                </dd>
              </div>
            )}
            {isPaid && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Số vé</dt>
                <dd className="text-slate-900">{order.ticketCount}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-700">Chi tiết vé</h2>
            <ul className="mt-2 space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-slate-700">
                  <span>
                    {item.ticketTypeName} × {item.quantity}
                  </span>
                  <span>{formatVnd(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Về trang chủ
          </Link>
          {isPaid && (
            <Link
              href={`/orders/${orderId}/tickets`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Xem vé điện tử (QR)
            </Link>
          )}
          {order.status === 'PENDING_PAYMENT' && (
            <Link
              href={`/orders/${orderId}/payment?concertId=${encodeURIComponent(concertId)}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tiếp tục thanh toán
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
