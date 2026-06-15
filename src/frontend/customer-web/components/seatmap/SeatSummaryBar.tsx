'use client';

import type { ZoneSelectionState } from '@/types/seatmap';
import { formatVnd } from '@/lib/format';

interface SeatSummaryBarProps {
  selectionState: ZoneSelectionState;
  maxQuantity: number;
  disabled?: boolean;
  onQuantityChange: (quantity: number) => void;
  onProceed?: () => void;
}

export default function SeatSummaryBar({
  selectionState,
  maxQuantity,
  disabled = false,
  onQuantityChange,
  onProceed,
}: SeatSummaryBarProps) {
  const { selection, totalPrice } = selectionState;
  const canProceed = Boolean(selection && selection.quantity > 0);

  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {selection ? (
            <>
              <p className="text-sm text-slate-600">
                Đã chọn:{' '}
                <span className="font-semibold text-slate-900">
                  {selection.ticketTypeName} · {selection.zoneName}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-slate-600">Số lượng:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(selection.quantity - 1)}
                    disabled={selection.quantity <= 1}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center font-semibold text-slate-900">
                    {selection.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(selection.quantity + 1)}
                    disabled={selection.quantity >= maxQuantity}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="mt-1 text-lg font-bold text-indigo-600">
                Tổng: {formatVnd(totalPrice)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Chọn khu vực trên sơ đồ để tiếp tục</p>
          )}
        </div>

        <button
          type="button"
          disabled={disabled || !canProceed}
          onClick={onProceed}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Tiếp tục thanh toán
        </button>
      </div>
    </div>
  );
}
