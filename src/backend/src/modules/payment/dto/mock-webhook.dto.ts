import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum MockPaymentResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

export class MockWebhookDto {
  @IsString()
  orderId: string;

  @IsString()
  providerTransactionId: string;

  @IsEnum(MockPaymentResult)
  result: MockPaymentResult;

  @IsInt()
  amount: number;

  @IsOptional()
  @IsString()
  signature?: string;
}
