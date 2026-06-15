'use client';

import type { TicketType, Zone } from '@/types/seatmap';
import { formatVnd } from '@/lib/format';

interface ZoneTooltipProps {
  ticketType: TicketType;
  zone: Zone;
  x: number;
  y: number;
}

function statusLabel(status: Zone['status']): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Còn trống';
    case 'RESERVED':
      return 'Đang giữ chỗ';
    case 'SOLD_OUT':
      return 'Đã bán hết';
    default:
      return status;
  }
}

export default function ZoneTooltip({ ticketType, zone, x, y }: ZoneTooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <p className="font-semibold text-slate-900">Khu vực: {zone.zoneName}</p>
      <p className="text-slate-600">Loại vé: {ticketType.name}</p>
      <p className="text-slate-600">Còn lại: {zone.availableCount}</p>
      <p className="text-slate-600">Giá: {formatVnd(ticketType.price)}</p>
      <p className="mt-1 text-slate-500">{statusLabel(zone.status)}</p>
    </div>
  );
}
