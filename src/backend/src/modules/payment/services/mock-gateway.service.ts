import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MockGatewayService {
  constructor(private readonly config: ConfigService) {}

  async createPaymentUrl(orderId: string, amount: number) {
    const baseUrl = this.config.get<string>(
      'BACKEND_BASE_URL',
      'http://localhost:3001',
    );

    return `${baseUrl}/payments/mock-page?orderId=${orderId}&amount=${amount}`;
  }

  createSignature(payload: string) {
    const secret = this.config.get<string>(
      'PAYMENT_WEBHOOK_SECRET',
      'dev_secret',
    );

    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string) {
    const expected = this.createSignature(payload);

    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  generateProviderTransactionId(orderId: string) {
    return `MOCK_${orderId}_${Date.now()}`;
  }
}