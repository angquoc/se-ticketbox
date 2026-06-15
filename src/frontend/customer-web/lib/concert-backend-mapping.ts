import type { ZoneSelection } from '@/types/seatmap';
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

export function mapZoneSelectionToOrderItems(
  selection: ZoneSelection,
  backendTicketTypes: TicketTypeAvailability[],
): Array<{ ticketTypeId: string; quantity: number }> {
  const byId = new Map(backendTicketTypes.map((ticketType) => [ticketType.id, ticketType]));
  const byName = new Map(
    backendTicketTypes.map((ticketType) => [ticketType.name.toLowerCase(), ticketType]),
  );

  const direct = byId.get(selection.ticketTypeId);
  if (direct) {
    return [{ ticketTypeId: direct.id, quantity: selection.quantity }];
  }

  const byNameDirect = byName.get(selection.ticketTypeName.toLowerCase());
  if (byNameDirect) {
    return [{ ticketTypeId: byNameDirect.id, quantity: selection.quantity }];
  }

  throw new Error(
    `Không tìm thấy loại vé "${selection.ticketTypeName}" trên backend. Kiểm tra dữ liệu concert và loại vé cho khớp.`,
  );
}
