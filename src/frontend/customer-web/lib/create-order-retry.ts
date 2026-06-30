import { isClientApiError } from '@/lib/api-error';
import { orderApi } from '@/lib/api-client';
import type { CreateOrderResponse } from '@/types/order';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CreateOrderPayload {
  concertId: string;
  items: Array<{ ticketTypeId: string; quantity: number }>;
}

const MAX_PROCESSING_RETRIES = 15;
const PROCESSING_RETRY_DELAY_MS = 2000;

export async function createOrderWithIdempotencyRetry(
  payload: CreateOrderPayload,
  idempotencyKey: string,
): Promise<CreateOrderResponse> {
  for (let attempt = 0; attempt < MAX_PROCESSING_RETRIES; attempt++) {
    try {
      return await orderApi.create(payload, idempotencyKey);
    } catch (error) {
      if (isClientApiError(error) && error.status === 409) {
        await sleep(PROCESSING_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Đơn hàng đang được xử lý. Vui lòng thử lại sau vài giây.');
}
