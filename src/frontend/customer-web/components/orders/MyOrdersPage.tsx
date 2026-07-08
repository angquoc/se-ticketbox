'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import { useAuth } from '@/hooks/useAuth';
import { orderApi } from '@/lib/api-client';
import { resolveFrontendConcertId } from '@/lib/concert-backend-mapping';
import { formatOrderItemsSummary, totalTicketQuantity } from '@/lib/order-items';
import { formatReservationCountdown, isReservationExpired } from '@/lib/order-expiry';
import { formatVnd } from '@/lib/format';
import {
  canRepurchaseOrder,
  orderStatusBadgeClass,
  orderStatusLabel,
} from '@/lib/order-status';
import type { Order, OrderStatus } from '@/types/order';

const STATUS_FILTERS: Array<{ value: OrderStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'PAYMENT_FAILED', label: 'Thanh toán thất bại' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPaymentHref(order: Order): string {
  const frontendConcertId = resolveFrontendConcertId(order.concertId);
  const base = `/orders/${order.id}/payment`;
  const params = new URLSearchParams();
  if (frontendConcertId) params.set('concertId', frontendConcertId);
  if (order.paymentUrl) params.set('paymentUrl', order.paymentUrl);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function buildRepurchaseHref(order: Order): string | null {
  const frontendConcertId = resolveFrontendConcertId(order.concertId);
  return frontendConcertId ? `/concerts/${frontendConcertId}/seats` : null;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setCountdownTick] = useState(0);
  const expiredRefetchRef = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(
    async (targetPage: number, status: OrderStatus | 'ALL') => {
      setLoading(true);
      setError(null);

      try {
        const result = await orderApi.listMine({
          page: targetPage,
          limit: 10,
          status: status === 'ALL' ? undefined : status,
        });
        setOrders(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages ?? 1);
        setPage(result.page ?? targetPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/orders')}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      expiredRefetchRef.current.clear();
      void loadOrders(1, statusFilter);
    }
  }, [authLoading, isAuthenticated, statusFilter, loadOrders]);

  useEffect(() => {
    const pendingOrders = orders.filter(
      (order) => order.status === 'PENDING_PAYMENT' && order.expiresAt,
    );
    if (pendingOrders.length === 0) return;

    const timer = setInterval(() => {
      setCountdownTick((tick) => tick + 1);

      const newlyExpired = pendingOrders.filter(
        (order) =>
          isReservationExpired(order.expiresAt) &&
          !expiredRefetchRef.current.has(order.id),
      );

      if (newlyExpired.length > 0) {
        newlyExpired.forEach((order) => expiredRefetchRef.current.add(order.id));
        void loadOrders(page, statusFilter);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [orders, page, statusFilter, loadOrders]);

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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Đơn hàng của tôi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi trạng thái đơn hàng, tiếp tục thanh toán hoặc xem vé điện tử.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => void loadOrders(page, statusFilter)}
              className="mt-3 block w-full font-medium text-red-900 underline"
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-900">Chưa có đơn hàng</p>
            <p className="mt-2 text-sm text-slate-600">
              {statusFilter === 'ALL'
                ? 'Bạn chưa đặt vé nào. Hãy khám phá các sự kiện đang mở bán.'
                : `Không có đơn hàng ở trạng thái "${orderStatusLabel(statusFilter as OrderStatus)}".`}
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Xem sự kiện
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => {
              const repurchaseHref = buildRepurchaseHref(order);
              const ticketQty = totalTicketQuantity(order.items);

              return (
                <li
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-slate-900">{order.concertTitle}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatOrderItemsSummary(order.items)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{order.id}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(order.status)}`}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Tổng tiền</dt>
                      <dd className="font-semibold text-indigo-600">
                        {formatVnd(order.totalAmountInVnd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ngày đặt</dt>
                      <dd className="text-slate-900">{formatOrderDate(order.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Số lượng vé</dt>
                      <dd className="text-slate-900">
                        {order.status === 'PAID' ? order.ticketCount : ticketQty}
                      </dd>
                    </div>
                    {order.status === 'PENDING_PAYMENT' && order.expiresAt && (
                      <div>
                        <dt className="text-slate-500">Giữ vé còn lại</dt>
                        <dd className="font-mono font-semibold text-amber-700">
                          {formatReservationCountdown(order.expiresAt)}
                        </dd>
                      </div>
                    )}
                    {order.status === 'PAID' && order.paidAt && (
                      <div>
                        <dt className="text-slate-500">Thanh toán lúc</dt>
                        <dd className="text-slate-900">{formatOrderDate(order.paidAt)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Chi tiết
                    </Link>
                    {order.status === 'PENDING_PAYMENT' && (
                      <Link
                        href={buildPaymentHref(order)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Thanh toán
                      </Link>
                    )}
                    {order.status === 'PAID' && (
                      <Link
                        href={`/orders/${order.id}/tickets`}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Xem vé QR
                      </Link>
                    )}
                    {canRepurchaseOrder(order.status) && repurchaseHref && (
                      <Link
                        href={repurchaseHref}
                        className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        Mua lại
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void loadOrders(page - 1, statusFilter)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Trang trước
            </button>
            <span className="text-sm text-slate-600">
              Trang {page} / {totalPages} · {total} đơn
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void loadOrders(page + 1, statusFilter)}
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
