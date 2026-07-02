'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orderApi } from '@/lib/api-client';
import { readPendingOrder, clearPendingOrder } from '@/lib/checkout-storage';
import { formatVnd } from '@/lib/format';
import type { Order } from '@/types/order';

interface PendingOrderBannerProps {
  concertId: string;
}

export default function PendingOrderBanner({ concertId }: PendingOrderBannerProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const pendingOrderId = readPendingOrder(concertId);

    if (!pendingOrderId) {
      setLoading(false);
      return;
    }

    void orderApi
      .getById(pendingOrderId)
      .then((data) => {
        if (cancelled) return;

        if (data.status === 'PENDING_PAYMENT') {
          setOrder(data);
          return;
        }

        clearPendingOrder(concertId);
      })
      .catch(() => {
        if (!cancelled) clearPendingOrder(concertId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [concertId]);

  if (loading || !order) return null;

  const paymentUrl = order.paymentUrl ?? null;
  const paymentHref = paymentUrl
    ? `/orders/${order.id}/payment?concertId=${encodeURIComponent(concertId)}&paymentUrl=${encodeURIComponent(paymentUrl)}`
    : `/orders/${order.id}/payment?concertId=${encodeURIComponent(concertId)}`;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Bạn có đơn hàng đang chờ thanh toán</p>
      <p className="mt-1 text-amber-900">
        Mã đơn {order.id} · {formatVnd(order.totalAmountInVnd)}
        {order.expiresAt && (
          <> · Hết hạn {new Date(order.expiresAt).toLocaleTimeString('vi-VN')}</>
        )}
      </p>
      <Link
        href={paymentHref}
        className="mt-2 inline-flex font-medium text-amber-950 underline hover:text-amber-800"
      >
        Tiếp tục thanh toán
      </Link>
    </div>
  );
}
