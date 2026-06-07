'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerHeader from '@/components/layout/CustomerHeader';
import BackendNotice from '@/components/ui/BackendNotice';
import type { ConcertCardData } from '@/types/concert';

interface ConcertsApiResponse {
  success: boolean;
  source?: 'backend' | 'mock';
  backendError?: string;
  data: ConcertCardData[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function statusLabel(status: ConcertCardData['status']): string {
  switch (status) {
    case 'SALE_OPEN':
      return 'Đang mở bán';
    case 'PUBLISHED':
      return 'Sắp mở bán';
    case 'COMPLETED':
      return 'Đã diễn ra';
    case 'SALE_CLOSED':
      return 'Đóng bán';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

function canBuyTickets(status: ConcertCardData['status']): boolean {
  return status === 'SALE_OPEN' || status === 'PUBLISHED';
}

export default function ConcertList() {
  const [concerts, setConcerts] = useState<ConcertCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'backend' | 'mock' | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/concerts');
        const json = (await res.json()) as ConcertsApiResponse;
        if (cancelled) return;

        setConcerts(json.data ?? []);
        setSource(json.source ?? null);
        setBackendError(json.backendError ?? null);
      } catch {
        if (!cancelled) {
          setBackendError('Không tải được danh sách sự kiện');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">Sự kiện nổi bật</h1>
        <p className="mt-2 text-slate-600">
          {source === 'backend'
            ? 'Danh sách từ Backend API (PostgreSQL seed)'
            : 'Chọn sự kiện và bắt đầu chọn ghế'}
        </p>

        <div className="mt-6">
          <BackendNotice backendError={backendError} source={source} />
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : concerts.length === 0 ? (
          <p className="mt-10 text-center text-slate-600">Chưa có sự kiện nào.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {concerts.map((concert) => (
              <article
                key={concert.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{concert.title}</h2>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {statusLabel(concert.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{concert.venue}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDate(concert.startsAt)}</p>
                {canBuyTickets(concert.status) ? (
                  <Link
                    href={`/concerts/${concert.id}/waiting`}
                    className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Mua vé
                  </Link>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Sự kiện không mở bán — có thể xem sơ đồ demo
                  </p>
                )}
                <Link
                  href={`/concerts/${concert.id}/seats`}
                  className="mt-2 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Xem sơ đồ ghế →
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
