export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface SeatRegion {
  regionId: string;
  regionName: string;
  seatCount: number;
  availableCount: number;
  reservedCount: number;
  soldCount: number;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  seatRegions: SeatRegion[];
  maxPerUser: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
}

export interface SeatCoords {
  x: number;
  y: number;
}

export interface Seat {
  seatNumber: string;
  regionId: string;
  ticketTypeId: string;
  row: string;
  column: number;
  status: SeatStatus;
  coords: SeatCoords;
}

export interface SeatMapData {
  concertId: string;
  concertName: string;
  seatMapUrl: string;
  ticketTypes: TicketType[];
  seats: Seat[];
}

export interface SelectedSeat {
  ticketTypeId: string;
  regionId: string;
  seatNumber: string;
  price: number;
  row: string;
  column: number;
}

export interface SeatSelectionState {
  selectedSeats: SelectedSeat[];
  totalPrice: number;
  ticketTypeCount: Record<string, number>;
}
