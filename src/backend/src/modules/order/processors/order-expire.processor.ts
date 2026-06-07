import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from '../order.service';

export const ORDER_EXPIRE_QUEUE = 'order-expire';

@Processor(ORDER_EXPIRE_QUEUE)
export class OrderExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderExpireProcessor.name);

  constructor(private readonly orderService: OrderService) {
    super();
  }

  async process(job: Job<{ orderId: string }>): Promise<void> {
    const { orderId } = job.data;

    this.logger.debug(`Processing expire job for order ${orderId}`);

    await this.orderService.expireOrder(orderId);

    this.logger.log(`Expire job completed for order ${orderId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<{ orderId: string }>, error: Error): void {
    this.logger.error(
      `Expire job failed for order ${job.data.orderId}: ${error.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<{ orderId: string }>): void {
    this.logger.debug(`Expire job completed for order ${job.data.orderId}`);
  }
}
