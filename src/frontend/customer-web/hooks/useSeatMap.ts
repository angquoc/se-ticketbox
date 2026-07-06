'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cacheConcertName } from '@/lib/concert-names';
import { readZoneSelection, saveZoneSelection } from '@/lib/checkout-storage';
import { resolveBackendConcertId } from '@/lib/concert-backend-mapping';
import {
  applyZoneAvailabilityUpdates,
  mapSocketZoneUpdates,
} from '@/lib/seatmap-data';
import { connectSeatmapSocket, disconnectSeatmapSocket } from '@/lib/seatmap-socket';
import {
  fetchUserTicketUsage,
  remainingTicketAllowance,
  type TicketTypeUsageMap,
} from '@/lib/user-ticket-usage';
import { ALL_AVAILABILITY, type AvailabilityFilter } from '@/lib/zone-availability';
import { useAuth } from '@/hooks/useAuth';
import type {
  SeatMapData,
  TicketType,
  Zone,
  ZoneAvailabilityUpdate,
  ZoneSelection,
  ZoneSelectionState,
  ZoneStatus,
} from '@/types/seatmap';
import type { Socket } from 'socket.io-client';

const POLL_INTERVAL_MS = 30_000;
export const ALL_TICKET_TYPES = 'all';
export const ALL_ZONES = 'all';
export { ALL_AVAILABILITY };

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
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'mock' | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selection, setSelection] = useState<ZoneSelection | null>(null);
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>(ALL_TICKET_TYPES);
  const [zoneFilter, setZoneFilter] = useState<string>(ALL_ZONES);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>(ALL_AVAILABILITY);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [userTicketUsage, setUserTicketUsage] = useState<TicketTypeUsageMap>(new Map());
  const restoredSelectionRef = useRef(false);
  const selectionRef = useRef<ZoneSelection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  selectionRef.current = selection;

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
          setAvailabilityFilter(ALL_AVAILABILITY);
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

  useEffect(() => {
    if (!isAuthenticated) {
      setUserTicketUsage(new Map());
      return undefined;
    }

    let cancelled = false;

    fetchUserTicketUsage(concertId)
      .then((usage) => {
        if (!cancelled) setUserTicketUsage(usage);
      })
      .catch(() => {
        if (!cancelled) setUserTicketUsage(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [concertId, isAuthenticated]);

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

  const applyUpdatesAndValidateSelection = useCallback((updates: ZoneAvailabilityUpdate[]) => {
    if (updates.length === 0) return;

    setData((prev) => (prev ? applyZoneAvailabilityUpdates(prev, updates) : prev));

    const currentSelection = selectionRef.current;
    if (!currentSelection) return;

    const current = updates.find(
      (update) =>
        update.ticketTypeId === currentSelection.ticketTypeId &&
        update.zoneId === currentSelection.zoneId,
    );
    if (!current) return;

    if (current.status === 'SOLD_OUT' || current.availableCount < currentSelection.quantity) {
      setSelection(null);
      setAvailabilityNotice(
        current.status === 'SOLD_OUT'
          ? 'Khu vực này vừa hết chỗ. Vui lòng chọn khu vực khác.'
          : 'Số vé còn lại đã thay đổi. Vui lòng kiểm tra lại số lượng.',
      );
    }
  }, []);

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
      if (availabilityFilter !== ALL_AVAILABILITY && zone.status !== availabilityFilter) {
        return false;
      }
      return true;
    });
  }, [zones, ticketTypeFilter, zoneFilter, availabilityFilter]);

  const zoneOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const { zone } of zones) {
      seen.set(zone.zoneId, zone.zoneName);
    }
    return Array.from(seen.entries()).map(([zoneId, zoneName]) => ({ zoneId, zoneName }));
  }, [zones]);

  const ticketTypeSummaries = useMemo(() => {
    if (!data) return [];
    return data.ticketTypes.map((ticketType) => ({
      id: ticketType.id,
      name: ticketType.name,
      availableTotal: ticketType.zones.reduce((sum, zone) => sum + zone.availableCount, 0),
      price: ticketType.price,
      maxPerUser: ticketType.maxPerUser,
    }));
  }, [data]);

  const pollAvailability = useCallback(async () => {
    if (!data) return;

    setIsRefreshingAvailability(true);
    try {
      const res = await fetch(`/api/concerts/${concertId}/seatmap/availability`);
      const json = (await res.json()) as ZoneAvailabilityResponse;
      if (!res.ok || !json.success || !json.data) return;

      applyUpdatesAndValidateSelection(json.data.updates);
    } catch {
      // Polling thất bại âm thầm — spec cho phép retry ở lần poll sau
    } finally {
      setIsRefreshingAvailability(false);
    }
  }, [concertId, data, applyUpdatesAndValidateSelection]);

  useEffect(() => {
    if (!data) return undefined;

    const interval = setInterval(() => {
      void pollAvailability();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [data, pollAvailability]);

  useEffect(() => {
    if (!data || source !== 'backend') {
      setIsLiveConnected(false);
      return undefined;
    }

    const backendConcertId = resolveBackendConcertId(concertId);
    const socket = connectSeatmapSocket(backendConcertId, {
      onZoneUpdate: (updates) => {
        const mapped = mapSocketZoneUpdates(updates).map((update) => ({
          ...update,
          updatedAt: updates.find(
            (item) =>
              item.ticketTypeId === update.ticketTypeId && item.zoneId === update.zoneId,
          )?.timestamp ?? new Date().toISOString(),
        }));
        applyUpdatesAndValidateSelection(mapped);
      },
      onConnect: () => setIsLiveConnected(true),
      onDisconnect: () => setIsLiveConnected(false),
    });

    socketRef.current = socket;

    return () => {
      disconnectSeatmapSocket(socket, backendConcertId);
      socketRef.current = null;
      setIsLiveConnected(false);
    };
  }, [applyUpdatesAndValidateSelection, concertId, data, source]);

  const getRemainingAllowance = useCallback(
    (ticketTypeId: string, maxPerUser: number) => {
      if (!isAuthenticated) return maxPerUser;
      return remainingTicketAllowance(ticketTypeId, maxPerUser, userTicketUsage);
    },
    [isAuthenticated, userTicketUsage],
  );

  const selectZone = useCallback(
    (ticketTypeId: string, zoneId: string) => {
      const entry = zoneLookup.get(`${ticketTypeId}:${zoneId}`);
      if (!entry) return;

      const { ticketType, zone } = entry;
      if (zone.status === 'SOLD_OUT') {
        setLimitWarning('Khu vực này đã hết vé');
        return;
      }

      const allowance = getRemainingAllowance(ticketType.id, ticketType.maxPerUser);
      if (allowance <= 0) {
        setLimitWarning(
          `Bạn đã đạt giới hạn ${ticketType.maxPerUser} vé ${ticketType.name} cho sự kiện này`,
        );
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
    [zoneLookup, selection, getRemainingAllowance],
  );

  const setQuantity = useCallback(
    (quantity: number) => {
      if (!selection) return;

      const entry = zoneLookup.get(`${selection.ticketTypeId}:${selection.zoneId}`);
      if (!entry) return;

      const { ticketType, zone } = entry;
      const allowance = getRemainingAllowance(ticketType.id, ticketType.maxPerUser);
      const cap = Math.min(zone.availableCount, ticketType.maxPerUser, allowance);
      const nextQuantity = Math.max(1, Math.min(quantity, cap));

      if (allowance <= 0) {
        setLimitWarning(
          `Bạn đã đạt giới hạn ${ticketType.maxPerUser} vé ${ticketType.name} cho sự kiện này`,
        );
        return;
      }

      if (nextQuantity > allowance) {
        setLimitWarning(`Bạn chỉ còn được mua thêm ${allowance} vé ${ticketType.name}`);
        return;
      }

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
    [selection, zoneLookup, getRemainingAllowance],
  );

  const isZoneSelected = useCallback(
    (ticketTypeId: string, zoneId: string) =>
      selection?.ticketTypeId === ticketTypeId && selection.zoneId === zoneId,
    [selection],
  );

  const selectedEntry = useMemo(() => {
    if (!selection) return null;
    return zoneLookup.get(`${selection.ticketTypeId}:${selection.zoneId}`) ?? null;
  }, [selection, zoneLookup]);

  const maxQuantityForSelection = useMemo(() => {
    if (!selection || !selectedEntry) return 1;
    const allowance = getRemainingAllowance(
      selectedEntry.ticketType.id,
      selectedEntry.ticketType.maxPerUser,
    );
    return Math.min(selectedEntry.zone.availableCount, selectedEntry.ticketType.maxPerUser, allowance);
  }, [selection, selectedEntry, getRemainingAllowance]);

  const remainingAllowanceForSelection = useMemo(() => {
    if (!selection || !selectedEntry) return undefined;
    return getRemainingAllowance(selectedEntry.ticketType.id, selectedEntry.ticketType.maxPerUser);
  }, [selection, selectedEntry, getRemainingAllowance]);

  return {
    data,
    loading,
    error,
    source,
    backendError,
    warning,
    availabilityNotice,
    isRefreshingAvailability,
    isLiveConnected,
    selectionState,
    selectedEntry,
    maxQuantityForSelection,
    remainingAllowanceForSelection,
    ticketTypeSummaries,
    ticketTypeFilter,
    setTicketTypeFilter,
    zoneFilter,
    setZoneFilter,
    availabilityFilter,
    setAvailabilityFilter,
    limitWarning,
    filteredZones,
    zoneOptions,
    selectZone,
    setQuantity,
    isZoneSelected,
    refreshAvailability: pollAvailability,
  };
}

export type { ZoneStatus };
