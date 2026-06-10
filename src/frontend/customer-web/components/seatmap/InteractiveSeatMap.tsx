'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Seat, SeatMapData } from '@/types/seatmap';
import { SEAT_COLORS } from '@/lib/seat-colors';
import { DEFAULT_SEATMAP_URL } from '@/lib/seatmap-config';
import { parseSvgViewBox } from '@/lib/svg-seatmap';
import SeatTooltip from './SeatTooltip';

interface InteractiveSeatMapProps {
  data: SeatMapData;
  seats: Seat[];
  selectedSeatNumbers: ReadonlySet<string>;
  onToggleSeat: (seat: Seat) => void;
  onBackgroundLoaded?: () => void;
}

function resolveSeatElement(target: EventTarget | null, host: HTMLElement): SVGGraphicsElement | null {
  const element = (target as Element | null)?.closest('[data-seat]');
  if (!element || !host.contains(element)) return null;
  return element as SVGGraphicsElement;
}

const SEATMAP_HOST_STYLES = `
.seatmap-host [data-seat] { transition: none; cursor: default; }
.seatmap-host [data-seat][data-visible="false"] {
  fill: ${SEAT_COLORS.sold} !important;
  stroke: transparent !important;
  stroke-width: 0 !important;
  opacity: 0.2;
  pointer-events: none;
}
.seatmap-host [data-seat][data-status="SOLD"] {
  fill: ${SEAT_COLORS.sold} !important;
  stroke: transparent !important;
  opacity: 0.7;
  pointer-events: none;
}
.seatmap-host [data-seat][data-status="RESERVED"] {
  fill: ${SEAT_COLORS.reserved} !important;
  stroke: transparent !important;
  pointer-events: none;
}
.seatmap-host [data-seat][data-status="AVAILABLE"][data-selected="false"][data-hovered="false"] {
  fill: ${SEAT_COLORS.available} !important;
  stroke: transparent !important;
  stroke-width: 0 !important;
}
.seatmap-host [data-seat][data-status="AVAILABLE"][data-hovered="true"][data-selected="false"] {
  fill: ${SEAT_COLORS.hover} !important;
  stroke: transparent !important;
  stroke-width: 0 !important;
}
.seatmap-host [data-seat][data-selected="true"] {
  fill: ${SEAT_COLORS.selected} !important;
  stroke: #1565C0 !important;
  stroke-width: 2 !important;
}
.seatmap-host [data-seat][data-clickable="true"] { pointer-events: all; cursor: pointer; }
`;

function applySeatDataset(
  element: SVGGraphicsElement,
  seat: Seat,
  options: { isVisible: boolean; selected: boolean; hovered: boolean },
) {
  const { isVisible, selected, hovered } = options;
  const clickable = seat.status === 'AVAILABLE' || selected;

  element.dataset.visible = isVisible ? 'true' : 'false';
  element.dataset.status = seat.status;
  element.dataset.selected = selected ? 'true' : 'false';
  element.dataset.hovered = hovered ? 'true' : 'false';
  element.dataset.clickable = isVisible && clickable ? 'true' : 'false';
  element.style.opacity = '';
  element.style.pointerEvents = '';
  element.style.cursor = '';
}

