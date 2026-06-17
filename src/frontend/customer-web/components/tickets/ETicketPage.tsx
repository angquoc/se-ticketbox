'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerHeader from '@/components/layout/CustomerHeader';
import ETicketCard from '@/components/tickets/ETicketCard';
import { ticketApi } from '@/lib/api-client';
import type { Ticket } from '@/types/ticket';

interface ETicketPageProps {
  orderId: string;
}

export default function ETicketPage({ orderId }: ETicketPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const concertTitle = tickets[0]?.concertTitle;

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function loadTickets() {
      try {
        const result = await ticketApi.getByOrderId(orderId);
        if (cancelled) return;

        setTickets(result.data);
        setError(null);

        if (result.data.length === 0 && !pollTimer) {
          setPolling(true);
          pollTimer = setInterval(() => {
            void ticketApi
              .getByOrderId(orderId)
              .then((next) => {
                if (cancelled) return;
                setTickets(next.data);
                if (next.data.length > 0) {
                  setPolling(false);
                  if (pollTimer) clearInterval(pollTimer);
                }
              })
              .catch(() => undefined);
          }, 3000);
        } else {
          setPolling(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được vé điện tử');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader concertName={concertTitle} />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-700">{error}</p>
          <Link
            href={`/orders/${orderId}`}
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            Quay lại đơn hàng
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={concertTitle} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Vé điện tử</h1>
          <p className="mt-1 text-sm text-slate-600">
            {tickets.length > 0
              ? `Bạn có ${tickets.length} vé. Mỗi vé có mã QR riêng để soát tại cổng.`
              : 'Vé đang được phát hành sau khi thanh toán thành công.'}
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="font-medium text-amber-900">Đang phát hành vé điện tử…</p>
            <p className="mt-2 text-sm text-amber-800">
              {polling
                ? 'Hệ thống đang tạo mã QR. Trang sẽ tự cập nhật trong giây lát.'
                : 'Vui lòng thử tải lại trang sau vài giây.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {tickets.map((ticket, index) => (
              <ETicketCard
                key={ticket.id}
                ticket={ticket}
                index={index + 1}
                total={tickets.length}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/orders/${orderId}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Chi tiết đơn hàng
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    </div>
  );
}
