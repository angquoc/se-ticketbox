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
  selectedSeats?: string[];
  onSelectSeat?: (seatName: string) => void;
  disabled?: boolean;
}

export default function ZoneDetailPanel({
  ticketType,
  zone,
  quantity,
  maxQuantity,
  remainingAllowance,
  selectedSeats = [],
  onSelectSeat,
  disabled = false,
}: ZoneDetailPanelProps) {
  const label = zoneAvailabilityLabel(zone);

  const totalSeats = zone.availableCount + zone.reservedCount + zone.soldCount;
  const seatsPerRow = 10;
  const numRows = Math.ceil(totalSeats / seatsPerRow);
  const rows = Array.from({ length: numRows }, (_, i) => String.fromCharCode(65 + i));

  const getSeatStatus = (rowIndex: number, seatNum: number) => {
    const flatIndex = rowIndex * seatsPerRow + (seatNum - 1);
    if (flatIndex >= totalSeats) return 'empty_slot';
    if (flatIndex < zone.soldCount) return 'sold';
    if (flatIndex < zone.soldCount + zone.reservedCount) return 'reserved';
    return 'available';
  };

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

      <div className="mt-6 border-t border-indigo-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
          <span>Sơ đồ vị trí ghế khu vực {zone.zoneName}</span>
          <span className="text-xs font-normal text-slate-500">Hành lang / Lối đi ở giữa</span>
        </h3>
        
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
            <span className="text-slate-600">Còn trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-amber-300 bg-amber-100 flex items-center justify-center text-[10px] text-amber-700 font-bold">R</div>
            <span className="text-slate-600">Đang giữ chỗ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">X</div>
            <span className="text-slate-600">Hết vé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-indigo-600 bg-indigo-600" />
            <span className="text-slate-600">Đã chọn</span>
          </div>
        </div>

        {totalSeats === 0 ? (
          <p className="text-sm text-slate-500 italic">Khu vực này hiện không có ghế.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
            <div className="min-w-[480px] flex flex-col gap-2">
              {rows.map((rowLetter, rowIndex) => (
                <div key={rowLetter} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-slate-400">{rowLetter}</span>
                  
                  <div className="flex flex-1 items-center justify-between gap-1">
                    {Array.from({ length: seatsPerRow }).map((_, seatIdx) => {
                      const seatNum = seatIdx + 1;
                      const seatName = `${rowLetter}-${seatNum}`;
                      const status = getSeatStatus(rowIndex, seatNum);

                      if (status === 'empty_slot') {
                        return <div key={seatIdx} className="h-8 w-8 flex-1" />;
                      }

                      const isSold = status === 'sold';
                      const isReserved = status === 'reserved';
                      const isSelected = selectedSeats?.includes(seatName) || false;

                      let btnClass = "h-8 w-8 rounded text-xs font-semibold flex items-center justify-center transition-colors border ";
                      if (isSold) {
                        btnClass += "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed";
                      } else if (isReserved) {
                        btnClass += "bg-amber-100 text-amber-700 border-amber-300 cursor-not-allowed";
                      } else if (isSelected) {
                        btnClass += "bg-indigo-600 text-white border-indigo-600 shadow-sm";
                      } else {
                        btnClass += "bg-white hover:bg-indigo-50 border-slate-300 text-slate-700 cursor-pointer";
                      }

                      return (
                        <button
                          key={seatName}
                          type="button"
                          disabled={isSold || isReserved || disabled}
                          onClick={() => onSelectSeat?.(seatName)}
                          className={btnClass}
                          title={isSold ? `Ghế ${seatName} đã bán` : isReserved ? `Ghế ${seatName} đang giữ chỗ` : `Ghế ${seatName}`}
                          aria-label={`Ghế ${seatName}`}
                        >
                          {isSold ? 'X' : isReserved ? 'R' : seatNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
