'use client';

import type { SeatSelectionState } from '@/types/seatmap';
import { formatVnd } from '@/lib/format';

interface SeatSummaryBarProps {
  selection: SeatSelectionState;
  disabled?: boolean;
  onProceed?: () => void;
}

export default function SeatSummaryBar({
  selection,
  disabled = false,
  onProceed,
}: SeatSummaryBarProps) {
  const count = selection.selectedSeats.length;

  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Đã chọn:{' '}
            <span className="font-semibold text-slate-900">
              {count} ghế{count !== 1 ? '' : ''}
            </span>
          </p>
          {count > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {selection.selectedSeats.map((s) => s.seatNumber).join(', ')}
            </p>
          )}
          <p className="mt-1 text-lg font-bold text-indigo-600">
            Tổng: {formatVnd(selection.totalPrice)}
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || count === 0}
          onClick={onProceed}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Tiếp tục thanh toán
        </button>
      </div>
    </div>
  );
}
