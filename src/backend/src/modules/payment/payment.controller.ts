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

  @Post('mock-callback')
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
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cổng thanh toán giả lập (Mock Gateway)</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --bg-primary: #f8fafc;
              --bg-card: #ffffff;
              --text-primary: #0f172a;
              --text-secondary: #475569;
              --color-success: #059669;
              --color-success-hover: #047857;
              --color-danger: #e11d48;
              --color-danger-hover: #be123c;
              --color-warning: #d97706;
              --color-warning-hover: #b45309;
              --border-color: #e2e8f0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: var(--bg-primary);
              color: var(--text-primary);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .card {
              background-color: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 16px;
              padding: 40px;
              width: 100%;
              max-width: 480px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 32px;
            }
            .logo-icon {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
              border-radius: 12px;
              margin: 0 auto 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              color: white;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.5px;
              color: var(--text-primary);
            }
            .subtitle {
              font-size: 14px;
              color: var(--text-secondary);
              margin-top: 4px;
            }
            .info-section {
              background-color: #f1f5f9;
              border: 1px solid var(--border-color);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 32px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .info-label {
              font-size: 13px;
              color: var(--text-secondary);
              font-weight: 500;
            }
            .info-value {
              font-size: 14px;
              font-weight: 600;
              color: var(--text-primary);
            }
            .info-value.amount {
              font-size: 18px;
              font-weight: 700;
              color: #4f46e5;
            }
            .button-group {
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin-bottom: 24px;
            }
            .btn {
              width: 100%;
              padding: 16px;
              border: none;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              color: white;
            }
            .btn:active {
              transform: scale(0.98);
            }
            .btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              transform: none;
            }
            .btn-success {
              background-color: var(--color-success);
            }
            .btn-success:hover {
              background-color: var(--color-success-hover);
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
            }
            .btn-danger {
              background-color: var(--color-danger);
            }
            .btn-danger:hover {
              background-color: var(--color-danger-hover);
              box-shadow: 0 4px 12px rgba(225, 29, 72, 0.15);
            }
            .btn-warning {
              background-color: var(--color-warning);
            }
            .btn-warning:hover {
              background-color: var(--color-warning-hover);
              box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15);
            }
            .result-container {
              border-radius: 12px;
              font-size: 14px;
              max-height: 0;
              overflow: hidden;
              transition: all 0.3s ease;
              text-align: center;
            }
            .result-container.active {
              max-height: 120px;
              padding: 16px;
              margin-top: 16px;
              border: 1px solid var(--border-color);
              background-color: #f8fafc;
            }
            .spinner {
              width: 20px;
              height: 20px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 0.8s linear infinite;
              display: none;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo-icon">💸</div>
              <h1 class="title">Mock Payment Gateway</h1>
              <p class="subtitle">Hệ thống mô phỏng giao dịch thanh toán</p>
            </div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Mã đơn hàng</span>
                <span class="info-value" id="order-id-label">${orderId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Số tiền giao dịch</span>
                <span class="info-value amount">${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} VND</span>
              </div>
            </div>

            <div class="button-group">
              <button class="btn btn-success" id="btn-success" onclick="sendWebhook('SUCCESS', '${successSignature}')">
                <span class="spinner" id="spinner-success"></span>
                <span>Thanh toán thành công</span>
              </button>

              <button class="btn btn-danger" id="btn-danger" onclick="sendWebhook('FAILED', '${failedSignature}')">
                <span class="spinner" id="spinner-danger"></span>
                <span>Thanh toán thất bại</span>
              </button>

              <button class="btn btn-warning" id="btn-warning" onclick="sendWebhook('TIMEOUT', '${timeoutSignature}')">
                <span class="spinner" id="spinner-warning"></span>
                <span>Giả lập timeout</span>
              </button>
            </div>

            <div class="result-container" id="result-box">
              <div id="result-text" style="font-weight: 600; margin-bottom: 8px;"></div>
              <div id="result-desc" style="color: var(--text-secondary); font-size: 13px;">Bạn có thể đóng tab này sau khi hoàn tất.</div>
            </div>
          </div>

          <script>
            async function sendWebhook(result, signature) {
              const btnSuccess = document.getElementById('btn-success');
              const btnDanger = document.getElementById('btn-danger');
              const btnWarning = document.getElementById('btn-warning');
              
              btnSuccess.disabled = true;
              btnDanger.disabled = true;
              btnWarning.disabled = true;

              let activeSpinnerId = '';
              if (result === 'SUCCESS') activeSpinnerId = 'spinner-success';
              else if (result === 'FAILED') activeSpinnerId = 'spinner-danger';
              else if (result === 'TIMEOUT') activeSpinnerId = 'spinner-warning';
              
              if (activeSpinnerId) {
                document.getElementById(activeSpinnerId).style.display = 'inline-block';
              }

              try {
                const response = await fetch('/payments/mock-callback', {
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

                const respText = await response.text();
                
                const resultBox = document.getElementById('result-box');
                const resultText = document.getElementById('result-text');
                
                resultBox.classList.add('active');
                
                if (response.ok) {
                  resultText.style.color = result === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-danger)';
                  if (result === 'SUCCESS') {
                    resultText.innerText = 'Giao dịch thành công!';
                  } else if (result === 'FAILED') {
                    resultText.innerText = 'Giao dịch đã thất bại!';
                  } else {
                    resultText.innerText = 'Giả lập timeout thành công!';
                  }
                } else {
                  resultText.style.color = 'var(--color-danger)';
                  resultText.innerText = 'Gửi callback lỗi: ' + respText;
                }
              } catch (err) {
                const resultBox = document.getElementById('result-box');
                const resultText = document.getElementById('result-text');
                resultBox.classList.add('active');
                resultText.style.color = 'var(--color-danger)';
                resultText.innerText = 'Lỗi kết nối: ' + err.message;
              } finally {
                if (activeSpinnerId) {
                  document.getElementById(activeSpinnerId).style.display = 'none';
                }
              }
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
