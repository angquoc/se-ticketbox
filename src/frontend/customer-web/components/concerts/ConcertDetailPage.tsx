'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerHeader from '@/components/layout/CustomerHeader';
import BackendNotice from '@/components/ui/BackendNotice';
import { cacheConcertName } from '@/lib/concert-names';
import {
  canViewSeatmap,
  concertStatusBadgeClass,
  concertStatusLabel,
  formatConcertDateTime,
  getSaleWindowInfo,
} from '@/lib/concert-display';
import { formatVnd } from '@/lib/format';
import type { Concert } from '@/types/concert';
import type { TicketTypeAvailability } from '@/types/order';

interface ConcertDetailPageProps {
  concertId: string;
}

interface ConcertApiResponse {
  success: boolean;
  source?: 'backend' | 'mock';
  backendError?: string;
  data?: Concert;
  message?: string;
}

interface TicketTypesApiResponse {
  success: boolean;
  source?: 'backend' | 'mock';
  backendError?: string;
  data?: { data: TicketTypeAvailability[]; total: number };
  message?: string;
}

function ticketTypeStatusLabel(status: TicketTypeAvailability['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang bán';
    case 'SOLD_OUT':
      return 'Hết vé';
    case 'INACTIVE':
      return 'Ngừng bán';
    default:
      return status;
  }
}

export default function ConcertDetailPage({ concertId }: ConcertDetailPageProps) {
  const [concert, setConcert] = useState<Concert | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'mock' | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setBackendError(null);

      try {
        const [concertRes, ticketTypesRes] = await Promise.all([
          fetch(`/api/concerts/${concertId}`),
          fetch(`/api/concerts/${concertId}/ticket-types`),
        ]);

        const concertJson = (await concertRes.json()) as ConcertApiResponse;
        const ticketTypesJson = (await ticketTypesRes.json()) as TicketTypesApiResponse;

        if (cancelled) return;

        if (!concertRes.ok || !concertJson.success || !concertJson.data) {
          throw new Error(concertJson.message ?? 'Không tải được thông tin sự kiện');
        }

        setConcert(concertJson.data);
        setSource(concertJson.source ?? null);
        setBackendError(concertJson.backendError ?? ticketTypesJson.backendError ?? null);
        cacheConcertName(concertJson.data.id, concertJson.data.title);

        if (ticketTypesJson.success && ticketTypesJson.data?.data?.length) {
          setTicketTypes(ticketTypesJson.data.data);
        } else if (concertJson.data.ticketTypes?.length) {
          setTicketTypes(
            concertJson.data.ticketTypes.map((tt) => ({
              id: tt.id,
              concertId: concertJson.data!.id,
              name: tt.name,
              price: tt.price,
              totalQty: tt.totalQty,
              soldQty: tt.soldQty,
              reservedQty: tt.reservedQty,
              availableQty:
                tt.availableQty ??
                Math.max(0, tt.totalQty - tt.soldQty - tt.reservedQty),
              maxPerUser: tt.maxPerUser ?? 4,
              saleStartsAt: tt.saleStartsAt,
              saleEndsAt: tt.saleEndsAt,
              status: tt.status,
            })),
          );
        } else {
          setTicketTypes([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được thông tin sự kiện');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [concertId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-slate-600">Đang tải thông tin sự kiện...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error ?? 'Không tìm thấy sự kiện'}</p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              ← Quay lại danh sách
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const saleInfo = getSaleWindowInfo(concert.status, concert.saleStartsAt, concert.saleEndsAt);
  const totalAvailable = ticketTypes.reduce((sum, tt) => sum + tt.availableQty, 0);
  const showSeatmapLink = canViewSeatmap(concert.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader concertName={concert.title} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Danh sách sự kiện
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {concert.coverImageUrl ? (
            <div className="aspect-[21/9] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={concert.coverImageUrl}
                alt={concert.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[21/9] items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700">
              <span className="px-6 text-center text-2xl font-bold text-white sm:text-3xl">
                {concert.title}
              </span>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{concert.title}</h1>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${concertStatusBadgeClass(concert.status)}`}
              >
                {concertStatusLabel(concert.status)}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Địa điểm
                </dt>
                <dd className="mt-1 text-slate-900">{concert.venue}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Thời gian diễn
                </dt>
                <dd className="mt-1 text-slate-900">{formatConcertDateTime(concert.startsAt)}</dd>
              </div>
              {concert.organizerName && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ban tổ chức
                  </dt>
                  <dd className="mt-1 text-slate-900">{concert.organizerName}</dd>
                </div>
              )}
              {concert.saleStartsAt && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Thời gian mở bán
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {formatConcertDateTime(concert.saleStartsAt)}
                    {concert.saleEndsAt && (
                      <> — {formatConcertDateTime(concert.saleEndsAt)}</>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6">
              <BackendNotice backendError={backendError} source={source} />
            </div>

            {concert.description && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Giới thiệu</h2>
                <p className="mt-2 whitespace-pre-line text-slate-700">{concert.description}</p>
              </section>
            )}

            {concert.artistBio && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Về nghệ sĩ</h2>
                <p className="mt-2 whitespace-pre-line text-slate-700">{concert.artistBio}</p>
              </section>
            )}

            <section className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">Loại vé</h2>
                {ticketTypes.length > 0 && (
                  <p className="text-sm text-slate-600">
                    Còn <span className="font-semibold text-slate-900">{totalAvailable}</span> vé
                  </p>
                )}
              </div>

              {ticketTypes.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  Chưa có loại vé nào được công bố cho sự kiện này.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {ticketTypes.map((tt) => (
                    <li
                      key={tt.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{tt.name}</p>
                        <p className="text-sm text-slate-600">
                          {formatVnd(tt.price)}/vé · Tối đa {tt.maxPerUser} vé/người
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          Còn {tt.availableQty} vé
                        </p>
                        <p className="text-xs text-slate-500">
                          {ticketTypeStatusLabel(tt.status)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-8">
              {saleInfo.isOpen ? (
                <Link
                  href={`/concerts/${concertId}/seats`}
                  className="inline-flex rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Mua vé ngay
                </Link>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {saleInfo.reason ?? 'Hiện không thể mua vé'}
                </div>
              )}

              {showSeatmapLink && (
                <Link
                  href={`/concerts/${concertId}/seats`}
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Xem sơ đồ ghế
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
