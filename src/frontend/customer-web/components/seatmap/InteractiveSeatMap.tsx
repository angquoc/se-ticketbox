'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TicketType, Zone } from '@/types/seatmap';
import { ZONE_COLORS } from '@/lib/seat-colors';
import { DEFAULT_SEATMAP_URL } from '@/lib/seatmap-config';
import { parseSvgViewBox } from '@/lib/svg-seatmap';
import ZoneTooltip from './ZoneTooltip';

interface ZoneEntry {
  ticketType: TicketType;
  zone: Zone;
}

interface InteractiveSeatMapProps {
  seatMapUrl: string;
  zones: ZoneEntry[];
  isZoneSelected: (ticketTypeId: string, zoneId: string) => boolean;
  onSelectZone: (ticketTypeId: string, zoneId: string) => void;
  onBackgroundLoaded?: () => void;
  onBackgroundError?: () => void;
}

function resolveZoneElement(
  target: EventTarget | null,
  host: HTMLElement,
): SVGGraphicsElement | null {
  const element = (target as Element | null)?.closest('[data-zone]');
  if (!element || !host.contains(element)) return null;
  return element as SVGGraphicsElement;
}

const SEATMAP_HOST_STYLES = `
.seatmap-host [data-zone] { transition: fill 0.15s ease, stroke 0.15s ease; cursor: pointer; }
.seatmap-host [data-zone][data-visible="false"] {
  opacity: 0.15;
  pointer-events: none;
}
.seatmap-host [data-zone][data-status="SOLD_OUT"] {
  fill: ${ZONE_COLORS.soldOut} !important;
  stroke: #9e9e9e !important;
  opacity: 0.85;
  cursor: not-allowed;
}
.seatmap-host [data-zone][data-status="RESERVED"] {
  fill: ${ZONE_COLORS.reserved} !important;
  stroke: #f9a825 !important;
}
.seatmap-host [data-zone][data-status="AVAILABLE"][data-selected="false"][data-hovered="false"] {
  fill: ${ZONE_COLORS.available} !important;
  stroke: #388e3c !important;
}
.seatmap-host [data-zone][data-status="AVAILABLE"][data-hovered="true"][data-selected="false"] {
  fill: ${ZONE_COLORS.hover} !important;
  stroke: #ef6c00 !important;
}
.seatmap-host [data-zone][data-selected="true"] {
  fill: ${ZONE_COLORS.selected} !important;
  stroke: #1565C0 !important;
  stroke-width: 3 !important;
}
`;

function applyZoneDataset(
  element: SVGGraphicsElement,
  zone: Zone,
  options: { isVisible: boolean; selected: boolean; hovered: boolean },
) {
  const { isVisible, selected, hovered } = options;

  element.dataset.visible = isVisible ? 'true' : 'false';
  element.dataset.status = zone.status;
  element.dataset.selected = selected ? 'true' : 'false';
  element.dataset.hovered = hovered ? 'true' : 'false';
}

