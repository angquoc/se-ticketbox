'use client';

import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Seat, SeatMapData } from '@/types/seatmap';
import { getSeatFillColor } from '@/lib/seat-colors';
import { getZoneBackgrounds } from '@/lib/mock-seatmap';
import SeatTooltip from './SeatTooltip';

const SEAT_SIZE = 20;
const VIEWBOX = { width: 800, height: 580 };

interface InteractiveSeatMapProps {
  data: SeatMapData;
  seats: Seat[];
  isSelected: (seatNumber: string) => boolean;
  onToggleSeat: (seat: Seat) => void;
  hoveredSeat: Seat | null;
  onHoverSeat: (seat: Seat | null) => void;
}

export default function InteractiveSeatMap({
  data,
  seats,
  isSelected,
  onToggleSeat,
  hoveredSeat,
  onHoverSeat,
}: InteractiveSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const regionNameMap = new Map<string, string>();
  for (const tt of data.ticketTypes) {
    for (const r of tt.seatRegions) {
      regionNameMap.set(r.regionId, r.regionName);
    }
  }

  const priceMap = new Map(data.ticketTypes.map((tt) => [tt.id, tt.price]));
  const zones = getZoneBackgrounds();

  const handleSeatMouseEnter = useCallback(
    (seat: Seat, event: React.MouseEvent<SVGRectElement>) => {
      onHoverSeat(seat);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    },
    [onHoverSeat],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('[data-seat]')) return;
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(2.5, Math.max(0.6, s + delta)));
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
          className="rounded-md bg-white px-2 py-1 text-sm shadow hover:bg-slate-50"
          aria-label="Phóng to"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
          className="rounded-md bg-white px-2 py-1 text-sm shadow hover:bg-slate-50"
          aria-label="Thu nhỏ"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="rounded-md bg-white px-2 py-1 text-xs shadow hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: dragging.current ? 'none' : 'transform 0.15s ease',
        }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="mx-auto w-full max-w-4xl"
          role="img"
          aria-label="Sơ đồ ghế"
        >
          {/* Stage */}
          <rect x={275} y={20} width={250} height={48} rx={8} fill="#1e293b" />
          <text
            x={400}
            y={50}
            textAnchor="middle"
            fill="white"
            fontSize={14}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            SÂN KHẤU
          </text>

          {/* Zone backgrounds */}
          {zones.map((zone) => (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx={6}
                fill={zone.color}
                opacity={0.45}
              />
              <text
                x={zone.x + 12}
                y={zone.y + 18}
                fill="#475569"
                fontSize={11}
                fontWeight={600}
                fontFamily="system-ui, sans-serif"
              >
                {zone.label}
              </text>
            </g>
          ))}

          {/* Seats */}
          {seats.map((seat) => {
            const selected = isSelected(seat.seatNumber);
            const hovered = hoveredSeat?.seatNumber === seat.seatNumber;
            const clickable = seat.status === 'AVAILABLE' || selected;

            return (
              <rect
                key={seat.seatNumber}
                data-seat={seat.seatNumber}
                x={seat.coords.x}
                y={seat.coords.y}
                width={SEAT_SIZE}
                height={SEAT_SIZE}
                rx={3}
                fill={getSeatFillColor(seat.status, selected, hovered)}
                stroke={selected ? '#1565C0' : 'transparent'}
                strokeWidth={selected ? 2 : 0}
                className={clsx(clickable && 'cursor-pointer')}
                opacity={seat.status === 'SOLD' ? 0.7 : 1}
                onClick={() => clickable && onToggleSeat(seat)}
                onMouseEnter={(e) => handleSeatMouseEnter(seat, e)}
                onMouseLeave={() => {
                  onHoverSeat(null);
                  setTooltipPos(null);
                }}
              />
            );
          })}
        </svg>
      </div>

      {hoveredSeat && tooltipPos && (
        <SeatTooltip
          seat={hoveredSeat}
          price={priceMap.get(hoveredSeat.ticketTypeId) ?? 0}
          regionName={regionNameMap.get(hoveredSeat.regionId) ?? hoveredSeat.regionId}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}
    </div>
  );
}
