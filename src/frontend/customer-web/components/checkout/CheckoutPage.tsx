'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { useAuth } from '@/hooks/useAuth';
import { concertApi, orderApi, paymentApi } from '@/lib/api-client';
import {
  clearCheckoutIdempotencyKey,
  getCheckoutIdempotencyKey,
} from '@/lib/idempotency';
import {
  clearPendingOrder,
  clearSeatSelection,
  readSeatSelection,
  savePendingOrder,
} from '@/lib/checkout-storage';
import {
  groupSeatsByTicketType,
  mapToBackendOrderItems,
  resolveBackendConcertId,
} from '@/lib/concert-backend-mapping';
import { getConcertName } from '@/lib/concert-names';
import { formatVnd } from '@/lib/format';
import type { Order } from '@/types/order';

interface CheckoutPageProps {
  concertId: string;
}

type CheckoutStep = 'review' | 'processing' | 'error';

export default function CheckoutPage({ concertId }: CheckoutPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<CheckoutStep>('review');
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const seats = useMemo(() => readSeatSelection(concertId), [concertId]);
  const concertName = getConcertName(concertId);
  const totalPrice = seats?.reduce((sum, seat) => sum + seat.price, 0) ?? 0;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(`/concerts/${concertId}/checkout`)}`);
    }
  }, [authLoading, isAuthenticated, concertId, router]);

  useEffect(() => {
    if (!seats || seats.length === 0) {
      router.replace(`/concerts/${concertId}/seats`);
    }
  }, [seats, concertId, router]);

  async function handleCheckout() {
    if (!seats || seats.length === 0) return;

    setStep('processing');
    setError(null);

    try {
      const backendConcertId = resolveBackendConcertId(concertId);
      const ticketTypesResponse = await concertApi.getTicketTypes(concertId);
      const grouped = groupSeatsByTicketType(seats);
      const items = mapToBackendOrderItems(grouped, ticketTypesResponse.data);

      const orderResponse = await orderApi.create({
        concertId: backendConcertId,
        items,
      });

      const idempotencyKey = getCheckoutIdempotencyKey(concertId);
      const paymentResponse = await paymentApi.create(orderResponse.order.id, idempotencyKey);

      clearCheckoutIdempotencyKey(concertId);
      clearSeatSelection(concertId);
      savePendingOrder(concertId, orderResponse.order.id);
      setOrder(orderResponse.order);

      router.push(
        `/orders/${orderResponse.order.id}/payment?concertId=${encodeURIComponent(concertId)}&paymentUrl=${encodeURIComponent(paymentResponse.paymentUrl)}`,
      );
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn hàng');
    }
  }

  if (authLoading || !seats?.length) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader concertName={concertName} />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={concertName} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Xác nhận đặt vé</h1>
        <p className="mt-1 text-slate-600">{concertName}</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Ghế đã chọn
          </h2>
          <ul className="mt-3 space-y-2">
            {seats.map((seat) => (
              <li
                key={seat.seatNumber}
                className="flex items-center justify-between text-sm text-slate-700"
              >
                <span>
                  Ghế {seat.seatNumber} · Hàng {seat.row}
                </span>
                <span className="font-medium">{formatVnd(seat.price)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="font-semibold text-slate-900">Tổng cộng</span>
            <span className="text-lg font-bold text-indigo-600">{formatVnd(totalPrice)}</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vé sẽ được giữ trong 15 phút sau khi tạo đơn. Vui lòng hoàn tất thanh toán trước khi
          hết hạn.
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/concerts/${concertId}/seats`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Quay lại chọn ghế
          </Link>
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={step === 'processing'}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {step === 'processing' ? 'Đang xử lý...' : 'Xác nhận và thanh toán'}
          </button>
        </div>

        {order && (
          <p className="mt-3 text-xs text-slate-500">Mã đơn: {order.id}</p>
        )}
      </main>
    </div>
  );
}
