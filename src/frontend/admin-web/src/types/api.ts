/**
 * api.ts
 * Định nghĩa TypeScript types dùng chung cho admin-web.
 * Các type này phản ánh Response DTO từ NestJS Backend.
 */

// ── Enums ──────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'ORGANIZER' | 'STAFF' | 'ADMIN';

export type ConcertStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SALE_OPEN'
  | 'SALE_CLOSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TicketTypeStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';

export type UploadedFilePurpose =
  | 'ARTIST_PRESS_KIT'
  | 'GUEST_LIST_CSV'
  | 'COVER_IMAGE'
  | 'SEAT_MAP';

export type UploadedFileStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';

// ── Core Entities ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface TicketType {
  id: string;
  concertId: string;
  name: string;
  price: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  maxPerUser: number;
  status: TicketTypeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  concertId: string;
  uploadedById: string;
  originalName: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  purpose: UploadedFilePurpose;
  status: UploadedFileStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Concert {
  id: string;
  slug: string;
  organizerId: string;
  organizer?: Pick<User, 'id' | 'fullName' | 'email'>;
  title: string;
  description: string | null;
  artistBio: string | null;
  venue: string;
  startsAt: string;
  endsAt: string;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: ConcertStatus;
  coverImageUrl: string | null;
  seatMapUrl: string | null;
  ticketTypes?: TicketType[];
  uploadedFiles?: UploadedFile[];
  createdAt: string;
  updatedAt: string;
}

// ── Request DTOs ───────────────────────────────────────────────────────

export interface CreateConcertDto {
  title: string;
  slug: string;
  description?: string;
  venue: string;
  startsAt: string; // ISO 8601
  endsAt: string;   // ISO 8601
  saleStartsAt?: string;
  saleEndsAt?: string;
  coverImageUrl?: string;
  seatMapUrl?: string;
  status?: ConcertStatus;
}


export interface UpdateConcertDto extends Partial<CreateConcertDto> {
  status?: ConcertStatus;
  artistBio?: string;
}

export interface CreateTicketTypeDto {
  name: string;
  price: number;
  totalQty: number;
  maxPerUser: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
}


export interface UpdateTicketTypeDto extends Partial<CreateTicketTypeDto> {
  status?: TicketTypeStatus;
}

// ── Pagination ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Dashboard Stats ────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  ticketsSold: number;
  activeEvents: number;
  newUsers: number;
  revenueChange: number;  // % so với kỳ trước
  ticketsChange: number;
  eventsChange: number;
  usersChange: number;
}
