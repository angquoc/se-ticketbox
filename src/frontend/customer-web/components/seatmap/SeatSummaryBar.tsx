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
                <span className="text-sm font-semibold text-slate-900">
                  {selection.quantity} vé
                </span>
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
