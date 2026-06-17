export type TicketType = 'VIP ALL-ACCESS' | 'GENERAL' | 'STAFF';
export type GuestStatus = 'Valid' | 'Duplicate Email' | 'Invalid Phone';

export interface Guest {
    row: number;
    name: string;
    email: string;
    phone: string;
    ticketType: TicketType;
    status: GuestStatus;
    emailError?: boolean;
    phoneError?: boolean;
}

export interface Transfer {
    id: string;
    name: string;
    progress?: number;
    complete: boolean;
}