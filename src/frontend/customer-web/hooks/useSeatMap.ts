'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Seat,
  SeatMapData,
  SeatSelectionState,
  SeatStatus,
  SelectedSeat,
  TicketType,
} from '@/types/seatmap';

const DEBOUNCE_MS = 250;

interface UseSeatMapOptions {
  concertId: string;
}

export function useSeatMap({ concertId }: UseSeatMapOptions) {
  const [data, setData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [activeTicketTypeId, setActiveTicketTypeId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/concerts/${concertId}/seatmap`);
        if (!res.ok) throw new Error('Không tải được sơ đồ ghế');
        const json = await res.json();
        if (!cancelled) {
          setData(json.data);
          setActiveTicketTypeId(json.data.ticketTypes[0]?.id ?? null);
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

    if (activeTicketTypeId) {
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

  const toggleSeat = useCallback(
    (seat: Seat) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (seat.status !== 'AVAILABLE') return;

        const tt = ticketTypeMap.get(seat.ticketTypeId);
        if (!tt) return;

        setSelectedSeats((prev) => {
          const exists = prev.find((s) => s.seatNumber === seat.seatNumber);
          if (exists) {
            setLimitWarning(null);
            return prev.filter((s) => s.seatNumber !== seat.seatNumber);
          }

          const currentCount = prev.filter((s) => s.ticketTypeId === seat.ticketTypeId).length;
          if (currentCount >= tt.maxPerUser) {
            setLimitWarning(`Tối đa ${tt.maxPerUser} ghế ${tt.name} mỗi người`);
            return prev;
          }

          setLimitWarning(null);
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
      }, DEBOUNCE_MS);
    },
    [ticketTypeMap],
  );

  const isSelected = useCallback(
    (seatNumber: string) => selectedSeats.some((s) => s.seatNumber === seatNumber),
    [selectedSeats],
  );

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    data,
    loading,
    error,
    selection,
    activeTicketTypeId,
    setActiveTicketTypeId,
    regionFilter,
    setRegionFilter,
    searchQuery,
    setSearchQuery,
    hoveredSeat,
    setHoveredSeat,
    limitWarning,
    filteredSeats,
    regions,
    toggleSeat,
    isSelected,
    updateSeatStatus,
  };
}
