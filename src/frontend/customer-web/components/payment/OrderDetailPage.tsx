'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { orderApi } from '@/lib/api-client';
import { resolveFrontendConcertId } from '@/lib/concert-backend-mapping';
import { getConcertName } from '@/lib/concert-names';
import { formatReservationCountdown } from '@/lib/order-expiry';
import { formatVnd } from '@/lib/format';
import { orderStatusLabel } from '@/lib/order-status';
import type { Order } from '@/types/order';

interface OrderDetailPageProps {
  orderId: string;
}

export default function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concertIdParam = searchParams.get('concertId') ?? '';
  const justPaid = searchParams.get('paid') === '1';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [countdown, setCountdown] = useState('--:--');

  const frontendConcertId =
    concertIdParam || (order ? resolveFrontendConcertId(order.concertId) : null) || '';
  const concertName = frontendConcertId
    ? getConcertName(frontendConcertId)
    : order?.concertTitle;

  useEffect(() => {
    void orderApi
      .getById(orderId)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Lỗi tải đơn'))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== 'PENDING_PAYMENT') return;

    const update = () => setCountdown(formatReservationCountdown(order.expiresAt));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [order]);

  async function handleCancel() {
    if (!order || order.status !== 'PENDING_PAYMENT') return;
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này? Vé đã giữ sẽ được hoàn lại.')) {
      return;
    }

    setCancelling(true);
    try {
      const cancelled = await orderApi.cancel(orderId);
      setOrder(cancelled);
      if (frontendConcertId) {
        router.replace(`/concerts/${frontendConcertId}/seats`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể hủy đơn');
    } finally {
      setCancelling(false);
    }
  }

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
          <Link href="/orders" className="mt-4 inline-block text-indigo-600 hover:underline">
            Xem đơn hàng
          </Link>
        </main>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';
  const isPending = order.status === 'PENDING_PAYMENT';
  const paymentHref = (() => {
    const base = `/orders/${orderId}/payment`;
    const params = new URLSearchParams();
    if (frontendConcertId) params.set('concertId', frontendConcertId);
    if (order.paymentUrl) params.set('paymentUrl', order.paymentUrl);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  })();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={order.concertTitle} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div
          className={`rounded-xl border p-6 ${
            isPaid ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
          }`}
        >
          <h1 className="text-2xl font-bold text-slate-900">
            {isPaid ? 'Thanh toán thành công!' : 'Chi tiết đơn hàng'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {order.concertTitle} · {orderStatusLabel(order.status)}
          </p>
          {isPaid && (
            <p className="mt-3 text-sm text-emerald-800">
              {justPaid
                ? 'Thanh toán đã được xác nhận. Vé điện tử đã sẵn sàng — xem mã QR bên dưới hoặc kiểm tra email xác nhận.'
                : 'Vé điện tử đã sẵn sàng. Xem mã QR bên dưới hoặc kiểm tra email xác nhận.'}
            </p>
          )}
          {isPending && order.expiresAt && (
            <p className="mt-3 text-sm text-amber-800">
              Vé đang được giữ. Thời gian còn lại:{' '}
              <span className="font-mono font-semibold">{countdown}</span>
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
            {order.cancelledAt && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Thời gian hủy</dt>
                <dd className="text-slate-900">
                  {new Date(order.cancelledAt).toLocaleString('vi-VN')}
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
            href="/orders"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Tất cả đơn hàng
          </Link>
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
          {isPending && (
            <>
              <Link
                href={paymentHref}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Tiếp tục thanh toán
              </Link>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