export default function InteractiveSeatMap({
  data,
  seats,
  selectedSeatNumbers,
  onToggleSeat,
  onBackgroundLoaded,
}: InteractiveSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const seatElementsRef = useRef<Map<string, SVGGraphicsElement>>(new Map());
  const hoveredSeatNumberRef = useRef<string | null>(null);
  const seatByNumberRef = useRef<Map<string, Seat>>(new Map());
  const visibleSeatNumbersRef = useRef<Set<string>>(new Set());
  const selectedSeatNumbersRef = useRef(selectedSeatNumbers);
  const onToggleSeatRef = useRef(onToggleSeat);
  const onBackgroundLoadedRef = useRef(onBackgroundLoaded);
  const tooltipRafRef = useRef<number | null>(null);
  const hoverProbeRafRef = useRef<number | null>(null);
  const pendingTooltipPosRef = useRef<{ x: number; y: number } | null>(null);
  const optimisticSelectionRef = useRef<Set<string>>(new Set());

  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [animateTransform, setAnimateTransform] = useState(false);

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    onBackgroundLoadedRef.current = onBackgroundLoaded;
  }, [onBackgroundLoaded]);

  useEffect(() => {
    onToggleSeatRef.current = onToggleSeat;
  }, [onToggleSeat]);

  useEffect(() => {
    selectedSeatNumbersRef.current = selectedSeatNumbers;
  }, [selectedSeatNumbers]);

  const backgroundUrl = data.seatMapUrl || DEFAULT_SEATMAP_URL;
  const viewBox = useMemo(
    () => (svgMarkup ? parseSvgViewBox(svgMarkup) : { width: 800, height: 580 }),
    [svgMarkup],
  );

  const seatByNumber = useMemo(
    () => new Map(data.seats.map((seat) => [seat.seatNumber, seat])),
    [data.seats],
  );

  const visibleSeatNumbers = useMemo(
    () => new Set(seats.map((seat) => seat.seatNumber)),
    [seats],
  );

  useEffect(() => {
    seatByNumberRef.current = seatByNumber;
    visibleSeatNumbersRef.current = visibleSeatNumbers;
  }, [seatByNumber, visibleSeatNumbers]);

  useEffect(() => {
    let cancelled = false;
    setSvgLoaded(false);
    setSvgMarkup(null);

    fetch(backgroundUrl)
      .then((response) => {
        if (!response.ok) throw new Error('SVG load failed');
        return response.text();
      })
      .then((markup) => {
        if (cancelled) return;
        setSvgMarkup(markup);
        setSvgLoaded(true);
        onBackgroundLoadedRef.current?.();
      })
      .catch(() => {
        if (!cancelled) {
          setSvgLoaded(false);
          onBackgroundLoadedRef.current?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backgroundUrl]);

  const regionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tt of data.ticketTypes) {
      for (const r of tt.seatRegions) {
        map.set(r.regionId, r.regionName);
      }
    }
    return map;
  }, [data.ticketTypes]);

  const priceMap = useMemo(
    () => new Map(data.ticketTypes.map((tt) => [tt.id, tt.price])),
    [data.ticketTypes],
  );

  const styleSeat = useCallback((seatNumber: string, hoveredOverride?: boolean) => {
    const element = seatElementsRef.current.get(seatNumber);
    if (!element) return;

    const seat = seatByNumberRef.current.get(seatNumber);
    const isVisible = Boolean(seat && visibleSeatNumbersRef.current.has(seatNumber));
    const hovered =
      hoveredOverride ?? hoveredSeatNumberRef.current === seatNumber;
    const selected =
      selectedSeatNumbersRef.current.has(seatNumber) ||
      optimisticSelectionRef.current.has(seatNumber);

    if (!seat || !isVisible) {
      element.dataset.visible = 'false';
      element.dataset.hovered = 'false';
      element.dataset.selected = 'false';
      element.dataset.clickable = 'false';
      return;
    }

    applySeatDataset(element, seat, { isVisible, selected, hovered });
  }, []);

  const setSeatHovered = useCallback((seatNumber: string, hovered: boolean) => {
    const element = seatElementsRef.current.get(seatNumber);
    if (!element) return;
    element.dataset.hovered = hovered ? 'true' : 'false';
  }, []);

  const syncAllSeats = useCallback(() => {
    for (const seatNumber of seatElementsRef.current.keys()) {
      styleSeat(seatNumber);
    }
  }, [styleSeat]);

  const updateTooltipPosition = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    pendingTooltipPosRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    if (tooltipRafRef.current !== null) return;
    tooltipRafRef.current = requestAnimationFrame(() => {
      tooltipRafRef.current = null;
      if (pendingTooltipPosRef.current) setTooltipPos(pendingTooltipPosRef.current);
    });
  }, []);

  const setHoveredSeatNumber = useCallback(
    (seatNumber: string | null, clientX: number, clientY: number) => {
      if (seatNumber === hoveredSeatNumberRef.current) {
        if (seatNumber) updateTooltipPosition(clientX, clientY);
        return;
      }

      const previous = hoveredSeatNumberRef.current;
      if (previous) setSeatHovered(previous, false);

      if (!seatNumber) {
        hoveredSeatNumberRef.current = null;
        setHoveredSeat(null);
        setTooltipPos(null);
        return;
      }

      const seat = seatByNumberRef.current.get(seatNumber);
      if (!seat || !visibleSeatNumbersRef.current.has(seatNumber)) {
        hoveredSeatNumberRef.current = null;
        setHoveredSeat(null);
        setTooltipPos(null);
        return;
      }

      hoveredSeatNumberRef.current = seatNumber;
      setSeatHovered(seatNumber, true);
      setHoveredSeat(seat);
      updateTooltipPosition(clientX, clientY);
    },
    [setSeatHovered, updateTooltipPosition],
  );

  const clearHover = useCallback(() => {
    const previous = hoveredSeatNumberRef.current;
    if (!previous) return;
    hoveredSeatNumberRef.current = null;
    setSeatHovered(previous, false);
    setHoveredSeat(null);
    setTooltipPos(null);
  }, [setSeatHovered]);

  useEffect(() => {
    return () => {
      if (tooltipRafRef.current !== null) cancelAnimationFrame(tooltipRafRef.current);
      if (hoverProbeRafRef.current !== null) cancelAnimationFrame(hoverProbeRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!svgLoaded || !svgMarkup) return undefined;

    const host = svgHostRef.current;
    if (!host) return undefined;

    host.innerHTML = svgMarkup;

    const seatMap = new Map<string, SVGGraphicsElement>();
    host.querySelectorAll<SVGGraphicsElement>('[data-seat]').forEach((element) => {
      const seatNumber = element.getAttribute('data-seat');
      if (seatNumber) seatMap.set(seatNumber, element);
    });
    seatElementsRef.current = seatMap;

    syncAllSeats();

    const probeHover = (clientX: number, clientY: number) => {
      const hit = document.elementFromPoint(clientX, clientY);
      const seatElement = hit ? resolveSeatElement(hit, host) : null;
      const seatNumber = seatElement?.getAttribute('data-seat') ?? null;
      setHoveredSeatNumber(seatNumber, clientX, clientY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (dragging.current) return;
      const { clientX, clientY } = event;
      if (hoverProbeRafRef.current !== null) return;
      hoverProbeRafRef.current = requestAnimationFrame(() => {
        hoverProbeRafRef.current = null;
        probeHover(clientX, clientY);
      });
    };

    const handleMouseLeave = () => {
      setHoveredSeatNumber(null, 0, 0);
    };

    const handleClick = (event: MouseEvent) => {
      const seatElement = resolveSeatElement(event.target, host);
      if (!seatElement) return;

      event.stopPropagation();
      event.preventDefault();
      const seatNumber = seatElement.getAttribute('data-seat');
      if (!seatNumber) return;

      const seat = seatByNumberRef.current.get(seatNumber);
      if (!seat || !visibleSeatNumbersRef.current.has(seatNumber)) return;

      const selected =
        selectedSeatNumbersRef.current.has(seatNumber) ||
        optimisticSelectionRef.current.has(seatNumber);
      const clickable = seat.status === 'AVAILABLE' || selected;
      if (!clickable) return;

      if (selected) optimisticSelectionRef.current.delete(seatNumber);
      else optimisticSelectionRef.current.add(seatNumber);

      styleSeat(seatNumber);
      onToggleSeatRef.current(seat);
    };

    host.addEventListener('mousemove', handleMouseMove);
    host.addEventListener('mouseleave', handleMouseLeave);
    host.addEventListener('click', handleClick);

    return () => {
      host.removeEventListener('mousemove', handleMouseMove);
      host.removeEventListener('mouseleave', handleMouseLeave);
      host.removeEventListener('click', handleClick);
      seatElementsRef.current.clear();
      hoveredSeatNumberRef.current = null;
    };
  }, [svgLoaded, svgMarkup, setHoveredSeatNumber, styleSeat, syncAllSeats]);

  useEffect(() => {
    if (!svgLoaded || seatElementsRef.current.size === 0) return;

    for (const seatNumber of optimisticSelectionRef.current) {
      if (!selectedSeatNumbers.has(seatNumber)) {
        optimisticSelectionRef.current.delete(seatNumber);
      }
    }
    for (const seatNumber of selectedSeatNumbers) {
      optimisticSelectionRef.current.delete(seatNumber);
    }

    syncAllSeats();
  }, [svgLoaded, selectedSeatNumbers, visibleSeatNumbers, seatByNumber, syncAllSeats]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      clearHover();
      setAnimateTransform(false);
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(2.5, Math.max(0.6, s + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [clearHover]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('[data-seat]')) return;
    clearHover();
    dragging.current = true;
    setIsDragging(true);
    setAnimateTransform(false);
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
    setIsDragging(false);
  };

  const zoomByStep = (delta: number) => {
    clearHover();
    setAnimateTransform(true);
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
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => zoomByStep(0.2)}
          className="rounded-md bg-white px-2 py-1 text-sm shadow hover:bg-slate-50"
          aria-label="Phóng to"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomByStep(-0.2)}
          className="rounded-md bg-white px-2 py-1 text-sm shadow hover:bg-slate-50"
          aria-label="Thu nhỏ"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            clearHover();
            setAnimateTransform(true);
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
          transition:
            isDragging || !animateTransform ? 'none' : 'transform 0.15s ease',
        }}
      >
        {svgLoaded ? (
          <div className="seatmap-host mx-auto w-full max-w-4xl">
            <style>{SEATMAP_HOST_STYLES}</style>
            <div
              ref={svgHostRef}
              className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label="Sơ đồ ghế"
            />
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            className="mx-auto w-full max-w-4xl"
            role="img"
            aria-label="Sơ đồ ghế"
          >
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
              ĐANG TẢI SƠ ĐỒ GHẾ...
            </text>
          </svg>
        )}
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
