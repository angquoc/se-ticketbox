import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface TicketInfo {
  ticketId: string;
  ticketTypeName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly baseUrl: string;
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'http://localhost:3000',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000,   // 10s greeting timeout
      socketTimeout: 15000,    // 15s socket timeout
    });
  }

  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    concertTitle: string;
    ticketCount: number;
    totalAmount: number;
    ticketInfos?: TicketInfo[];
  }): Promise<void> {
    const ticketListHtml = (params.ticketInfos ?? [])
      .map(
        (t, index) => `
      <div class="ticket-item">
        <div class="ticket-number">Ticket ${index + 1}</div>
        <div class="ticket-type">${t.ticketTypeName}</div>
        <div class="ticket-id">ID: ${t.ticketId.slice(0, 8).toUpperCase()}</div>
      </div>
    `,
      )
      .join(
        '<hr style="border:none;border-top:1px solid #e0e0e0;margin:10px 0;"/>',
      );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: auto; }
    h1 { color: #1a1a1a; font-size: 24px; }
    .highlight { color: #2563eb; font-weight: bold; }
    .ticket-card { background: #f0f7ff; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .ticket-item { margin-bottom: 8px; }
    .ticket-number { color: #1a1a1a; font-size: 14px; font-weight: bold; }
    .ticket-type { color: #444; font-size: 13px; }
    .ticket-id { color: #888; font-size: 12px; font-family: monospace; }
    .cta-button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 16px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your Tickets Are Confirmed!</h1>
    <p>Thank you for your purchase! Here are your order details:</p>

    <div class="ticket-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Order ID</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.orderId}</div>
    </div>

    <div class="ticket-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Event</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.concertTitle}</div>
    </div>

    <div class="ticket-card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <div style="color:#666;font-size:12px;text-transform:uppercase;">Tickets</div>
          <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.ticketCount}</div>
        </div>
        <div>
          <div style="color:#666;font-size:12px;text-transform:uppercase;">Total Paid</div>
          <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.totalAmount.toLocaleString('vi-VN')} VND</div>
        </div>
      </div>
    </div>

    ${
      ticketListHtml
        ? `
    <div class="ticket-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;margin-bottom:8px;">Your E-Tickets</div>
      ${ticketListHtml}
    </div>
    `
        : ''
    }

    <p>
      <a class="cta-button" href="${this.baseUrl}/my-tickets">View My E-Tickets</a>
    </p>

    <p style="color:#555;font-size:13px;line-height:1.6;">
      Your QR codes are available on the <span class="highlight">My Tickets</span> page.
      Sign in to your account and present the QR code on your mobile device at the venue entrance.
    </p>

    <div class="footer">
      <p>TicketBox — Your event ticketing platform</p>
      <p style="font-size:11px;color:#bbb;">Do not share this email. Your QR codes are personal and tied to your account.</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to: params.to,
        subject: `Your tickets for ${params.concertTitle} are confirmed!`,
        html,
      });

      this.logger.log(
        `Order confirmation email sent to ${params.to} for order ${params.orderId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send order confirmation email to ${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  async sendOrderExpiredNotice(params: {
    to: string;
    orderId: string;
    concertTitle: string;
    expiresAt: Date;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: auto; }
    h1 { color: #cc3300; }
    p { color: #333; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your Order Has Expired</h1>
    <p>Your order <strong>${params.orderId}</strong> for <strong>${params.concertTitle}</strong> has expired because payment was not received before ${params.expiresAt.toLocaleString('vi-VN')}.</p>
    <p>You may try to purchase tickets again if they are still available.</p>
    <div class="footer"><p>TicketBox</p></div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to: params.to,
        subject: `Your order for ${params.concertTitle} has expired`,
        html,
      });

      this.logger.log(
        `Order expired notice sent to ${params.to} for order ${params.orderId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send expired notice to ${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  async sendConcertReminder(params: {
    to: string;
    concertTitle: string;
    concertVenue: string;
    concertStartsAt: Date;
    ticketCount: number;
  }): Promise<void> {
    const formattedDate = params.concertStartsAt.toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: auto; }
    h1 { color: #1a1a1a; font-size: 24px; }
    .highlight { color: #2563eb; font-weight: bold; }
    .info-card { background: #f0f7ff; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
    .cta-button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your event is tomorrow!</h1>
    <p>We're excited to see you at <strong>${params.concertTitle}</strong>! Here are your event details:</p>

    <div class="info-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Event</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.concertTitle}</div>
    </div>

    <div class="info-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Venue</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.concertVenue}</div>
    </div>

    <div class="info-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Date & Time</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${formattedDate}</div>
    </div>

    <div class="info-card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;">Your Tickets</div>
      <div style="font-size:16px;font-weight:bold;color:#1a1a1a;">${params.ticketCount} ticket${params.ticketCount > 1 ? 's' : ''}</div>
    </div>

    <p>
      <a class="cta-button" href="${this.baseUrl}/my-tickets">View My E-Tickets</a>
    </p>

    <p style="color:#555;font-size:13px;line-height:1.6;">
      Please arrive at least <span class="highlight">30 minutes early</span> with your QR code ready for check-in.
      Don't forget to bring a valid ID.
    </p>

    <div class="footer">
      <p>TicketBox — Your event ticketing platform</p>
      <p style="font-size:11px;color:#bbb;">Do not share your QR codes. Each QR code is tied to your account and can only be used once.</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to: params.to,
        subject: `Reminder: ${params.concertTitle} is tomorrow!`,
        html,
      });

      this.logger.log(
        `Concert reminder sent to ${params.to} for "${params.concertTitle}"`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send concert reminder to ${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  async sendForgotPasswordEmail(params: {
    to: string;
    newPassword: string;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; border-radius: 8px; padding: 32px; max-width: 600px; margin: auto; }
    h1 { color: #1a1a1a; font-size: 24px; }
    .highlight { color: #2563eb; font-weight: bold; font-size: 18px; letter-spacing: 1px; }
    .card { background: #f0f7ff; border-radius: 6px; padding: 16px; margin: 16px 0; text-align: center; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Khôi phục mật khẩu tài khoản</h1>
    <p>Chào bạn,</p>
    <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản TicketBox của bạn. Dưới đây là mật khẩu mới được cấp lại:</p>

    <div class="card">
      <div style="color:#666;font-size:12px;text-transform:uppercase;margin-bottom:8px;">Mật khẩu mới của bạn</div>
      <div class="highlight">${params.newPassword}</div>
    </div>

    <p style="color:#cc3300;font-size:13px;font-weight:bold;">Vì lý do bảo mật, vui lòng đăng nhập và đổi lại mật khẩu ngay sau khi truy cập hệ thống.</p>
    <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ.</p>

    <div class="footer">
      <p>TicketBox — Nền tảng bán vé sự kiện hàng đầu</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to: params.to,
        subject: `[TicketBox] Cấp lại mật khẩu tài khoản`,
        html,
      });

      this.logger.log(`Forgot password email sent successfully to ${params.to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send forgot password email to ${params.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
