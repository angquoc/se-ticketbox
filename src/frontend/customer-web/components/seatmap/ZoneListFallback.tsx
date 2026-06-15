'use client';

import type { TicketType, Zone } from '@/types/seatmap';
import { getZoneFillColor } from '@/lib/seat-colors';
import { formatVnd } from '@/lib/format';
import clsx from 'clsx';

interface ZoneListFallbackProps {
  zones: Array<{ ticketType: TicketType; zone: Zone }>;
  isZoneSelected: (ticketTypeId: string, zoneId: string) => boolean;
  onSelectZone: (ticketTypeId: string, zoneId: string) => void;
  onRetry: () => void;
}

function statusBadge(status: Zone['status']): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Còn trống';
    case 'RESERVED':
      return 'Gần hết';
    case 'SOLD_OUT':
      return 'Hết vé';
    default:
      return status;
  }
}

export default function ZoneListFallback({
  zones,
  isZoneSelected,
  onSelectZone,
  onRetry,
}: ZoneListFallbackProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3 text-sm text-amber-800">
        Bản đồ SVG đang tải chậm. Bạn có thể chọn khu vực bằng danh sách bên dưới.
      </p>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-white p-4">
        {zones.map(({ ticketType, zone }) => {
          const selected = isZoneSelected(ticketType.id, zone.zoneId);
          const clickable = zone.status !== 'SOLD_OUT' || selected;

          return (
            <button
              key={`${ticketType.id}:${zone.zoneId}`}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectZone(ticketType.id, zone.zoneId)}
              className={clsx(
                'mb-2 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white',
                clickable ? 'hover:border-indigo-300' : 'cursor-not-allowed opacity-60',
              )}
            >
              <div>
                <p className="font-semibold text-slate-900">{zone.zoneName}</p>
                <p className="text-slate-600">
                  {ticketType.name} · {formatVnd(ticketType.price)}
                </p>
                <p className="text-xs text-slate-500">Còn {zone.availableCount} vé</p>
              </div>
              <span
                className="rounded-full px-2 py-1 text-xs font-medium text-white"
                style={{
                  backgroundColor: getZoneFillColor(zone.status, selected, false),
                }}
              >
                {statusBadge(zone.status)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        Tải lại sơ đồ
      </button>
    </div>
  );
}
