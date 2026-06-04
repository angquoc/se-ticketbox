import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockWebhookDto, MockPaymentResult } from './dto/mock-webhook.dto';
import { MockPaymentService } from './mock-payment.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly mockPaymentService: MockPaymentService,
  ) {}

  @Post('create')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto.orderId);
  }

  @Get(':orderId/status')
  getStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  @Get('system/circuit-breaker')
  getCircuitBreakerStatus() {
    return this.paymentService.getCircuitBreakerStatus();
  }

  @Post('webhook/mock')
  handleMockWebhook(@Body() dto: MockWebhookDto) {
    return this.paymentService.handleMockWebhook(dto);
  }

  @Get('mock-page')
  mockPaymentPage(
    @Query('orderId') orderId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    const providerTransactionId =
      this.mockPaymentService.generateProviderTransactionId(orderId);

    const successPayload = `${orderId}:${providerTransactionId}:${MockPaymentResult.SUCCESS}:${amount}`;
    const failedPayload = `${orderId}:${providerTransactionId}:${MockPaymentResult.FAILED}:${amount}`;

    const successSignature =
      this.mockPaymentService.signPayload(successPayload);
    const failedSignature = this.mockPaymentService.signPayload(failedPayload);

    res.send(`
      <html>
        <head>
          <title>Mock Payment Gateway</title>
          <style>
            body { font-family: Arial; padding: 40px; }
            button { padding: 12px 20px; margin-right: 12px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Mock Payment Gateway</h1>
          <p>Order ID: ${orderId}</p>
          <p>Amount: ${amount} VND</p>

          <button onclick="paySuccess()">Thanh toán thành công</button>
          <button onclick="payFailed()">Thanh toán thất bại</button>

          <pre id="result"></pre>

          <script>
            async function paySuccess() {
              const res = await fetch('/payments/webhook/mock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: '${orderId}',
                  providerTransactionId: '${providerTransactionId}',
                  result: 'SUCCESS',
                  amount: Number('${amount}'),
                  signature: '${successSignature}'
                })
              });

              document.getElementById('result').innerText = await res.text();
            }

            async function payFailed() {
              const res = await fetch('/payments/webhook/mock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: '${orderId}',
                  providerTransactionId: '${providerTransactionId}',
                  result: 'FAILED',
                  amount: Number('${amount}'),
                  signature: '${failedSignature}'
                })
              });

              document.getElementById('result').innerText = await res.text();
            }
          </script>
        </body>
      </html>
    `);
  }
}