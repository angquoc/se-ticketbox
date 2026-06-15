export type ZoneStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD_OUT';

export interface Zone {
  zoneId: string;
  zoneName: string;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
  status: ZoneStatus;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  zones: Zone[];
  maxPerUser: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
}

export interface SeatMapData {
  concertId: string;
  concertName: string;
  venueName?: string;
  seatMapUrl: string;
  ticketTypes: TicketType[];
}

export interface ZoneSelection {
  ticketTypeId: string;
  zoneId: string;
  ticketTypeName: string;
  zoneName: string;
  quantity: number;
  unitPrice: number;
}

export interface ZoneSelectionState {
  selection: ZoneSelection | null;
  totalPrice: number;
}

export interface ZoneAvailabilityUpdate {
  ticketTypeId: string;
  zoneId: string;
  status: ZoneStatus;
  availableCount: number;
  reservedCount?: number;
  soldCount?: number;
  updatedAt: string;
}
