import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class CircuitBreakerService {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private openedAt: number | null = null;

  private readonly failureThreshold = 5;
  private readonly successThreshold = 3;
  private readonly openDurationMs = 30_000;

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      openedAt: this.openedAt,
    };
  }

  beforeRequest() {
    if (this.state === 'OPEN') {
      const now = Date.now();

      if (this.openedAt && now - this.openedAt >= this.openDurationMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        return;
      }

      throw new ServiceUnavailableException(
        'Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau',
      );
    }
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount += 1;

      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.openedAt = null;
      }

      return;
    }

    this.failureCount = 0;
  }

  recordFailure() {
    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      this.successCount = 0;
    }
  }
}