import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),
  JWT_SECRET: Joi.string().min(8).default('ticketbox-super-secret'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  EMAIL_HOST: Joi.string().default('smtp.ethereal.email'),
  EMAIL_PORT: Joi.number().port().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().allow('').default(''),
  EMAIL_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().default('"TicketBox" <noreply@ticketbox.com>'),
});
