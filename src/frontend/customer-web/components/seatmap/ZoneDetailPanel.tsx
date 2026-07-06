'use client';

import type { TicketType, Zone } from '@/types/seatmap';
import { zoneAvailabilityBadgeClass, zoneAvailabilityLabel } from '@/lib/zone-availability';
import { formatVnd } from '@/lib/format';

interface ZoneDetailPanelProps {
  ticketType: TicketType;
  zone: Zone;
  quantity: number;
  maxQuantity: number;
  remainingAllowance?: number;
}

export default function ZoneDetailPanel({
  ticketType,
  zone,
  quantity,
  maxQuantity,
  remainingAllowance,
}: ZoneDetailPanelProps) {
  const label = zoneAvailabilityLabel(zone);

  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            Khu vực đã chọn
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{zone.zoneName}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {ticketType.name} · {formatVnd(ticketType.price)}/vé
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${zoneAvailabilityBadgeClass(zone.status)}`}
        >
          {label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-slate-500">Còn lại</dt>
          <dd className="font-semibold text-slate-900">{zone.availableCount} vé</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-slate-500">Đang giữ</dt>
          <dd className="font-semibold text-slate-900">{zone.reservedCount} vé</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-slate-500">Đã bán</dt>
          <dd className="font-semibold text-slate-900">{zone.soldCount} vé</dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-slate-500">Bạn chọn</dt>
          <dd className="font-semibold text-slate-900">
            {quantity} / {maxQuantity}
          </dd>
        </div>
      </dl>

      {remainingAllowance !== undefined && remainingAllowance < ticketType.maxPerUser && (
        <p className="mt-3 text-xs text-slate-600">
          Bạn còn được mua tối đa {remainingAllowance} vé {ticketType.name} cho sự kiện này.
        </p>
      )}
    </div>
  );
}
