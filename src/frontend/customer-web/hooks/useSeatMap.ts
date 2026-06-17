'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cacheConcertName } from '@/lib/concert-names';
import { readZoneSelection, saveZoneSelection } from '@/lib/checkout-storage';
import { applyZoneAvailabilityUpdates } from '@/lib/seatmap-data';
import type {
  SeatMapData,
  TicketType,
  Zone,
  ZoneAvailabilityUpdate,
  ZoneSelection,
  ZoneSelectionState,
  ZoneStatus,
} from '@/types/seatmap';

const POLL_INTERVAL_MS = 30_000;
export const ALL_TICKET_TYPES = 'all';
export const ALL_ZONES = 'all';

interface UseSeatMapOptions {
  concertId: string;
}

interface SeatMapApiResponse {
  success: boolean;
  data?: SeatMapData;
  source?: 'backend' | 'mock';
  backendError?: string;
  warning?: string;
  message?: string;
}

interface ZoneAvailabilityResponse {
  success: boolean;
  data?: {
    updates: ZoneAvailabilityUpdate[];
  };
  message?: string;
}

export function useSeatMap({ concertId }: UseSeatMapOptions) {
  const [data, setData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'mock' | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selection, setSelection] = useState<ZoneSelection | null>(null);
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>(ALL_TICKET_TYPES);
  const [zoneFilter, setZoneFilter] = useState<string>(ALL_ZONES);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const restoredSelectionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setBackendError(null);
      setWarning(null);
      restoredSelectionRef.current = false;

      try {
        const res = await fetch(`/api/concerts/${concertId}/seatmap`);
        const json = (await res.json()) as SeatMapApiResponse;

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message ?? 'Không tải được sơ đồ ghế');
        }

        if (!cancelled) {
          setData(json.data);
          setSource(json.source ?? null);
          setBackendError(json.backendError ?? null);
          setWarning(json.warning ?? null);
          cacheConcertName(json.data.concertId, json.data.concertName);
          setTicketTypeFilter(ALL_TICKET_TYPES);
          setZoneFilter(ALL_ZONES);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Lỗi không xác định');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [concertId]);

  const ticketTypeMap = useMemo(() => {
    const map = new Map<string, TicketType>();
    data?.ticketTypes.forEach((tt) => map.set(tt.id, tt));
    return map;
  }, [data]);

  const zoneLookup = useMemo(() => {
    const map = new Map<string, { ticketType: TicketType; zone: Zone }>();
    data?.ticketTypes.forEach((ticketType) => {
      ticketType.zones.forEach((zone) => {
        map.set(`${ticketType.id}:${zone.zoneId}`, { ticketType, zone });
      });
    });
    return map;
  }, [data]);

  useEffect(() => {
    if (!data || restoredSelectionRef.current) return;

    const saved = readZoneSelection(concertId);
    if (!saved) {
      restoredSelectionRef.current = true;
      return;
    }

    const entry = zoneLookup.get(`${saved.ticketTypeId}:${saved.zoneId}`);
    if (entry && entry.zone.status === 'AVAILABLE' && entry.zone.availableCount >= saved.quantity) {
      setSelection(saved);
    }
    restoredSelectionRef.current = true;
  }, [data, concertId, zoneLookup]);

  useEffect(() => {
    if (!selection) return;
    saveZoneSelection(concertId, selection);
  }, [selection, concertId]);

  const selectionState: ZoneSelectionState = useMemo(() => {
    if (!selection) {
      return { selection: null, totalPrice: 0 };
    }
    return {
      selection,
      totalPrice: selection.unitPrice * selection.quantity,
    };
  }, [selection]);

  const zones = useMemo(() => {
    if (!data) return [];
    const items: Array<{ ticketType: TicketType; zone: Zone }> = [];
    for (const ticketType of data.ticketTypes) {
      for (const zone of ticketType.zones) {
        items.push({ ticketType, zone });
      }
    }
    return items;
  }, [data]);

  const filteredZones = useMemo(() => {
    return zones.filter(({ ticketType, zone }) => {
      if (ticketTypeFilter !== ALL_TICKET_TYPES && ticketType.id !== ticketTypeFilter) {
        return false;
      }
      if (zoneFilter !== ALL_ZONES && zone.zoneId !== zoneFilter) {
        return false;
      }
      return true;
    });
  }, [zones, ticketTypeFilter, zoneFilter]);

  const zoneOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const { zone } of zones) {
      seen.set(zone.zoneId, zone.zoneName);
    }
    return Array.from(seen.entries()).map(([zoneId, zoneName]) => ({ zoneId, zoneName }));
  }, [zones]);

  const pollAvailability = useCallback(async () => {
    if (!data) return;

    try {
      const res = await fetch(`/api/concerts/${concertId}/seatmap/availability`);
      const json = (await res.json()) as ZoneAvailabilityResponse;
      if (!res.ok || !json.success || !json.data) return;

      const updates = json.data.updates;
      setData((prev) => (prev ? applyZoneAvailabilityUpdates(prev, updates) : prev));

      if (!selection) return;

      const current = updates.find(
        (update) =>
          update.ticketTypeId === selection.ticketTypeId && update.zoneId === selection.zoneId,
      );
      if (!current) return;

      if (
        current.status === 'SOLD_OUT' ||
        current.availableCount < selection.quantity
      ) {
        setSelection(null);
        setAvailabilityNotice(
          current.status === 'SOLD_OUT'
            ? 'Khu vực này vừa hết chỗ. Vui lòng chọn khu vực khác.'
            : 'Số vé còn lại đã thay đổi. Vui lòng kiểm tra lại số lượng.',
        );
      }
    } catch {
      // Polling thất bại âm thầm — spec cho phép retry ở lần poll sau
    }
  }, [concertId, data, selection]);

  useEffect(() => {
    if (!data) return undefined;

    const interval = setInterval(() => {
      void pollAvailability();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [data, pollAvailability]);

  const selectZone = useCallback(
    (ticketTypeId: string, zoneId: string) => {
      const entry = zoneLookup.get(`${ticketTypeId}:${zoneId}`);
      if (!entry) return;

      const { ticketType, zone } = entry;
      if (zone.status === 'SOLD_OUT') {
        setLimitWarning('Khu vực này đã hết vé');
        return;
      }

      setLimitWarning(null);
      setAvailabilityNotice(null);

      if (selection?.ticketTypeId === ticketTypeId && selection.zoneId === zoneId) {
        setSelection(null);
        return;
      }

      setSelection({
        ticketTypeId: ticketType.id,
        zoneId: zone.zoneId,
        ticketTypeName: ticketType.name,
        zoneName: zone.zoneName,
        quantity: 1,
        unitPrice: ticketType.price,
      });
    },
    [zoneLookup, selection],
  );

  const setQuantity = useCallback(
    (quantity: number) => {
      if (!selection) return;

      const entry = zoneLookup.get(`${selection.ticketTypeId}:${selection.zoneId}`);
      if (!entry) return;

      const { ticketType, zone } = entry;
      const nextQuantity = Math.max(1, Math.min(quantity, zone.availableCount, ticketType.maxPerUser));

      if (nextQuantity > ticketType.maxPerUser) {
        setLimitWarning(`Tối đa ${ticketType.maxPerUser} vé ${ticketType.name} mỗi người`);
        return;
      }

      if (nextQuantity > zone.availableCount) {
        setLimitWarning(`Chỉ còn ${zone.availableCount} vé trong khu vực này`);
        return;
      }

      setLimitWarning(null);
      setSelection({ ...selection, quantity: nextQuantity });
    },
    [selection, zoneLookup],
  );

  const isZoneSelected = useCallback(
    (ticketTypeId: string, zoneId: string) =>
      selection?.ticketTypeId === ticketTypeId && selection.zoneId === zoneId,
    [selection],
  );

  return {
    data,
    loading,
    error,
    source,
    backendError,
    warning,
    availabilityNotice,
    selectionState,
    ticketTypeFilter,
    setTicketTypeFilter,
    zoneFilter,
    setZoneFilter,
    limitWarning,
    filteredZones,
    zoneOptions,
    selectZone,
    setQuantity,
    isZoneSelected,
  };
}

export type { ZoneStatus };
