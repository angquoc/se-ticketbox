'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cacheConcertName } from '@/lib/concert-names';
import { readSeatSelection, saveSeatSelection } from '@/lib/checkout-storage';
import type {
  Seat,
  SeatMapData,
  SeatSelectionState,
  SeatStatus,
  SelectedSeat,
  TicketType,
} from '@/types/seatmap';

const DEBOUNCE_MS = 250;
const POLL_INTERVAL_MS = 30_000;
const SELECTION_RATE_LIMIT = 10;
const SELECTION_RATE_WINDOW_MS = 60_000;
export const ALL_TICKET_TYPES = 'all';

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

interface SeatAvailabilityResponse {
  success: boolean;
  data?: {
    availability: Record<string, SeatStatus>;
    timestamp: string;
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
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [activeTicketTypeId, setActiveTicketTypeId] = useState<string>(ALL_TICKET_TYPES);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const lastToggleAtRef = useRef(0);
  const selectionTimestampsRef = useRef<number[]>([]);
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
          setActiveTicketTypeId(ALL_TICKET_TYPES);
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

  useEffect(() => {
    if (!data || restoredSelectionRef.current) return;

    const saved = readSeatSelection(concertId);
    if (!saved?.length) {
      restoredSelectionRef.current = true;
      return;
    }

    const seatByNumber = new Map(data.seats.map((seat) => [seat.seatNumber, seat]));
    const restored = saved.filter((selected) => {
      const seat = seatByNumber.get(selected.seatNumber);
      return seat?.status === 'AVAILABLE';
    });

    if (restored.length > 0) {
      setSelectedSeats(restored);
    }
    restoredSelectionRef.current = true;
  }, [data, concertId]);

  useEffect(() => {
    if (selectedSeats.length === 0) return;
    saveSeatSelection(concertId, selectedSeats);
  }, [selectedSeats, concertId]);

  const selection: SeatSelectionState = useMemo(() => {
    const ticketTypeCount: Record<string, number> = {};
    let totalPrice = 0;
    for (const seat of selectedSeats) {
      ticketTypeCount[seat.ticketTypeId] = (ticketTypeCount[seat.ticketTypeId] ?? 0) + 1;
      totalPrice += seat.price;
    }
    return { selectedSeats, totalPrice, ticketTypeCount };
  }, [selectedSeats]);

  const filteredSeats = useMemo(() => {
    if (!data) return [];
    let seats = data.seats;

    if (activeTicketTypeId !== ALL_TICKET_TYPES) {
      seats = seats.filter((s) => s.ticketTypeId === activeTicketTypeId);
    }
    if (regionFilter !== 'all') {
      seats = seats.filter((s) => s.regionId === regionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      seats = seats.filter((s) => s.seatNumber.toUpperCase().includes(q));
    }
    return seats;
  }, [data, activeTicketTypeId, regionFilter, searchQuery]);

  const regions = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const tt of data.ticketTypes) {
      for (const r of tt.seatRegions) {
        seen.set(r.regionId, r.regionName);
      }
    }
    return Array.from(seen.entries()).map(([regionId, regionName]) => ({
      regionId,
      regionName,
    }));
  }, [data]);

  const updateSeatStatus = useCallback((seatNumber: string, status: SeatStatus) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map((s) => (s.seatNumber === seatNumber ? { ...s, status } : s)),
      };
    });

    if (status !== 'AVAILABLE') {
      setSelectedSeats((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
    }
  }, []);

  const pollSeatAvailability = useCallback(async () => {
    if (!data) return;

    const seatNumbers = [
      ...new Set([
        ...selectedSeats.map((seat) => seat.seatNumber),
        ...data.seats.map((seat) => seat.seatNumber),
      ]),
    ].slice(0, 200);

    if (seatNumbers.length === 0) return;

    try {
      const res = await fetch(`/api/concerts/${concertId}/seat-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumbers }),
      });
      const json = (await res.json()) as SeatAvailabilityResponse;
      if (!res.ok || !json.success || !json.data) return;

      const lostSelections: string[] = [];

      for (const [seatNumber, status] of Object.entries(json.data.availability)) {
        const current = data.seats.find((seat) => seat.seatNumber === seatNumber);
        if (!current || current.status === status) continue;

        updateSeatStatus(seatNumber, status);

        if (
          selectedSeats.some((seat) => seat.seatNumber === seatNumber) &&
          status !== 'AVAILABLE'
        ) {
          lostSelections.push(seatNumber);
        }
      }

      if (lostSelections.length > 0) {
        setAvailabilityNotice(
          `Ghế ${lostSelections.join(', ')} vừa không còn trống. Vui lòng chọn ghế khác.`,
        );
      }
    } catch {
      // Polling thất bại âm thầm — spec cho phép retry ở lần poll sau
    }
  }, [concertId, data, selectedSeats, updateSeatStatus]);

  useEffect(() => {
    if (!data) return undefined;

    const interval = setInterval(() => {
      void pollSeatAvailability();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [data, pollSeatAvailability]);

  const toggleSeat = useCallback(
    (seat: Seat) => {
      const now = Date.now();
      const msSinceLast = now - lastToggleAtRef.current;
      if (msSinceLast < DEBOUNCE_MS) return;

      const tt = ticketTypeMap.get(seat.ticketTypeId);
      if (!tt) return;

      setSelectedSeats((prev) => {
        const exists = prev.find((s) => s.seatNumber === seat.seatNumber);
        if (!exists && seat.status !== 'AVAILABLE') return prev;

        if (exists) {
          lastToggleAtRef.current = now;
          setLimitWarning(null);
          setAvailabilityNotice(null);
          return prev.filter((s) => s.seatNumber !== seat.seatNumber);
        }

        selectionTimestampsRef.current = selectionTimestampsRef.current.filter(
          (timestamp) => now - timestamp < SELECTION_RATE_WINDOW_MS,
        );
        if (selectionTimestampsRef.current.length >= SELECTION_RATE_LIMIT) {
          setLimitWarning('Quá nhiều thao tác chọn ghế (tối đa 10/phút). Vui lòng chờ một lát.');
          return prev;
        }

        const currentCount = prev.filter((s) => s.ticketTypeId === seat.ticketTypeId).length;
        if (currentCount >= tt.maxPerUser) {
          setLimitWarning(`Tối đa ${tt.maxPerUser} ghế ${tt.name} mỗi người`);
          return prev;
        }

        lastToggleAtRef.current = now;
        selectionTimestampsRef.current.push(now);
        setLimitWarning(null);
        setAvailabilityNotice(null);
        return [
          ...prev,
          {
            ticketTypeId: seat.ticketTypeId,
            regionId: seat.regionId,
            seatNumber: seat.seatNumber,
            price: tt.price,
            row: seat.row,
            column: seat.column,
          },
        ];
      });
    },
    [ticketTypeMap],
  );

  const isSelected = useCallback(
    (seatNumber: string) => selectedSeats.some((s) => s.seatNumber === seatNumber),
    [selectedSeats],
  );

  const selectedSeatNumbers = useMemo(
    () => new Set(selectedSeats.map((seat) => seat.seatNumber)),
    [selectedSeats],
  );

  return {
    data,
    loading,
    error,
    source,
    backendError,
    warning,
    availabilityNotice,
    selection,
    activeTicketTypeId,
    setActiveTicketTypeId,
    regionFilter,
    setRegionFilter,
    searchQuery,
    setSearchQuery,
    selectedSeatNumbers,
    limitWarning,
    filteredSeats,
    regions,
    toggleSeat,
    isSelected,
    updateSeatStatus,
  };
}
