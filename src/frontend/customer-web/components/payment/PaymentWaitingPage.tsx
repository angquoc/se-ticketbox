'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { clearPendingOrder } from '@/lib/checkout-storage';
import { getConcertName } from '@/lib/concert-names';
import { formatVnd } from '@/lib/format';
import { orderApi, paymentApi } from '@/lib/api-client';
import { getPaymentIdempotencyKey, clearPaymentIdempotencyKey } from '@/lib/idempotency';
import { orderStatusLabel } from '@/lib/order-status';
import { normalizeMockPaymentUrl } from '@/lib/normalize-payment-url';
import type { Order } from '@/types/order';

interface PaymentWaitingPageProps {
  orderId: string;
}

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) return '--:--';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return '00:00';
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PaymentWaitingPage({ orderId }: PaymentWaitingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concertId = searchParams.get('concertId') ?? '';
  const paymentUrl = searchParams.get('paymentUrl');
  const concertName = concertId ? getConcertName(concertId) : undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState('--:--');
  const [cancelling, setCancelling] = useState(false);
  const [creatingPaymentUrl, setCreatingPaymentUrl] = useState(false);
  const [localPaymentUrl, setLocalPaymentUrl] = useState<string | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const createPaymentLockRef = useRef(false);

  const { status, loading, error, refresh } = usePaymentStatus({
    orderId,
    onTerminal: (result) => {
      if (result.status === 'PAID' && concertId) {
        clearPendingOrder(concertId);
        clearPaymentIdempotencyKey(orderId);
      }
      if (
        (result.status === 'EXPIRED' ||
          result.status === 'PAYMENT_FAILED' ||
          result.status === 'CANCELLED') &&
        concertId
      ) {
        clearPendingOrder(concertId);
        clearPaymentIdempotencyKey(orderId);
      }
    },
  });

  useEffect(() => {
    void orderApi.getById(orderId).then(setOrder).catch(() => undefined);
  }, [orderId]);

  const resolvedPaymentUrl = useMemo(() => {
    const raw =
      localPaymentUrl ??
      paymentUrl ??
      status?.payments.find((payment) => payment.paymentUrl)?.paymentUrl ??
      null;
    return raw ? normalizeMockPaymentUrl(raw) : null;
  }, [localPaymentUrl, paymentUrl, status?.payments]);

  useEffect(() => {
    if (status?.status === 'PAID') {
      router.replace(
        `/orders/${orderId}?concertId=${encodeURIComponent(concertId)}&paid=1`,
      );
    }
  }, [status?.status, orderId, concertId, router]);

  useEffect(() => {
    if (
      hasAutoOpenedRef.current ||
      !resolvedPaymentUrl ||
      (status?.status && status.status !== 'PENDING_PAYMENT')
    ) {
      return;
    }

    hasAutoOpenedRef.current = true;
    window.open(resolvedPaymentUrl, '_blank', 'noopener,noreferrer');
  }, [resolvedPaymentUrl, status?.status]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(order?.expiresAt ?? null));
    }, 1000);
    return () => clearInterval(timer);
  }, [order?.expiresAt]);

  async function handleCreatePaymentUrl(button?: HTMLButtonElement) {
    if (createPaymentLockRef.current) return;

    createPaymentLockRef.current = true;
    if (button) button.disabled = true;

    const idempotencyKey = getPaymentIdempotencyKey(orderId);
    setCreatingPaymentUrl(true);

    try {
      const response = await paymentApi.create(orderId, idempotencyKey);
      setLocalPaymentUrl(response.paymentUrl);
      await refresh();
    } catch (err) {
      createPaymentLockRef.current = false;
      if (button) button.disabled = false;
      alert(err instanceof Error ? err.message : 'Không thể tạo payment URL');
    } finally {
      setCreatingPaymentUrl(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await orderApi.cancel(orderId);
      if (concertId) clearPendingOrder(concertId);
      clearPaymentIdempotencyKey(orderId);
      router.replace(`/concerts/${concertId}/seats`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể hủy đơn');
    } finally {
      setCancelling(false);
    }
  }

  const terminalFailed =
    status?.status === 'EXPIRED' ||
    status?.status === 'PAYMENT_FAILED' ||
    status?.status === 'CANCELLED';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={concertName} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Thanh toán đơn hàng</h1>
        <p className="mt-1 text-slate-600">Mã đơn: {orderId}</p>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Trạng thái</span>
              <span className="font-semibold text-slate-900">
                {loading ? 'Đang tải...' : orderStatusLabel(status?.status ?? 'PENDING_PAYMENT')}
              </span>
            </div>
            {order && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Số tiền</span>
                <span className="font-semibold text-indigo-600">
                  {formatVnd(order.totalAmountInVnd)}
                </span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Thời gian giữ vé còn lại</span>
              <span className="font-mono font-semibold text-amber-700">{countdown}</span>
            </div>
          </div>

          {!terminalFailed && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <h2 className="font-semibold text-indigo-900">Bước tiếp theo</h2>
              <p className="mt-2 text-sm text-indigo-800">
                Cổng thanh toán mock sẽ mở trong tab mới. Chọn kết quả giao dịch, sau đó quay
                lại trang này để hệ thống cập nhật trạng thái.
              </p>
              {resolvedPaymentUrl ? (
                <a
                  href={resolvedPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Mở cổng thanh toán
                </a>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-indigo-700">
                    Chưa có payment URL. Tạo lại liên kết thanh toán hoặc tải lại trạng thái.
                  </p>
                  <button
                    type="button"
                    onClick={(event) => void handleCreatePaymentUrl(event.currentTarget)}
                    disabled={creatingPaymentUrl}
                    aria-busy={creatingPaymentUrl}
                    className="inline-flex rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingPaymentUrl ? 'Đang tạo...' : 'Tạo lại payment URL'}
                  </button>
                </div>
              )}
            </div>
          )}

          {terminalFailed && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              {status?.status === 'EXPIRED' && 'Đơn hàng đã hết hạn giữ vé.'}
              {status?.status === 'PAYMENT_FAILED' && 'Thanh toán thất bại. Vé đã được hoàn lại.'}
              {status?.status === 'CANCELLED' && 'Đơn hàng đã bị hủy.'}
              {concertId && (
                <Link
                  href={`/concerts/${concertId}/seats`}
                  className="mt-3 inline-flex font-medium text-red-900 underline"
                >
                  Quay lại chọn ghế
                </Link>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Kiểm tra lại
            </button>
            {status?.status === 'PENDING_PAYMENT' && (
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
