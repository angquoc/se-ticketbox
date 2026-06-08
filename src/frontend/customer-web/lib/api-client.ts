import { getAccessToken } from '@/lib/auth-storage';
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth';
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
  options: RequestInit & { idempotencyKey?: string } = {},
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

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.message ?? 'Yêu cầu thất bại');
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
};

export const orderApi = {
  create(payload: { concertId: string; items: Array<{ ticketTypeId: string; quantity: number }> }) {
    return clientFetch<CreateOrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getById(orderId: string) {
    return clientFetch<Order>(`/api/orders/${orderId}`);
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
  getMine(orderId?: string) {
    const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
    return clientFetch<TicketListResponse>(`/api/tickets/me${query}`);
  },
};

export const concertApi = {
  getTicketTypes(concertId: string) {
    return clientFetch<{ data: TicketTypeAvailability[]; total: number }>(
      `/api/concerts/${concertId}/ticket-types`,
    );
  },
};
