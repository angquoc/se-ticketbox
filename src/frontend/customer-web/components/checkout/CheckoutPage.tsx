'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import PendingOrderBanner from '@/components/payment/PendingOrderBanner';
import TokenExpiryBanner from '@/components/waiting-room/TokenExpiryBanner';
import { useAuth } from '@/hooks/useAuth';
import { usePurchaseAccess } from '@/hooks/usePurchaseAccess';
import { concertApi } from '@/lib/api-client';
import { getCheckoutErrorMessage, isWaitingRoomOrderError } from '@/lib/api-error';
import { createOrderWithIdempotencyRetry } from '@/lib/create-order-retry';
import {
  clearCheckoutIdempotencyKey,
  getCheckoutIdempotencyKey,
} from '@/lib/idempotency';
import {
  clearWaitingRoomData,
  readAdmittedToken,
} from '@/lib/waiting-room-storage';
import {
  clearPendingOrder,
  clearZoneSelection,
  readZoneSelection,
  savePendingOrder,
} from '@/lib/checkout-storage';
import {
  mapZoneSelectionToOrderItems,
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
  const checkoutLockRef = useRef(false);

  const { accessChecked, accessError, tokenRemainingMs, redirectToWaiting } = usePurchaseAccess({
    concertId,
  });

  const selection = useMemo(() => readZoneSelection(concertId), [concertId]);
  const concertName = getConcertName(concertId);
  const totalPrice = selection ? selection.unitPrice * selection.quantity : 0;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(`/concerts/${concertId}/checkout`)}`);
    }
  }, [authLoading, isAuthenticated, concertId, router]);

  useEffect(() => {
    if (!selection) {
      router.replace(`/concerts/${concertId}/seats`);
    }
  }, [selection, concertId, router]);

  useEffect(() => {
    getCheckoutIdempotencyKey(concertId);
  }, [concertId]);

  async function handleCheckout(button?: HTMLButtonElement) {
    if (!selection || checkoutLockRef.current) return;

    const waitingRoomToken = readAdmittedToken(concertId);
    if (!waitingRoomToken) {
      redirectToWaiting();
      return;
    }

    checkoutLockRef.current = true;
    if (button) button.disabled = true;

    const idempotencyKey = getCheckoutIdempotencyKey(concertId);
    setStep('processing');
    setError(null);

    try {
      const backendConcertId = resolveBackendConcertId(concertId);
      const ticketTypesResponse = await concertApi.getTicketTypes(concertId);
      const items = mapZoneSelectionToOrderItems(selection, ticketTypesResponse.data);

      const orderResponse = await createOrderWithIdempotencyRetry(
        {
          concertId: backendConcertId,
          items,
        },
        idempotencyKey,
        waitingRoomToken,
      );

      const paymentUrl =
        orderResponse.paymentUrl ?? orderResponse.order.paymentUrl ?? null;
      if (!paymentUrl) {
        throw new Error('Không nhận được payment URL từ hệ thống');
      }

      clearCheckoutIdempotencyKey(concertId);
      clearZoneSelection(concertId);
      clearWaitingRoomData(concertId);
      savePendingOrder(concertId, orderResponse.order.id);
      setOrder(orderResponse.order);

      router.push(
        `/orders/${orderResponse.order.id}/payment?concertId=${encodeURIComponent(concertId)}&paymentUrl=${encodeURIComponent(paymentUrl)}`,
      );
    } catch (err) {
      checkoutLockRef.current = false;
      if (button) button.disabled = false;

      if (isWaitingRoomOrderError(err)) {
        clearWaitingRoomData(concertId);
        redirectToWaiting();
        return;
      }

      setStep('error');
      setError(getCheckoutErrorMessage(err));
    }
  }

  const isCheckoutLocked = step === 'processing';

  if (authLoading || !selection || !accessChecked) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader concertName={concertName} />
        <main className="flex flex-1 items-center justify-center p-4">
          {accessError ? (
            <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-700">{accessError}</p>
            </div>
          ) : (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          )}
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

        <div className="mt-4">
          <PendingOrderBanner concertId={concertId} />
        </div>

        <div className="mt-4">
          <TokenExpiryBanner remainingMs={tokenRemainingMs} />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Vé đã chọn
          </h2>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center justify-between text-sm text-slate-700">
              <span>
                {selection.ticketTypeName} · {selection.zoneName} · {selection.quantity} vé
              </span>
              <span className="font-medium">{formatVnd(totalPrice)}</span>
            </li>
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
            aria-disabled={isCheckoutLocked}
            tabIndex={isCheckoutLocked ? -1 : undefined}
            className={`inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
              isCheckoutLocked ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            Quay lại chọn khu vực
          </Link>
          <button
            type="button"
            onClick={(event) => void handleCheckout(event.currentTarget)}
            disabled={isCheckoutLocked}
            aria-busy={isCheckoutLocked}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isCheckoutLocked ? 'Đang xử lý...' : 'Xác nhận và thanh toán'}
          </button>
        </div>

        {order && (
          <p className="mt-3 text-xs text-slate-500">Mã đơn: {order.id}</p>
        )}
      </main>
    </div>
  );
}
