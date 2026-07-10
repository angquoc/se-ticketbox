'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ALL_TICKET_TYPES, useSeatMap } from '@/hooks/useSeatMap';
import { usePurchaseAccess } from '@/hooks/usePurchaseAccess';
import CustomerHeader from '@/components/layout/CustomerHeader';
import PendingOrderBanner from '@/components/payment/PendingOrderBanner';
import BackendNotice from '@/components/ui/BackendNotice';
import TokenExpiryBanner from '@/components/waiting-room/TokenExpiryBanner';
import SeatFilters from './SeatFilters';
import InteractiveSeatMap from './InteractiveSeatMap';
import ZoneListFallback from './ZoneListFallback';
import ZoneDetailPanel from './ZoneDetailPanel';
import SeatLegend from './SeatLegend';
import SeatSummaryBar from './SeatSummaryBar';
import { saveZoneSelection, saveSelectedSeats } from '@/lib/checkout-storage';
import { hasPurchaseIntent, setPurchaseIntent } from '@/lib/waiting-room-intent';
import { readAdmittedToken } from '@/lib/waiting-room-storage';
import { readPendingOrder } from '@/lib/checkout-storage';
import { formatVnd } from '@/lib/format';
import { getSaleWindowInfo } from '@/lib/concert-display';
import type { ConcertStatus } from '@/types/concert';

interface SeatMapPageProps {
  concertId: string;
}