export default function InteractiveSeatMap({
  seatMapUrl,
  zones,
  isZoneSelected,
  onSelectZone,
  onBackgroundLoaded,
  onBackgroundError,
}: InteractiveSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const zoneElementsRef = useRef<Map<string, SVGGraphicsElement>>(new Map());
  const hoveredZoneKeyRef = useRef<string | null>(null);
  const zoneByKeyRef = useRef<Map<string, ZoneEntry>>(new Map());
  const visibleZoneKeysRef = useRef<Set<string>>(new Set());
  const isZoneSelectedRef = useRef(isZoneSelected);
  const onSelectZoneRef = useRef(onSelectZone);
  const onBackgroundLoadedRef = useRef(onBackgroundLoaded);
  const onBackgroundErrorRef = useRef(onBackgroundError);
  const tooltipRafRef = useRef<number | null>(null);
  const hoverProbeRafRef = useRef<number | null>(null);
  const pendingTooltipPosRef = useRef<{ x: number; y: number } | null>(null);

  const [hoveredZone, setHoveredZone] = useState<ZoneEntry | null>(null);
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
    onBackgroundErrorRef.current = onBackgroundError;
  }, [onBackgroundError]);

  useEffect(() => {
    onSelectZoneRef.current = onSelectZone;
  }, [onSelectZone]);

  useEffect(() => {
    isZoneSelectedRef.current = isZoneSelected;
  }, [isZoneSelected]);

  const backgroundUrl = seatMapUrl || DEFAULT_SEATMAP_URL;
  const viewBox = useMemo(
    () => (svgMarkup ? parseSvgViewBox(svgMarkup) : { width: 800, height: 580 }),
    [svgMarkup],
  );

  const zoneKey = (ticketTypeId: string, zoneId: string) => `${ticketTypeId}:${zoneId}`;

  const zoneByKey = useMemo(() => {
    const map = new Map<string, ZoneEntry>();
    for (const entry of zones) {
      map.set(zoneKey(entry.ticketType.id, entry.zone.zoneId), entry);
    }
    return map;
  }, [zones]);

  const visibleZoneKeys = useMemo(
    () => new Set(zones.map((entry) => zoneKey(entry.ticketType.id, entry.zone.zoneId))),
    [zones],
  );

  useEffect(() => {
    zoneByKeyRef.current = zoneByKey;
    visibleZoneKeysRef.current = visibleZoneKeys;
  }, [zoneByKey, visibleZoneKeys]);

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
          onBackgroundErrorRef.current?.();
          onBackgroundLoadedRef.current?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backgroundUrl]);

  const styleZone = useCallback((key: string, hoveredOverride?: boolean) => {
    const element = zoneElementsRef.current.get(key);
    if (!element) return;

    const entry = zoneByKeyRef.current.get(key);
    const isVisible = Boolean(entry && visibleZoneKeysRef.current.has(key));
    const hovered = hoveredOverride ?? hoveredZoneKeyRef.current === key;
    const selected = entry
      ? isZoneSelectedRef.current(entry.ticketType.id, entry.zone.zoneId)
      : false;

    if (!entry || !isVisible) {
      element.dataset.visible = 'false';
      element.dataset.hovered = 'false';
      element.dataset.selected = 'false';
      return;
    }

    applyZoneDataset(element, entry.zone, { isVisible, selected, hovered });
  }, []);

  const syncAllZones = useCallback(() => {
    for (const key of zoneElementsRef.current.keys()) {
      styleZone(key);
    }
  }, [styleZone]);

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

  const setHoveredZoneKey = useCallback(
    (key: string | null, clientX: number, clientY: number) => {
      if (key === hoveredZoneKeyRef.current) {
        if (key) updateTooltipPosition(clientX, clientY);
        return;
      }

      hoveredZoneKeyRef.current = key;

      if (!key) {
        setHoveredZone(null);
        setTooltipPos(null);
        syncAllZones();
        return;
      }

      const entry = zoneByKeyRef.current.get(key);
      if (!entry || !visibleZoneKeysRef.current.has(key)) {
        setHoveredZone(null);
        setTooltipPos(null);
        syncAllZones();
        return;
      }

      setHoveredZone(entry);
      updateTooltipPosition(clientX, clientY);
      syncAllZones();
    },
    [syncAllZones, updateTooltipPosition],
  );

  const clearHover = useCallback(() => {
    setHoveredZoneKey(null, 0, 0);
  }, [setHoveredZoneKey]);

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

    const probeHover = (clientX: number, clientY: number) => {
      const hit = document.elementFromPoint(clientX, clientY);
      const zoneElement = hit ? resolveZoneElement(hit, host) : null;
      const zoneId = zoneElement?.getAttribute('data-zone');
      if (!zoneId) {
        setHoveredZoneKey(null, clientX, clientY);
        return;
      }

      const ticketTypeName = zoneElement?.getAttribute('data-ticket-type')?.trim().toLowerCase();
      const entry = Array.from(zoneByKeyRef.current.values()).find((item) => item.zone.zoneId === zoneId) ??
        Array.from(zoneByKeyRef.current.values()).find(
          (item) => item.ticketType.name.trim().toLowerCase() === ticketTypeName,
        );
      if (!entry) {
        setHoveredZoneKey(null, clientX, clientY);
        return;
      }

      setHoveredZoneKey(zoneKey(entry.ticketType.id, entry.zone.zoneId), clientX, clientY);
    };

    const scheduleHoverProbe = (clientX: number, clientY: number) => {
      if (dragging.current) return;
      if (hoverProbeRafRef.current !== null) return;
      hoverProbeRafRef.current = requestAnimationFrame(() => {
        hoverProbeRafRef.current = null;
        probeHover(clientX, clientY);
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      scheduleHoverProbe(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      scheduleHoverProbe(touch.clientX, touch.clientY);
    };

    const handleMouseLeave = () => {
      setHoveredZoneKey(null, 0, 0);
    };

    const handleClick = (event: MouseEvent) => {
      const zoneElement = resolveZoneElement(event.target, host);
      if (!zoneElement) return;

      event.stopPropagation();
      event.preventDefault();

      const zoneId = zoneElement.getAttribute('data-zone');
      if (!zoneId) return;

      const ticketTypeName = zoneElement.getAttribute('data-ticket-type')?.trim().toLowerCase();
      const entry = Array.from(zoneByKeyRef.current.values()).find((item) => item.zone.zoneId === zoneId) ??
        Array.from(zoneByKeyRef.current.values()).find(
          (item) => item.ticketType.name.trim().toLowerCase() === ticketTypeName,
        );
      if (!entry || !visibleZoneKeysRef.current.has(zoneKey(entry.ticketType.id, entry.zone.zoneId))) {
        return;
      }

      if (entry.zone.status === 'SOLD_OUT') return;

      onSelectZoneRef.current(entry.ticketType.id, entry.zone.zoneId);
      syncAllZones();
    };

    host.addEventListener('mousemove', handleMouseMove);
    host.addEventListener('touchmove', handleTouchMove, { passive: true });
    host.addEventListener('mouseleave', handleMouseLeave);
    host.addEventListener('click', handleClick);

    return () => {
      host.removeEventListener('mousemove', handleMouseMove);
      host.removeEventListener('touchmove', handleTouchMove);
      host.removeEventListener('mouseleave', handleMouseLeave);
      host.removeEventListener('click', handleClick);
      zoneElementsRef.current.clear();
      hoveredZoneKeyRef.current = null;
    };
  }, [svgLoaded, svgMarkup, setHoveredZoneKey, syncAllZones]);

  // Update SVG zone elements map when zones change or SVG finishes loading
  useEffect(() => {
    if (!svgLoaded) return;
    const host = svgHostRef.current;
    if (!host) return;

    const elementMap = new Map<string, SVGGraphicsElement>();
    host.querySelectorAll<SVGGraphicsElement>('[data-zone]').forEach((element) => {
      const zoneId = element.getAttribute('data-zone');
      if (!zoneId) return;

      const ticketTypeName = element.getAttribute('data-ticket-type')?.trim().toLowerCase();
      const entry = zones.find((item) => item.zone.zoneId === zoneId) ??
        zones.find(
          (item) => item.ticketType.name.trim().toLowerCase() === ticketTypeName,
        );
      if (!entry) return;

      elementMap.set(zoneKey(entry.ticketType.id, entry.zone.zoneId), element);
    });
    zoneElementsRef.current = elementMap;
    syncAllZones();
  }, [svgLoaded, zones, syncAllZones]);

  // Sync styling when zone selections change
  useEffect(() => {
    if (!svgLoaded || zoneElementsRef.current.size === 0) return;
    syncAllZones();
  }, [svgLoaded, isZoneSelected, syncAllZones]);

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
    if ((e.target as Element).closest('[data-zone]')) return;
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
          transition: isDragging || !animateTransform ? 'none' : 'transform 0.15s ease',
        }}
      >
        {svgLoaded ? (
          <div className="seatmap-host mx-auto w-full max-w-4xl">
            <style>{SEATMAP_HOST_STYLES}</style>
            <div
              ref={svgHostRef}
              className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label="Sơ đồ khu vực ghế"
            />
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            className="mx-auto w-full max-w-4xl"
            role="img"
            aria-label="Sơ đồ khu vực ghế"
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

      {hoveredZone && tooltipPos && (
        <ZoneTooltip
          ticketType={hoveredZone.ticketType}
          zone={hoveredZone.zone}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}
    </div>
  );
}
