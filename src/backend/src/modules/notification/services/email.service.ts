import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface TicketInfo {
  ticketId: string;
  ticketTypeName: string;
  concertVenue?: string;
  concertStartsAt?: Date;
  gateId?: string | null;
  status?: string;
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

    // Prefer namespaced email.* (registerAs), fall back to flat EMAIL_* env.
    // Missing host previously made nodemailer default to 127.0.0.1 (breaks in Docker).
    const host =
      this.configService.get<string>('email.host') ||
      this.configService.get<string>('EMAIL_HOST') ||
      'smtp.ethereal.email';
    const port = Number(
      this.configService.get<number | string>('email.port') ??
        this.configService.get<number | string>('EMAIL_PORT') ??
        587,
    );
    const secure =
      this.configService.get<boolean>('email.secure') === true ||
      this.configService.get<string>('EMAIL_SECURE') === 'true';
    const user =
      this.configService.get<string>('email.user') ||
      this.configService.get<string>('EMAIL_USER') ||
      '';
    const pass =
      this.configService.get<string>('email.pass') ||
      this.configService.get<string>('EMAIL_PASS') ||
      '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000, // 10s greeting timeout
      socketTimeout: 15000, // 15s socket timeout
    });

    this.logger.log(
      `SMTP transporter ready host=${host} port=${port} secure=${secure} auth=${Boolean(user && pass)}`,
    );
  }

  private getFrom(): string {
    return (
      this.configService.get<string>('email.from') ||
      this.configService.get<string>('EMAIL_FROM') ||
      '"TicketBox" <noreply@ticketbox.com>'
    );
  }

  private formatEventDate(date: Date): string {
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private statusLabel(status?: string): string {
    switch (status) {
      case 'ISSUED':
        return 'Hợp lệ';
      case 'CHECKED_IN':
        return 'Đã check-in';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return 'Hợp lệ';
    }
  }

  private statusBadgeStyle(status?: string): string {
    switch (status) {
      case 'CHECKED_IN':
        return 'background:#e0e7ff;color:#3730a3;';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'background:#f1f5f9;color:#475569;';
      case 'ISSUED':
      default:
        return 'background:#d1fae5;color:#065f46;';
    }
  }

  /** E-ticket card HTML matching customer-web ETicketCard design. */
  private renderTicketCard(
    ticket: TicketInfo,
    index: number,
    total: number,
    concertTitle: string,
  ): string {
    const shortId = ticket.ticketId.slice(0, 8).toUpperCase();
    const venue = ticket.concertVenue ?? '';
    const startsAt = ticket.concertStartsAt
      ? this.formatEventDate(ticket.concertStartsAt)
      : '';
    const gateRow = ticket.gateId
      ? `
          <tr>
            <td style="padding:0 0 12px 0;">
              <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Cổng vào (Gate)</div>
              <div style="font-size:16px;font-weight:700;color:#4338ca;">${ticket.gateId}</div>
            </td>
          </tr>`
      : '';

    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#ffffff;margin:0 0 16px 0;box-shadow:0 1px 2px rgba(15,23,42,0.06);">
      <tr>
        <td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);background-color:#4f46e5;padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#c7d2fe;">
                  E-Ticket · ${index}/${total}
                </div>
                <div style="font-size:17px;font-weight:700;color:#ffffff;line-height:1.35;margin-top:4px;">
                  ${concertTitle}
                </div>
              </td>
              <td style="vertical-align:top;text-align:right;width:1%;white-space:nowrap;padding-left:12px;">
                <span style="display:inline-block;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600;${this.statusBadgeStyle(ticket.status)}">
                  ${this.statusLabel(ticket.status)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 12px 0;">
                <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Loại vé</div>
                <div style="font-size:14px;font-weight:600;color:#0f172a;">${ticket.ticketTypeName}</div>
              </td>
            </tr>
            ${
              venue
                ? `<tr>
              <td style="padding:0 0 12px 0;">
                <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Địa điểm</div>
                <div style="font-size:14px;font-weight:500;color:#0f172a;">${venue}</div>
              </td>
            </tr>`
                : ''
            }
            ${
              startsAt
                ? `<tr>
              <td style="padding:0 0 12px 0;">
                <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Thời gian</div>
                <div style="font-size:14px;font-weight:500;color:#0f172a;">${startsAt}</div>
              </td>
            </tr>`
                : ''
            }
            ${gateRow}
            <tr>
              <td style="padding:0;">
                <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Mã vé</div>
                <div style="font-size:12px;font-family:Consolas,Monaco,monospace;color:#334155;">${shortId}</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;padding:12px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
              Mã QR chỉ hiển thị trên ứng dụng web sau khi đăng nhập.<br/>
              Xuất trình mã QR tại cổng soát vé.
            </p>
          </div>
        </td>
      </tr>
    </table>`;
  }

  async sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    concertTitle: string;
    concertVenue?: string;
    concertStartsAt?: Date;
    ticketCount: number;
    totalAmount: number;
    ticketInfos?: TicketInfo[];
  }): Promise<void> {
    const tickets = params.ticketInfos ?? [];
    const total = tickets.length || params.ticketCount;
    const ticketCardsHtml = tickets
      .map((t, index) =>
        this.renderTicketCard(t, index + 1, total, params.concertTitle),
      )
      .join('');

    const isGateUpdate = params.orderId === 'GATE-UPDATE';
    const headline = isGateUpdate
      ? 'Cổng vào vé của bạn đã được cập nhật'
      : 'Vé của bạn đã được xác nhận!';
    const intro = isGateUpdate
      ? `Cổng vào cho sự kiện <strong>${params.concertTitle}</strong> đã được điều chỉnh. Vui lòng xem lại thông tin vé bên dưới.`
      : `Cảm ơn bạn đã mua vé! Dưới đây là thông tin đơn hàng và vé điện tử của bạn.`;

    const orderSummaryHtml = isGateUpdate
      ? ''
      : `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 24px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 12px 0;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Mã đơn hàng</div>
                <div style="font-size:14px;font-weight:700;color:#0f172a;font-family:Consolas,Monaco,monospace;margin-top:2px;">${params.orderId}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 12px 0;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Sự kiện</div>
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:2px;">${params.concertTitle}</div>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="vertical-align:top;padding-right:8px;">
                      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Số vé</div>
                      <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:2px;">${params.ticketCount}</div>
                    </td>
                    <td width="50%" style="vertical-align:top;">
                      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Tổng thanh toán</div>
                      <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:2px;">${params.totalAmount.toLocaleString('vi-VN')} VND</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);background-color:#4f46e5;padding:24px 28px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c7d2fe;">TicketBox</div>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 20px 0;font-size:14px;color:#334155;line-height:1.6;">${intro}</p>

              ${orderSummaryHtml}

              ${
                ticketCardsHtml
                  ? `<div style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.04em;">Vé điện tử của bạn</div>${ticketCardsHtml}`
                  : ''
              }

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
                <tr>
                  <td style="border-radius:8px;background:#4f46e5;">
                    <a href="${this.baseUrl}/my-tickets" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Xem vé &amp; mã QR
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Mã QR chỉ có trên trang <strong style="color:#4f46e5;">Vé của tôi</strong> sau khi đăng nhập.
                Vui lòng xuất trình mã QR trên điện thoại tại cổng vào sự kiện.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#94a3b8;">TicketBox — Nền tảng bán vé sự kiện</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">Không chia sẻ email này. Mã QR gắn với tài khoản của bạn và chỉ dùng một lần.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
        to: params.to,
        subject: isGateUpdate
          ? `[TicketBox] Cổng vào đã cập nhật — ${params.concertTitle}`
          : `[TicketBox] Xác nhận vé — ${params.concertTitle}`,
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
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#dc2626;padding:24px 28px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#fecaca;">TicketBox</div>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;">Đơn hàng đã hết hạn</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#334155;line-height:1.6;">
                Đơn hàng <strong>${params.orderId}</strong> cho sự kiện <strong>${params.concertTitle}</strong>
                đã hết hạn vì thanh toán không hoàn tất trước
                <strong>${params.expiresAt.toLocaleString('vi-VN')}</strong>.
              </p>
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">
                Bạn có thể thử mua lại vé nếu còn chỗ trống.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">TicketBox — Nền tảng bán vé sự kiện</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
        to: params.to,
        subject: `[TicketBox] Đơn hàng hết hạn — ${params.concertTitle}`,
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
    const formattedDate = this.formatEventDate(params.concertStartsAt);

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);background-color:#4f46e5;padding:24px 28px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c7d2fe;">TicketBox</div>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;">Sự kiện của bạn diễn ra vào ngày mai!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 20px 0;font-size:14px;color:#334155;line-height:1.6;">
                Chúng tôi rất mong được gặp bạn tại <strong>${params.concertTitle}</strong>. Dưới đây là thông tin sự kiện:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:0 0 20px 0;">
                <tr>
                  <td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);background-color:#4f46e5;padding:16px 20px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#c7d2fe;">E-Ticket</div>
                    <div style="font-size:17px;font-weight:700;color:#ffffff;margin-top:4px;">${params.concertTitle}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <div style="margin-bottom:12px;">
                      <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Địa điểm</div>
                      <div style="font-size:14px;font-weight:500;color:#0f172a;">${params.concertVenue}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                      <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Thời gian</div>
                      <div style="font-size:14px;font-weight:500;color:#0f172a;">${formattedDate}</div>
                    </div>
                    <div>
                      <div style="font-size:12px;color:#64748b;margin-bottom:2px;">Số vé của bạn</div>
                      <div style="font-size:14px;font-weight:600;color:#0f172a;">${params.ticketCount} vé</div>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
                <tr>
                  <td style="border-radius:8px;background:#4f46e5;">
                    <a href="${this.baseUrl}/my-tickets" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Xem vé &amp; mã QR
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Vui lòng đến sớm ít nhất <strong style="color:#4f46e5;">30 phút</strong> và chuẩn bị sẵn mã QR để check-in.
                Đừng quên mang theo giấy tờ tùy thân hợp lệ.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#94a3b8;">TicketBox — Nền tảng bán vé sự kiện</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">Không chia sẻ mã QR. Mỗi mã gắn với tài khoản của bạn và chỉ dùng một lần.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
        to: params.to,
        subject: `[TicketBox] Nhắc lịch — ${params.concertTitle} diễn ra vào ngày mai`,
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
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);background-color:#4f46e5;padding:24px 28px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#c7d2fe;">TicketBox</div>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;">Khôi phục mật khẩu tài khoản</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px 0;font-size:14px;color:#334155;line-height:1.6;">Chào bạn,</p>
              <p style="margin:0 0 20px 0;font-size:14px;color:#334155;line-height:1.6;">
                Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản TicketBox của bạn.
                Dưới đây là mật khẩu mới được cấp lại:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Mật khẩu mới của bạn</div>
                    <div style="font-size:18px;font-weight:700;color:#4f46e5;letter-spacing:1px;">${params.newPassword}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#dc2626;line-height:1.6;">
                Vì lý do bảo mật, vui lòng đăng nhập và đổi lại mật khẩu ngay sau khi truy cập hệ thống.
              </p>
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">TicketBox — Nền tảng bán vé sự kiện</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.getFrom(),
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
