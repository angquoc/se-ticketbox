'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import ETicketCard from '@/components/tickets/ETicketCard';
import { useAuth } from '@/hooks/useAuth';
import { ticketApi } from '@/lib/api-client';
import type { Ticket } from '@/types/ticket';

interface ConcertTicketGroup {
  concertId: string;
  concertTitle: string;
  concertStartsAt: string;
  tickets: Ticket[];
}

function groupTicketsByConcert(tickets: Ticket[]): ConcertTicketGroup[] {
  const groups = new Map<string, ConcertTicketGroup>();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.concertId);
    if (existing) {
      existing.tickets.push(ticket);
      continue;
    }

    groups.set(ticket.concertId, {
      concertId: ticket.concertId,
      concertTitle: ticket.concertTitle,
      concertStartsAt: ticket.concertStartsAt,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.concertStartsAt ? new Date(a.concertStartsAt).getTime() : 0;
    const bTime = b.concertStartsAt ? new Date(b.concertStartsAt).getTime() : 0;
    return bTime - aTime;
  });
}

function formatEventDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => groupTicketsByConcert(tickets), [tickets]);

  const loadTickets = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await ticketApi.getMine({ page: targetPage, limit: 20 });
      setTickets(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages ?? 1);
      setPage(result.page ?? targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được vé điện tử');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/tickets')}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void loadTickets(1);
    }
  }, [authLoading, isAuthenticated, loadTickets]);

  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
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
          <button
            type="button"
            onClick={() => void loadTickets(page)}
            className="mt-4 text-sm font-medium text-indigo-600 hover:underline"
          >
            Thử lại
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Vé của tôi</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total > 0
              ? `Bạn có ${total} vé điện tử. Mỗi vé có mã QR riêng để soát tại cổng.`
              : 'Bạn chưa có vé nào. Hãy khám phá các sự kiện và mua vé.'}
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-900">Chưa có vé điện tử</p>
            <p className="mt-2 text-sm text-slate-600">
              Sau khi thanh toán thành công, vé sẽ xuất hiện tại đây.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Xem sự kiện
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.concertId}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">{group.concertTitle}</h2>
                  {group.concertStartsAt && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      {formatEventDate(group.concertStartsAt)}
                    </p>
                  )}
                </div>

                <div className="space-y-5">
                  {group.tickets.map((ticket, index) => (
                    <div key={ticket.id}>
                      <ETicketCard
                        ticket={ticket}
                        index={index + 1}
                        total={group.tickets.length}
                      />
                      <p className="mt-2 text-right text-xs text-slate-500">
                        <Link
                          href={`/orders/${ticket.orderId}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Xem đơn hàng
                        </Link>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void loadTickets(page - 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Trang trước
            </button>
            <span className="text-sm text-slate-600">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void loadTickets(page + 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
