import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
}));

export const emailConfig = registerAs('email', () => ({
  host: process.env.EMAIL_HOST ?? 'smtp.ethereal.email',
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER ?? '',
  pass: process.env.EMAIL_PASS ?? '',
  from: process.env.EMAIL_FROM ?? '"TicketBox" <noreply@ticketbox.com>',
}));
