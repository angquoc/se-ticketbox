import { ClientApiError } from '@/lib/api-error';
import { emitAuthUnauthorized } from '@/lib/auth-session-events';
import { getAccessToken } from '@/lib/auth-storage';
import { WAITING_ROOM_TOKEN_HEADER } from '@/lib/waiting-room-constants';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  ChangePasswordResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '@/types/auth';
import type { Concert, ConcertCardData } from '@/types/concert';
import type {
  CreateOrderResponse,
  CreatePaymentResponse,
  Order,
  PaymentStatusResponse,
  TicketTypeAvailability,
} from '@/types/order';

import type { TicketListResponse } from '@/types/ticket';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function clientFetch<T>(
  path: string,
  options: RequestInit & { idempotencyKey?: string; waitingRoomToken?: string } = {},
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }
  if (options.waitingRoomToken) {
    headers.set(WAITING_ROOM_TOKEN_HEADER, options.waitingRoomToken);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !json.success) {
    const skipSessionClear =
      path === '/api/auth/login' ||
      path === '/api/auth/register' ||
      path === '/api/auth/change-password';

    if (response.status === 401 && getAccessToken() && !skipSessionClear) {
      emitAuthUnauthorized();
    }
    throw new ClientApiError(json.message ?? 'Yêu cầu thất bại', response.status);
  }

  return json.data as T;
}

export const authApi = {
  login(payload: LoginPayload) {
    return clientFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  register(payload: RegisterPayload) {
    return clientFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMe() {
    return clientFetch<AuthUser>('/api/auth/me');
  },
  updateProfile(payload: UpdateProfilePayload) {
    return clientFetch<AuthUser>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  changePassword(payload: ChangePasswordPayload) {
    return clientFetch<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const orderApi = {
  create(
    payload: { concertId: string; items: Array<{ ticketTypeId: string; quantity: number }> },
    idempotencyKey: string,
    waitingRoomToken?: string,
  ) {
    return clientFetch<CreateOrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
      waitingRoomToken,
    });
  },
  getById(orderId: string) {
    return clientFetch<Order>(`/api/orders/${orderId}`);
  },
  listMine(params?: { page?: number; limit?: number; status?: Order['status'] }) {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.status) search.set('status', params.status);
    const query = search.toString() ? `?${search}` : '';
    return clientFetch<OrderListResponse>(`/api/orders/me${query}`);
  },
  cancel(orderId: string) {
    return clientFetch<Order>(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
};

export const paymentApi = {
  create(orderId: string, idempotencyKey: string) {
    return clientFetch<CreatePaymentResponse>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
      idempotencyKey,
    });
  },
  getStatus(orderId: string) {
    return clientFetch<PaymentStatusResponse>(`/api/payments/${orderId}/status`);
  },
};

export const ticketApi = {
  getByOrderId(orderId: string) {
    return clientFetch<TicketListResponse>(`/api/orders/${orderId}/tickets`);
  },
  getMine(params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const query = search.toString() ? `?${search}` : '';
    return clientFetch<TicketListResponse>(`/api/tickets/me${query}`);
  },
};

export const concertApi = {
  list() {
    return clientFetch<ConcertCardData[]>('/api/concerts');
  },
  getById(concertId: string) {
    return clientFetch<Concert>(`/api/concerts/${concertId}`);
  },
  getTicketTypes(concertId: string) {
    return clientFetch<{ data: TicketTypeAvailability[]; total: number }>(
      `/api/concerts/${concertId}/ticket-types`,
    );
  },
};
