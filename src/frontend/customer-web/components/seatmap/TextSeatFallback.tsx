'use client';

import type { Seat, SeatMapData } from '@/types/seatmap';
import { getSeatFillColor } from '@/lib/seat-colors';
import clsx from 'clsx';

interface TextSeatFallbackProps {
  data: SeatMapData;
  seats: Seat[];
  isSelected: (seatNumber: string) => boolean;
  onToggleSeat: (seat: Seat) => void;
  onRetry: () => void;
}

export default function TextSeatFallback({
  data,
  seats,
  isSelected,
  onToggleSeat,
  onRetry,
}: TextSeatFallbackProps) {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const key = `${seat.regionId}-${seat.row}`;
    const list = rows.get(key) ?? [];
    list.push(seat);
    rows.set(key, list);
  }

  const sortedRows = Array.from(rows.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-3 text-sm text-amber-800">
        Bản đồ SVG đang tải chậm. Bạn có thể chọn ghế bằng danh sách bên dưới.
      </p>

      <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg bg-white p-4">
        {sortedRows.map(([key, rowSeats]) => {
          const sorted = [...rowSeats].sort((a, b) => a.column - b.column);
          const regionName =
            data.ticketTypes
              .flatMap((tt) => tt.seatRegions)
              .find((r) => r.regionId === sorted[0]?.regionId)?.regionName ?? '';

          return (
            <div key={key}>
              <p className="mb-2 text-xs font-medium text-slate-500">
                {regionName} — Hàng {sorted[0]?.row}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sorted.map((seat) => {
                  const selected = isSelected(seat.seatNumber);
                  const clickable = seat.status === 'AVAILABLE' || selected;
                  return (
                    <button
                      key={seat.seatNumber}
                      type="button"
                      disabled={!clickable}
                      onClick={() => onToggleSeat(seat)}
                      className={clsx(
                        'h-8 min-w-[2rem] rounded px-1 text-xs font-medium text-white transition-transform',
                        clickable && 'hover:scale-105',
                        !clickable && 'cursor-not-allowed opacity-60',
                      )}
                      style={{
                        backgroundColor: getSeatFillColor(seat.status, selected, false),
                      }}
                      title={seat.seatNumber}
                    >
                      {seat.column}
                    </button>
                  );
                })}
              </div>
            </div>
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
