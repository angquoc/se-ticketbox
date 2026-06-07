import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type MockVerifyResult = 'SUCCESS' | 'FAILED' | 'PENDING';

@Injectable()
export class MockGatewayService {
  constructor(private readonly config: ConfigService) {}

  createPaymentUrl(orderId: string, amount: number): Promise<string> {
    const baseUrl = this.config.get<string>(
      'BACKEND_BASE_URL',
      'http://localhost:3001',
    );

    return Promise.resolve(
      `${baseUrl}/payments/mock-page?orderId=${orderId}&amount=${amount}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyTransaction(orderId: string): Promise<MockVerifyResult> {
    /**
     * Mock logic cho đồ án:
     * - Nếu đã có webhook SUCCESS/FAILED trong DB thì PaymentService đã xử lý rồi.
     * - Cron chỉ mô phỏng verify gateway khi webhook bị mất.
     * - Mặc định trả PENDING để order quá hạn bị EXPIRED.
     *
     * Có thể đổi bằng env để demo:
     * MOCK_VERIFY_RESULT=SUCCESS / FAILED / PENDING
     */
    return Promise.resolve(
      this.config.get<MockVerifyResult>('MOCK_VERIFY_RESULT') || 'PENDING',
    );
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