export default function SeatMapPage({ concertId }: SeatMapPageProps) {
  const router = useRouter();
  const [requireToken] = useState(
    () =>
      !readPendingOrder(concertId) &&
      (hasPurchaseIntent(concertId) || readAdmittedToken(concertId) !== null),
  );
  const { accessChecked, accessError, tokenRemainingMs } = usePurchaseAccess({
    concertId,
    requireToken,
  });

  const {
    data,
    loading,
    error,
    source,
    backendError,
    warning,
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
    availabilityNotice,
    isRefreshingAvailability,
    isLiveConnected,
    filteredZones,
    zoneOptions,
    selectZone,
    setQuantity,
    isZoneSelected,
    refreshAvailability,
  } = useSeatMap({ concertId });

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lastZoneKey, setLastZoneKey] = useState<string | null>(null);

  const saleInfo = data
    ? getSaleWindowInfo(
        (data.concertStatus as ConcertStatus) || 'DRAFT',
        data.saleStartsAt || null,
        data.saleEndsAt || null,
      )
    : { isOpen: true, reason: null };

  const selectedZoneKey = selectionState.selection
    ? `${selectionState.selection.ticketTypeId}:${selectionState.selection.zoneId}`
    : null;

  // Restore selected seats on mount / concertId change
  useEffect(() => {
    const rawSeats = sessionStorage.getItem(`selected-seats:${concertId}`);
    if (rawSeats) {
      try {
        setSelectedSeats(JSON.parse(rawSeats));
      } catch {}
    } else {
      setSelectedSeats([]);
    }
  }, [concertId]);

  // Handle selected zone change: reset selected seats and quantity if zone changes
  useEffect(() => {
    if (selectedZoneKey !== lastZoneKey) {
      setLastZoneKey(selectedZoneKey);
      if (lastZoneKey !== null) {
        setSelectedSeats([]);
        saveSelectedSeats(concertId, []);
        setQuantity(0);
      }
    }
  }, [selectedZoneKey, lastZoneKey, concertId, setQuantity]);

  const handleSelectSeat = (seatName: string) => {
    setSelectedSeats((prev) => {
      let nextSeats: string[];
      if (prev.includes(seatName)) {
        nextSeats = prev.filter((s) => s !== seatName);
      } else {
        if (prev.length >= maxQuantityForSelection) {
          return prev;
        }
        nextSeats = [...prev, seatName];
      }
      setQuantity(nextSeats.length);
      saveSelectedSeats(concertId, nextSeats);
      return nextSeats;
    });
  };

  const [showFallback, setShowFallback] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [svgLoadFailed, setSvgLoadFailed] = useState(false);
  const handleBackgroundLoaded = useCallback(() => setMapReady(true), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady && !loading) setShowFallback(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [mapReady, loading]);

  const handleProceed = () => {
    if (!selectionState.selection) return;
    setPurchaseIntent(concertId);
    saveZoneSelection(concertId, selectionState.selection);
    router.push(`/concerts/${concertId}/checkout`);
  };

  if (!accessChecked) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          {accessError ? (
            <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-700">{accessError}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <p className="mt-4 text-slate-600">Đang xác minh quyền truy cập...</p>
            </div>
          )}
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

  const isAllTicketTypes = ticketTypeFilter === ALL_TICKET_TYPES;
  const activeTicketType = isAllTicketTypes
    ? null
    : data.ticketTypes.find((tt) => tt.id === ticketTypeFilter);
  const availableTotal = data.ticketTypes.reduce(
    (sum, tt) => sum + tt.zones.reduce((s, z) => s + z.availableCount, 0),
    0,
  );
  const showTextFallback = showFallback && !mapReady || svgLoadFailed;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CustomerHeader concertName={data.concertName} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-32 sm:px-6">
        <Link
          href={`/concerts/${concertId}`}
          className="mb-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Chi tiết sự kiện
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan khu vực ghế</h1>
          <p className="mt-1 text-slate-600">{data.concertName}</p>
          {data.venueName && (
            <p className="mt-1 text-sm text-slate-500">{data.venueName}</p>
          )}
          {!saleInfo.isOpen && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
              <span className="font-bold">Chỉ xem sơ đồ:</span> Sự kiện này hiện không trong thời gian mở bán vé ({saleInfo.reason}). Sơ đồ dưới đây chỉ phục vụ xem vị trí và kiểm tra tình trạng ghế trống. Bạn không thể chọn vé hay thanh toán.
            </div>
          )}
          <div className="mt-3">
            <BackendNotice backendError={backendError} warning={warning} source={source} />
          </div>
          <div className="mt-3">
            <PendingOrderBanner concertId={concertId} />
          </div>
          <div className="mt-3">
            <TokenExpiryBanner remainingMs={tokenRemainingMs} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>Còn {availableTotal} vé trống</span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Cập nhật trực tiếp
              </span>
            )}
            {isRefreshingAvailability && (
              <span className="text-indigo-600">Đang tải lại dữ liệu…</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ticketTypeSummaries.map((summary) => (
              <span
                key={summary.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                {summary.name}: {summary.availableTotal} vé còn lại
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {isAllTicketTypes ? (
              <>Loại vé: {data.ticketTypes.map((tt) => tt.name).join(', ')}</>
            ) : (
              activeTicketType && (
                <>
                  {activeTicketType.name}: tối đa {activeTicketType.maxPerUser} vé/người (
                  {formatVnd(activeTicketType.price)}/vé)
                </>
              )
            )}
          </p>
        </div>

        <div className="mb-4">
          <SeatFilters
            ticketTypes={data.ticketTypes}
            ticketTypeFilter={ticketTypeFilter}
            onTicketTypeChange={setTicketTypeFilter}
            zones={zoneOptions}
            zoneFilter={zoneFilter}
            onZoneChange={setZoneFilter}
            availabilityFilter={availabilityFilter}
            onAvailabilityChange={setAvailabilityFilter}
          />
        </div>

        {limitWarning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {limitWarning}
          </div>
        )}

        {availabilityNotice && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {availabilityNotice}
          </div>
        )}

        {selectedEntry && selectionState.selection && (
          <ZoneDetailPanel
            ticketType={selectedEntry.ticketType}
            zone={selectedEntry.zone}
            quantity={selectionState.selection.quantity}
            maxQuantity={saleInfo.isOpen ? maxQuantityForSelection : 0}
            remainingAllowance={remainingAllowanceForSelection}
            selectedSeats={selectedSeats}
            onSelectSeat={handleSelectSeat}
            disabled={!saleInfo.isOpen}
          />
        )}

        {showTextFallback && (
          <div className="mb-4">
            <ZoneListFallback
              zones={filteredZones}
              isZoneSelected={isZoneSelected}
              onSelectZone={selectZone}
              onRetry={() => {
                setShowFallback(false);
                setSvgLoadFailed(false);
                setMapReady(false);
                void refreshAvailability();
              }}
            />
          </div>
        )}

        <div className={showTextFallback ? 'hidden' : 'mb-4'}>
          <InteractiveSeatMap
            seatMapUrl={data.seatMapUrl}
            zones={filteredZones}
            isZoneSelected={isZoneSelected}
            onSelectZone={selectZone}
            onBackgroundLoaded={handleBackgroundLoaded}
            onBackgroundError={() => {
              setSvgLoadFailed(true);
              setShowFallback(true);
            }}
          />
        </div>

        <SeatLegend />
      </main>

      <SeatSummaryBar
        selectionState={selectionState}
        maxQuantity={maxQuantityForSelection}
        disabled={!saleInfo.isOpen || !selectionState.selection || selectedSeats.length === 0}
        onQuantityChange={saleInfo.isOpen ? setQuantity : () => {}}
        onProceed={saleInfo.isOpen ? handleProceed : undefined}
      />
    </div>
  );
}
