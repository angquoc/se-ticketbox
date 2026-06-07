'use client';

import type { Seat } from '@/types/seatmap';
import { formatVnd } from '@/lib/format';

interface SeatTooltipProps {
  seat: Seat;
  price: number;
  regionName: string;
  x: number;
  y: number;
}

export default function SeatTooltip({ seat, price, regionName, x, y }: SeatTooltipProps) {
  const statusLabel =
    seat.status === 'AVAILABLE'
      ? 'Còn trống'
      : seat.status === 'RESERVED'
        ? 'Đang giữ chỗ'
        : 'Đã bán';

  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <p className="font-semibold text-slate-900">{seat.seatNumber}</p>
      <p className="text-slate-600">Khu vực: {regionName}</p>
      <p className="text-slate-600">
        Hàng {seat.row}, Ghế {seat.column}
      </p>
      <p className="text-slate-600">Giá: {formatVnd(price)}</p>
      <p className="mt-1 text-slate-500">{statusLabel}</p>
    </div>
  );
}
