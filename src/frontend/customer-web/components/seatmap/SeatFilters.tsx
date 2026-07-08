'use client';

import type { TicketType } from '@/types/seatmap';
import { ALL_AVAILABILITY, ALL_TICKET_TYPES, ALL_ZONES } from '@/hooks/useSeatMap';
import type { AvailabilityFilter } from '@/lib/zone-availability';
import { formatVnd } from '@/lib/format';

interface SeatFiltersProps {
  ticketTypes: TicketType[];
  ticketTypeFilter: string;
  onTicketTypeChange: (id: string) => void;
  zones: { zoneId: string; zoneName: string }[];
  zoneFilter: string;
  onZoneChange: (zoneId: string) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityChange: (filter: AvailabilityFilter) => void;
}

const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: ALL_AVAILABILITY, label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Còn trống' },
  { value: 'RESERVED', label: 'Gần hết' },
  { value: 'SOLD_OUT', label: 'Hết vé' },
];

export default function SeatFilters({
  ticketTypes,
  ticketTypeFilter,
  onTicketTypeChange,
  zones,
  zoneFilter,
  onZoneChange,
  availabilityFilter,
  onAvailabilityChange,
}: SeatFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTicketTypeChange(ALL_TICKET_TYPES)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            ticketTypeFilter === ALL_TICKET_TYPES
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tất cả loại vé
        </button>
        {ticketTypes.map((tt) => (
          <button
            key={tt.id}
            type="button"
            onClick={() => onTicketTypeChange(tt.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              ticketTypeFilter === tt.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tt.name} — {formatVnd(tt.price)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={zoneFilter}
          onChange={(e) => onZoneChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Lọc theo khu vực"
        >
          <option value={ALL_ZONES}>Tất cả khu vực</option>
          {zones.map((zone) => (
            <option key={zone.zoneId} value={zone.zoneId}>
              {zone.zoneName}
            </option>
          ))}
        </select>

        <select
          value={availabilityFilter}
          onChange={(e) => onAvailabilityChange(e.target.value as AvailabilityFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Lọc theo trạng thái còn trống"
        >
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {AVAILABILITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onAvailabilityChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              availabilityFilter === option.value
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
