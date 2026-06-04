import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import CircuitBreaker from 'opossum';

@Injectable()
export class PaymentCircuitBreakerService {
  private readonly breaker: CircuitBreaker;

  constructor() {
    this.breaker = new CircuitBreaker(
      async <T>(action: () => Promise<T>) => {
        return action();
      },
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 60000,
        rollingCountBuckets: 6,
      },
    );

    this.breaker.fallback(() => {
      throw new ServiceUnavailableException(
        'Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau',
      );
    });
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    return this.breaker.fire(action) as Promise<T>;
  }

  getStatus() {
    return {
      opened: this.breaker.opened,
      closed: this.breaker.closed,
      halfOpen: this.breaker.halfOpen,
      stats: this.breaker.stats,
    };
  }
}