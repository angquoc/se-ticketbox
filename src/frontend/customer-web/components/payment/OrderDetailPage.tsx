'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { orderApi, paymentApi } from '@/lib/api-client';
import { resolveFrontendConcertId } from '@/lib/concert-backend-mapping';
import { getConcertName } from '@/lib/concert-names';
import { formatReservationCountdown, isReservationExpired } from '@/lib/order-expiry';
import { formatVnd } from '@/lib/format';
import {
  canRepurchaseOrder,
  orderStatusBadgeClass,
  orderStatusDescription,
  orderStatusLabel,
} from '@/lib/order-status';
import {
  getDisplayPayment,
  paymentProviderLabel,
  paymentStatusLabel,
} from '@/lib/payment-status';
import { parseGateIdFromQrPayload } from '@/lib/qr-payload';
import type { Order, PaymentTransaction } from '@/types/order';

interface OrderDetailPageProps {
  orderId: string;
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concertIdParam = searchParams.get('concertId') ?? '';
  const justPaid = searchParams.get('paid') === '1';

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [countdown, setCountdown] = useState('--:--');
  const expiredRefetchRef = useRef(false);

  const frontendConcertId =
    concertIdParam || (order ? resolveFrontendConcertId(order.concertId) : null) || '';
  const concertName = frontendConcertId
    ? getConcertName(frontendConcertId)
    : order?.concertTitle;
  const repurchaseHref = frontendConcertId ? `/concerts/${frontendConcertId}/seats` : null;
  const statusDescription = order ? orderStatusDescription(order.status) : null;

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const [orderData, paymentStatus] = await Promise.all([
          orderApi.getById(orderId),
          paymentApi.getStatus(orderId).catch(() => null),
        ]);

        if (cancelled) return;

        setOrder(orderData);
        setPayment(
          paymentStatus ? getDisplayPayment(paymentStatus.payments) : null,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Lỗi tải đơn');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    expiredRefetchRef.current = false;
    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== 'PENDING_PAYMENT' || !order.expiresAt) return;

    const update = () => {
      setCountdown(formatReservationCountdown(order.expiresAt));

      if (
        isReservationExpired(order.expiresAt) &&
        !expiredRefetchRef.current
      ) {
        expiredRefetchRef.current = true;
        void orderApi
          .getById(orderId)
          .then(setOrder)
          .catch(() => undefined);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [order, orderId]);

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {isPaid ? 'Thanh toán thành công!' : 'Chi tiết đơn hàng'}
            </h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(order.status)}`}
            >
              {orderStatusLabel(order.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{order.concertTitle}</p>
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
          {statusDescription && (
            <p className="mt-3 text-sm text-slate-700">{statusDescription}</p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Thông tin đơn hàng</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Mã đơn</dt>
              <dd className="font-mono text-right text-slate-900">{order.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Ngày đặt</dt>
              <dd className="text-right text-slate-900">{formatOrderDate(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Tổng tiền</dt>
              <dd className="font-semibold text-indigo-600">
                {formatVnd(order.totalAmountInVnd)}
              </dd>
            </div>
            {order.paidAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Thời gian thanh toán</dt>
                <dd className="text-right text-slate-900">{formatOrderDate(order.paidAt)}</dd>
              </div>
            )}
            {order.cancelledAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Thời gian hủy</dt>
                <dd className="text-right text-slate-900">
                  {formatOrderDate(order.cancelledAt)}
                </dd>
              </div>
            )}
            {isPaid && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Số vé</dt>
                <dd className="text-right text-slate-900">{order.ticketCount}</dd>
              </div>
            )}
          </dl>

          {payment && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">Thanh toán</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Cổng thanh toán</dt>
                  <dd className="text-right text-slate-900">
                    {paymentProviderLabel(payment.provider)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Trạng thái giao dịch</dt>
                  <dd className="text-right text-slate-900">
                    {paymentStatusLabel(payment.status)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Số tiền</dt>
                  <dd className="text-right text-slate-900">{formatVnd(payment.amount)}</dd>
                </div>
                {payment.receivedAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">Thời gian ghi nhận</dt>
                    <dd className="text-right text-slate-900">
                      {formatOrderDate(payment.receivedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Chi tiết vé</h3>
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

          {isPaid && order.tickets && order.tickets.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">Vé đã phát hành</h3>
              <ul className="mt-2 space-y-2">
                {order.tickets.map((ticket) => {
                  const gateId = parseGateIdFromQrPayload(ticket.qrPayload);
                  return (
                    <li
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700"
                    >
                      <span>
                        {ticket.ticketTypeName}
                        {gateId ? ` · Cổng ${gateId}` : ''}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{ticket.id}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
          {canRepurchaseOrder(order.status) && repurchaseHref && (
            <Link
              href={repurchaseHref}
              className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Mua lại vé
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
