import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MockPaymentService {
  constructor(private readonly configService: ConfigService) {}

  createPaymentUrl(orderId: string, amount: number) {
    const baseUrl = this.configService.get<string>('BACKEND_BASE_URL');

    return `${baseUrl}/payments/mock-page?orderId=${orderId}&amount=${amount}`;
  }

  signPayload(payload: string) {
    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string) {
    const expected = this.signPayload(payload);

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }

  generateProviderTransactionId(orderId: string) {
    return `MOCK_${orderId}_${Date.now()}`;
  }
}