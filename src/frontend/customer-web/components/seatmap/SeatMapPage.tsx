'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_TICKET_TYPES, useSeatMap } from '@/hooks/useSeatMap';
import { readAdmittedToken } from '@/lib/waiting-room-storage';
import CustomerHeader from '@/components/layout/CustomerHeader';
import SeatFilters from './SeatFilters';
import InteractiveSeatMap from './InteractiveSeatMap';
import TextSeatFallback from './TextSeatFallback';
import SeatLegend from './SeatLegend';
import SeatSummaryBar from './SeatSummaryBar';
import { formatVnd } from '@/lib/format';

interface SeatMapPageProps {
  concertId: string;
}

export default function SeatMapPage({ concertId }: SeatMapPageProps) {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    const token = readAdmittedToken(concertId);
    if (!token) {
      router.replace(`/concerts/${concertId}/waiting`);
      return;
    }
    setAccessChecked(true);
  }, [concertId, router]);

  const {
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
  } = useSeatMap({ concertId });

  const [showFallback, setShowFallback] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady && !loading) setShowFallback(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [mapReady, loading]);

  useEffect(() => {
    if (data && !loading) {
      const t = setTimeout(() => setMapReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [data, loading]);

  const handleProceed = () => {
    if (selection.selectedSeats.length === 0) return;
    sessionStorage.setItem(
      `seat-selection:${concertId}`,
      JSON.stringify(selection.selectedSeats),
    );
    alert(
      `Đã lưu ${selection.selectedSeats.length} ghế vào phiên.\n(Tích hợp checkout sẽ được thêm sau)`,
    );
  };

  if (!accessChecked) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-slate-600">Đang xác minh quyền truy cập...</p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-slate-600">Đang tải sơ đồ ghế...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error ?? 'Không tải được dữ liệu'}</p>
          </div>
        </main>
      </div>
    );
  }

  const isAllTicketTypes = activeTicketTypeId === ALL_TICKET_TYPES;
  const activeTicketType = isAllTicketTypes
    ? null
    : data.ticketTypes.find((tt) => tt.id === activeTicketTypeId);
  const availableTotal = data.ticketTypes.reduce(
    (sum, tt) => sum + tt.seatRegions.reduce((s, r) => s + r.availableCount, 0),
    0,
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={data.concertName} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-32 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Chọn ghế</h1>
          <p className="mt-1 text-slate-600">{data.concertName}</p>
          <p className="mt-2 text-sm text-slate-500">
            Còn {availableTotal} ghế trống
            {isAllTicketTypes ? (
              <> · Hiển thị VIP, Standard, Economy</>
            ) : (
              activeTicketType && (
                <>
                  {' '}
                  · {activeTicketType.name}: tối đa {activeTicketType.maxPerUser} ghế/người (
                  {formatVnd(activeTicketType.price)}/ghế)
                </>
              )
            )}
          </p>
        </div>

        <div className="mb-4">
          <SeatFilters
            ticketTypes={data.ticketTypes}
            activeTicketTypeId={activeTicketTypeId}
            onTicketTypeChange={setActiveTicketTypeId}
            regions={regions}
            regionFilter={regionFilter}
            onRegionChange={setRegionFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {limitWarning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {limitWarning}
          </div>
        )}

        {showFallback && !mapReady && (
          <div className="mb-4">
            <TextSeatFallback
              data={data}
              seats={filteredSeats}
              isSelected={isSelected}
              onToggleSeat={toggleSeat}
              onRetry={() => {
                setShowFallback(false);
                setMapReady(true);
              }}
            />
          </div>
        )}

        <div className={showFallback && !mapReady ? 'hidden' : 'mb-4'}>
          <InteractiveSeatMap
            data={data}
            seats={filteredSeats}
            isSelected={isSelected}
            onToggleSeat={toggleSeat}
            hoveredSeat={hoveredSeat}
            onHoverSeat={setHoveredSeat}
          />
        </div>

        <SeatLegend />
      </main>

      <SeatSummaryBar selection={selection} onProceed={handleProceed} />
    </div>
  );
}
