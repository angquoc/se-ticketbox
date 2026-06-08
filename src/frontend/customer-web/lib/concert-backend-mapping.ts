import type { SelectedSeat } from '@/types/seatmap';
import type { TicketTypeAvailability } from '@/types/order';

function parseConcertMap(): Record<string, string> {
  const raw = process.env.BACKEND_CONCERT_MAP ?? process.env.NEXT_PUBLIC_BACKEND_CONCERT_MAP;
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function resolveBackendConcertId(frontendConcertId: string): string {
  const map = parseConcertMap();
  return map[frontendConcertId] ?? frontendConcertId;
}

export function groupSeatsByTicketType(
  seats: SelectedSeat[],
): Array<{ ticketTypeId: string; quantity: number }> {
  const counts = new Map<string, number>();
  for (const seat of seats) {
    counts.set(seat.ticketTypeId, (counts.get(seat.ticketTypeId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([ticketTypeId, quantity]) => ({
    ticketTypeId,
    quantity,
  }));
}

export function mapToBackendOrderItems(
  groupedSeats: Array<{ ticketTypeId: string; quantity: number }>,
  backendTicketTypes: TicketTypeAvailability[],
): Array<{ ticketTypeId: string; quantity: number }> {
  const byId = new Map(backendTicketTypes.map((ticketType) => [ticketType.id, ticketType]));
  const byName = new Map(
    backendTicketTypes.map((ticketType) => [ticketType.name.toLowerCase(), ticketType]),
  );

  return groupedSeats.map(({ ticketTypeId, quantity }) => {
    const direct = byId.get(ticketTypeId);
    if (direct) {
      return { ticketTypeId: direct.id, quantity };
    }

    const byNameDirect = byName.get(ticketTypeId.toLowerCase());
    if (byNameDirect) {
      return { ticketTypeId: byNameDirect.id, quantity };
    }

    const label = ticketTypeId;
    throw new Error(
      `Không tìm thấy loại vé "${label}" trên backend. Kiểm tra dữ liệu concert và loại vé cho khớp.`,
    );
  });
}
