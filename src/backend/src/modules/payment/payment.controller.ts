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
              --bg-primary: #0b0f19;
              --bg-card: #161c2a;
              --text-primary: #f3f4f6;
              --text-secondary: #9ca3af;
              --color-success: #10b981;
              --color-success-hover: #059669;
              --color-danger: #f43f5e;
              --color-danger-hover: #e11d48;
              --color-warning: #f59e0b;
              --color-warning-hover: #d97706;
              --border-color: #243049;
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
              background-image: 
                radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(244, 63, 94, 0.1) 0%, transparent 45%);
            }
            .card {
              background-color: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 24px;
              padding: 40px;
              width: 100%;
              max-width: 480px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
              backdrop-filter: blur(10px);
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .header {
              text-align: center;
              margin-bottom: 32px;
            }
            .logo-icon {
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
              border-radius: 16px;
              margin: 0 auto 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: 700;
              color: white;
              box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.5px;
              background: linear-gradient(to right, #f3f4f6, #d1d5db);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .subtitle {
              font-size: 14px;
              color: var(--text-secondary);
              margin-top: 4px;
            }
            .info-section {
              background-color: rgba(36, 48, 73, 0.4);
              border: 1px solid var(--border-color);
              border-radius: 16px;
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
              color: #818cf8;
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
              border-radius: 14px;
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
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
            }
            .btn-danger {
              background-color: var(--color-danger);
            }
            .btn-danger:hover {
              background-color: var(--color-danger-hover);
              box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2);
            }
            .btn-warning {
              background-color: #374151;
              color: #d1d5db;
              border: 1px solid var(--border-color);
            }
            .btn-warning:hover {
              background-color: #4b5563;
              color: white;
            }
            .result-container {
              border-radius: 14px;
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
              background-color: rgba(17, 24, 39, 0.6);
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
