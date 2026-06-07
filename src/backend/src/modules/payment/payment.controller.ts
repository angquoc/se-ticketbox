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
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentResult, MockWebhookDto } from './dto/mock-webhook.dto';
import { MockGatewayService } from './services/mock-gateway.service';
import type { CircuitBreakerState } from './services/payment-circuit-breaker.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly mockGateway: MockGatewayService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard)
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu header Idempotency-Key');
    }

    return this.paymentService.createPayment({
      userId: req.user.sub,
      idempotencyKey,
      orderId: dto.orderId,
    });
  }

  @Post('webhook/mock')
  handleMockWebhook(@Body() dto: MockWebhookDto) {
    return this.paymentService.handleMockWebhook(dto);
  }

  @Get('system/circuit-breaker')
  getCircuitBreakerStatus(): CircuitBreakerState {
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
        <body style="font-family: Arial; padding: 40px;">
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
                headers: { 'Content-Type': 'application/json' },
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

  @Get(':orderId/status')
  @UseGuards(AuthGuard)
  getStatus(
    @Param('orderId') orderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentService.getPaymentStatus(orderId, req.user.sub);
  }
}