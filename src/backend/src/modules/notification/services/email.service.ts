import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface QrPayload {
  ticketId: string;
  rawToken: string;
  qrTokenHash: string;
  qrSignature: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
    });
  }

  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    concertTitle: string;
    ticketCount: number;
    totalAmount: number;
    qrPayloads?: QrPayload[];
  }): Promise<void> {
    const ticketsHtml = (params.qrPayloads ?? [])
      .map(
        (qr, index) => `
      <div class="ticket-item">
        <div class="label">Ticket #${index + 1} ID</div>
        <div class="value" style="font-size:12px; word-break:break-all;">${qr.ticketId}</div>
        <div class="label" style="margin-top:8px;">QR Token</div>
        <div class="value" style="font-size:12px; word-break:break-all; font-family:monospace;">${qr.rawToken}</div>
      </div>
    `,
      )
      .join(
        '<hr style="border:none;border-top:1px solid #e0e0e0;margin:12px 0;"/>',
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
    .ticket-card { background: #f0f7ff; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .ticket-item { margin-bottom: 8px; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; font-weight: bold; color: #1a1a1a; }
    .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your Tickets Are Confirmed!</h1>
    <p>Thank you for your purchase. Here are your order details:</p>

    <div class="ticket-card">
      <div class="label">Order ID</div>
      <div class="value">${params.orderId}</div>
    </div>

    <div class="ticket-card">
      <div class="label">Event</div>
      <div class="value">${params.concertTitle}</div>
    </div>

    <div class="ticket-card">
      <div class="label">Number of Tickets</div>
      <div class="value">${params.ticketCount}</div>
    </div>

    <div class="ticket-card">
      <div class="label">Total Paid</div>
      <div class="value">${params.totalAmount.toLocaleString('vi-VN')} VND</div>
    </div>

    ${
      ticketsHtml
        ? `
    <div class="ticket-card">
      <div class="label" style="margin-bottom:8px;">Your E-Tickets</div>
      ${ticketsHtml}
    </div>
    `
        : ''
    }

    <p>Present the QR code on your mobile device at the venue entrance.</p>

    <div class="footer">
      <p>TicketBox — Your event ticketing platform</p>
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
}
