/**
 * concertService.ts
 * Service layer cho Admin Web — quản lý Concert & TicketType.
 * Tất cả request đều đi qua apiClient (Axios instance có JWT interceptor).
 */

import { apiClient } from '@/lib/apiClient';
import type {
  Concert,
  TicketType,
  CreateConcertDto,
  UpdateConcertDto,
  CreateTicketTypeDto,
  UpdateTicketTypeDto,
  PaginatedResponse,
  UploadedFile,
  DashboardStats,
} from '@/types/api';

// ── Concert Endpoints ─────────────────────────────────────────────────

/**
 * Lấy danh sách concerts với pagination.
 */
export async function getConcerts(
  page = 1,
  limit = 10,
): Promise<PaginatedResponse<Concert>> {
  const res = await apiClient.get<PaginatedResponse<Concert>>('/concerts', {
    params: { page, limit },
  });
  return res.data;
}

/**
 * Lấy danh sách toàn bộ concerts cho admin (không phân biệt status mặc định).
 */
export async function getAdminConcerts(
  page = 1,
  limit = 10,
  status?: string,
): Promise<PaginatedResponse<Concert>> {
  const res = await apiClient.get<PaginatedResponse<Concert>>('/admin/concerts', {
    params: { page, limit, status },
  });
  return res.data;
}

/**
 * Lấy chi tiết một concert theo ID, kèm ticketTypes và uploadedFiles.
 */
export async function getConcertById(id: string): Promise<Concert> {
  const res = await apiClient.get<Concert>(`/concerts/${id}`);
  return res.data;
}

/**
 * Lấy chi tiết một concert theo ID cho admin (không phân biệt status).
 */
export async function getAdminConcertById(id: string): Promise<Concert> {
  const res = await apiClient.get<Concert>(`/admin/concerts/${id}`);
  return res.data;
}

export async function createConcert(dto: CreateConcertDto): Promise<Concert> {
  const res = await apiClient.post<Concert>('/admin/concerts', dto);
  return res.data;
}

/**
 * Cập nhật thông tin concert.
 */
export async function updateConcert(
  id: string,
  dto: UpdateConcertDto,
): Promise<Concert> {
  const res = await apiClient.patch<Concert>(`/admin/concerts/${id}`, dto);
  return res.data;
}

/**
 * Xóa concert (chỉ admin).
 */
export async function deleteConcert(id: string): Promise<void> {
  await apiClient.delete(`/admin/concerts/${id}`);
}

// ── TicketType Endpoints ──────────────────────────────────────────────

/**
 * Lấy danh sách ticket types của một concert.
 */
export async function getTicketTypes(concertId: string): Promise<TicketType[]> {
  const res = await apiClient.get<TicketType[]>(
    `/admin/concerts/${concertId}/ticket-types`,
  );
  return res.data;
}

/**
 * Tạo loại vé mới cho concert.
 */
export async function createTicketType(
  concertId: string,
  dto: CreateTicketTypeDto,
): Promise<TicketType> {
  const res = await apiClient.post<TicketType>(
    `/admin/concerts/${concertId}/ticket-types`,
    dto,
  );
  return res.data;
}

/**
 * Cập nhật loại vé (giá, số lượng, trạng thái).
 */
export async function updateTicketType(
  concertId: string,
  ticketTypeId: string,
  dto: UpdateTicketTypeDto,
): Promise<TicketType> {
  const res = await apiClient.patch<TicketType>(
    `/admin/concerts/${concertId}/ticket-types/${ticketTypeId}`,
    dto,
  );
  return res.data;
}

/**
 * Xóa loại vé (chỉ khi chưa có vé nào được bán).
 */
export async function deleteTicketType(
  concertId: string,
  ticketTypeId: string,
): Promise<void> {
  await apiClient.delete(
    `/admin/concerts/${concertId}/ticket-types/${ticketTypeId}`,
  );
}

// ── Uploaded Files Endpoints ─────────────────────────────────────────

/**
 * Lấy danh sách file đã upload của một concert.
 * Backend trả về uploadedFiles kèm trong GET /admin/concerts/:id
 */
export async function getUploadedFiles(
  concertId: string,
): Promise<UploadedFile[]> {
  const res = await apiClient.get<{ uploadedFiles?: UploadedFile[] }>(
    `/admin/concerts/${concertId}`,
  );
  return res.data.uploadedFiles ?? [];
}

/**
 * Lấy danh sách khách mời (GuestListEntry) của một concert từ DB.
 */
export async function getConcertGuests(concertId: string): Promise<any[]> {
  const res = await apiClient.get<any[]>(`/admin/concerts/${concertId}/guests`);
  return res.data;
}

export async function uploadFile(
  concertId: string,
  file: File,
  purpose: 'ARTIST_PRESS_KIT' | 'GUEST_LIST_CSV' | 'COVER_IMAGE',
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  let url = '';
  if (purpose === 'ARTIST_PRESS_KIT') {
    url = `/organizer/concerts/${concertId}/upload-pdf`;
  } else if (purpose === 'GUEST_LIST_CSV') {
    url = `/organizer/concerts/${concertId}/upload-csv`;
  } else {
    url = `/organizer/concerts/${concertId}/upload-pdf`;
  }

  const res = await apiClient.post<any>(
    url,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}


// ── Dashboard Stats ───────────────────────────────────────────────────

/**
 * Lấy thống kê tổng quan cho dashboard.
 * @param range - '7d' | '30d' | '24h'
 */
export async function getDashboardStats(
  range: '24h' | '7d' | '30d' = '30d',
): Promise<DashboardStats> {
  const res = await apiClient.get<DashboardStats>('/admin/stats', {
    params: { range },
  });
  return res.data;
}
