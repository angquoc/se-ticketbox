'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentApi } from '@/lib/api-client';
import type { OrderStatus, PaymentStatusResponse } from '@/types/order';

const TERMINAL_STATUSES: OrderStatus[] = [
  'PAID',
  'EXPIRED',
  'CANCELLED',
  'PAYMENT_FAILED',
  'REFUNDED',
];

interface UsePaymentStatusOptions {
  orderId: string;
  enabled?: boolean;
  pollIntervalMs?: number;
  onTerminal?: (status: PaymentStatusResponse) => void;
}

export function usePaymentStatus({
  orderId,
  enabled = true,
  pollIntervalMs = 3000,
  onTerminal,
}: UsePaymentStatusOptions) {
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;

  const fetchStatus = useCallback(async () => {
    try {
      const data = await paymentApi.getStatus(orderId);
      setStatus(data);
      setError(null);
      if (TERMINAL_STATUSES.includes(data.status)) {
        onTerminalRef.current?.(data);
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được trạng thái');
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const data = await fetchStatus();
      if (cancelled || !data) return;
      if (TERMINAL_STATUSES.includes(data.status) && timer) {
        clearInterval(timer);
      }
    };

    void poll();
    timer = setInterval(() => {
      void poll();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [enabled, fetchStatus, pollIntervalMs]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
}
