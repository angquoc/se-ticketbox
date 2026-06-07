import type { SelectedSeat } from '@/types/seatmap';
import type { TicketTypeAvailability } from '@/types/order';

const MOCK_TICKET_TYPE_NAMES: Record<string, string> = {
  'tt-vip': 'VIP',
  'tt-standard': 'Standard',
  'tt-economy': 'Economy',
};

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
): Array<{ mockTicketTypeId: string; quantity: number }> {
  const counts = new Map<string, number>();
  for (const seat of seats) {
    counts.set(seat.ticketTypeId, (counts.get(seat.ticketTypeId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([mockTicketTypeId, quantity]) => ({
    mockTicketTypeId,
    quantity,
  }));
}

export function mapToBackendOrderItems(
  groupedSeats: Array<{ mockTicketTypeId: string; quantity: number }>,
  backendTicketTypes: TicketTypeAvailability[],
): Array<{ ticketTypeId: string; quantity: number }> {
  const byName = new Map(
    backendTicketTypes.map((ticketType) => [ticketType.name.toLowerCase(), ticketType]),
  );

  return groupedSeats.map(({ mockTicketTypeId, quantity }) => {
    const label = MOCK_TICKET_TYPE_NAMES[mockTicketTypeId] ?? mockTicketTypeId;
    const ticketType =
      byName.get(label.toLowerCase()) ??
      backendTicketTypes.find((item) => item.id === mockTicketTypeId);

    if (!ticketType) {
      throw new Error(
        `Không tìm thấy loại vé "${label}" trên backend. Cấu hình BACKEND_CONCERT_MAP và dữ liệu concert cho khớp.`,
      );
    }

    return {
      ticketTypeId: ticketType.id,
      quantity,
    };
  });
}
