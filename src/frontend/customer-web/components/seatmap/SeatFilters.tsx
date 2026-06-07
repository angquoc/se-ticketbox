'use client';

import type { TicketType } from '@/types/seatmap';
import { formatVnd } from '@/lib/format';

interface SeatFiltersProps {
  ticketTypes: TicketType[];
  activeTicketTypeId: string | null;
  onTicketTypeChange: (id: string) => void;
  regions: { regionId: string; regionName: string }[];
  regionFilter: string;
  onRegionChange: (regionId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SeatFilters({
  ticketTypes,
  activeTicketTypeId,
  onTicketTypeChange,
  regions,
  regionFilter,
  onRegionChange,
  searchQuery,
  onSearchChange,
}: SeatFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {ticketTypes.map((tt) => (
          <button
            key={tt.id}
            type="button"
            onClick={() => onTicketTypeChange(tt.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTicketTypeId === tt.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tt.name} — {formatVnd(tt.price)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={regionFilter}
          onChange={(e) => onRegionChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Lọc theo khu vực"
        >
          <option value="all">Tất cả khu vực</option>
          {regions.map((r) => (
            <option key={r.regionId} value={r.regionId}>
              {r.regionName}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm ghế (VD: VIP-A1, STD-E5...)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
