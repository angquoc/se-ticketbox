import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export enum MockPaymentResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

export class MockWebhookDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  providerTransactionId!: string;

  @IsEnum(MockPaymentResult)
  result!: MockPaymentResult;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  signature!: string;
}
