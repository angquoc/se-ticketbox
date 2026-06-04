import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentResult, MockWebhookDto } from './dto/mock-webhook.dto';
import { MockGatewayService } from './services/mock-gateway.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly mockGateway: MockGatewayService,
  ) {}

  @Post('create')
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    /**
     * Nếu AuthGuard đã có, userId nên lấy từ req.user.sub.
     * Tạm thời nếu chưa gắn guard, em thay bằng userId test.
     */
    const userId = req.user?.sub || req.user?.id || 'dev-user-id';

    return this.paymentService.createPayment({
      userId,
      idempotencyKey,
      orderId: dto.orderId,
    });
  }

  @Post('webhook/mock')
  handleMockWebhook(@Body() dto: MockWebhookDto) {
    return this.paymentService.handleMockWebhook(dto);
  }

  @Get(':orderId/status')
  getStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
  }

  @Get('system/circuit-breaker')
  getCircuitBreakerStatus() {
    return this.paymentService.getCircuitBreakerStatus();
  }

  @Get('mock-page')
  mockPage(
    @Query('orderId') orderId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    const providerTransactionId =
      this.mockGateway.generateProviderTransactionId(orderId);

    const successPayload = `${orderId}:${providerTransactionId}:${MockPaymentResult.SUCCESS}:${amount}`;
    const failedPayload = `${orderId}:${providerTransactionId}:${MockPaymentResult.FAILED}:${amount}`;
    const timeoutPayload = `${orderId}:${providerTransactionId}:${MockPaymentResult.TIMEOUT}:${amount}`;

    const successSignature = this.mockGateway.createSignature(successPayload);
    const failedSignature = this.mockGateway.createSignature(failedPayload);
    const timeoutSignature = this.mockGateway.createSignature(timeoutPayload);

    res.send(`
      <html>
        <head>
          <title>Mock Payment</title>
          <style>
            body { font-family: Arial; padding: 40px; }
            button { padding: 12px 16px; margin-right: 8px; cursor: pointer; }
            pre { background: #f3f3f3; padding: 16px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Mock Payment Gateway</h1>
          <p><b>Order:</b> ${orderId}</p>
          <p><b>Amount:</b> ${amount} VND</p>

          <button onclick="sendWebhook('SUCCESS', '${successSignature}')">
            Thanh toán thành công
          </button>

          <button onclick="sendWebhook('FAILED', '${failedSignature}')">
            Thanh toán thất bại
          </button>

          <button onclick="sendWebhook('TIMEOUT', '${timeoutSignature}')">
            Giả lập timeout
          </button>

          <pre id="result"></pre>

          <script>
            async function sendWebhook(result, signature) {
              const response = await fetch('/payments/webhook/mock', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  orderId: '${orderId}',
                  providerTransactionId: '${providerTransactionId}',
                  result,
                  amount: Number('${amount}'),
                  signature
                })
              });

              document.getElementById('result').innerText =
                await response.text();
            }
          </script>
        </body>
      </html>
    `);
  }
}