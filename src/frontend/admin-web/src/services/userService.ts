import { apiClient } from '@/lib/apiClient';

export interface UserListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListItem {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number; tickets: number };
}

export interface ListUsersResponse {
  users: UserListItem[];
  meta: UserListMeta;
}

export async function getUsers(page = 1, limit = 20, search?: string, role?: string): Promise<ListUsersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.append('search', search);
  if (role) params.append('role', role);

  const res = await apiClient.get<ListUsersResponse>(`/admin/users?${params.toString()}`);
  return res.data;
}
