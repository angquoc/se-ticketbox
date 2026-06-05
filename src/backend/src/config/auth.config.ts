import { registerAs } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'ticketbox-super-secret',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
}));
