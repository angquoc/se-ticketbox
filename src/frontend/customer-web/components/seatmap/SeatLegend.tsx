import { SEAT_COLORS } from '@/lib/seat-colors';

const LEGEND_ITEMS = [
  { label: 'Còn trống', color: SEAT_COLORS.available },
  { label: 'Đang giữ chỗ', color: SEAT_COLORS.reserved },
  { label: 'Đã bán', color: SEAT_COLORS.sold },
  { label: 'Đã chọn', color: SEAT_COLORS.selected },
] as const;

export default function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Chú thích</span>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-slate-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
