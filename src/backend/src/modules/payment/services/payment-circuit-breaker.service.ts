import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import CircuitBreaker from 'opossum';

export interface CircuitBreakerState {
  opened: boolean;
  closed: boolean;
  halfOpen: boolean;
  stats: unknown;
}

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

    this.breaker.fallback((err: unknown) => {
      if (err instanceof HttpException) {
        throw err;
      }

      throw new ServiceUnavailableException(
        'Cổng thanh toán đang tạm gián đoạn, vui lòng thử lại sau',
      );
    });
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    return this.breaker.fire(action) as Promise<T>;
  }

  getStatus(): CircuitBreakerState {
    const state = this.breaker as unknown as CircuitBreakerState;
    return {
      opened: state.opened,
      closed: state.closed,
      halfOpen: state.halfOpen,
      stats: state.stats,
    };
  }
}