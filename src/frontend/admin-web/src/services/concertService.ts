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
 * Lấy chi tiết một concert theo ID, kèm ticketTypes và uploadedFiles.
 */
export async function getConcertById(id: string): Promise<Concert> {
  const res = await apiClient.get<Concert>(`/concerts/${id}`);
  return res.data;
}

/**
 * Tạo concert mới.
 */
export async function createConcert(dto: CreateConcertDto): Promise<Concert> {
  const res = await apiClient.post<Concert>('/concerts', dto);
  return res.data;
}

/**
 * Cập nhật thông tin concert.
 */
export async function updateConcert(
  id: string,
  dto: UpdateConcertDto,
): Promise<Concert> {
  const res = await apiClient.patch<Concert>(`/concerts/${id}`, dto);
  return res.data;
}

/**
 * Xóa concert (chỉ admin).
 */
export async function deleteConcert(id: string): Promise<void> {
  await apiClient.delete(`/concerts/${id}`);
}

// ── TicketType Endpoints ──────────────────────────────────────────────

/**
 * Lấy danh sách ticket types của một concert.
 */
export async function getTicketTypes(concertId: string): Promise<TicketType[]> {
  const res = await apiClient.get<TicketType[]>(
    `/concerts/${concertId}/ticket-types`,
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
    `/concerts/${concertId}/ticket-types`,
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
    `/concerts/${concertId}/ticket-types/${ticketTypeId}`,
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
    `/concerts/${concertId}/ticket-types/${ticketTypeId}`,
  );
}

// ── Uploaded Files Endpoints ─────────────────────────────────────────

/**
 * Lấy danh sách file đã upload của một concert.
 */
export async function getUploadedFiles(
  concertId: string,
): Promise<UploadedFile[]> {
  const res = await apiClient.get<UploadedFile[]>(
    `/concerts/${concertId}/files`,
  );
  return res.data;
}

/**
 * Upload file (PDF press kit hoặc CSV guest list).
 * Dùng multipart/form-data.
 */
export async function uploadFile(
  concertId: string,
  file: File,
  purpose: 'ARTIST_PRESS_KIT' | 'GUEST_LIST_CSV' | 'COVER_IMAGE',
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);

  const res = await apiClient.post<UploadedFile>(
    `/uploads/${concertId}`,
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
