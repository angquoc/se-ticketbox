# Ticket Box Backend

Backend service for the Ticket Box project, built with NestJS.

## Requirements

- Node.js 20+
- npm
- PostgreSQL
- Redis

## Environment setup

Copy the example environment file before starting the backend:

```bash
cp .env.example .env
```

Current environment variables:

```env
DATABASE_URL="postgresql://ticketbox_user:ticketbox_password@localhost:5434/ticketbox_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="ticketbox-super-secret"
JWT_EXPIRES_IN="1d"
PORT=3001
```

## Configuration

The backend uses `@nestjs/config` with domain-based config modules loaded in `AppModule`:

- `app` → application runtime settings such as `PORT`
- `auth` → JWT settings such as `JWT_SECRET` and `JWT_EXPIRES_IN`
- `database` → database connection settings
- `redis` → Redis connection settings

Application modules and services should read configuration through `ConfigService` instead of using `process.env` directly.

## Environment validation

Environment variables are validated during application startup using Joi.

The app will fail fast if:

- `DATABASE_URL` is missing
- `PORT` is not a valid port
- `REDIS_URL` is not a valid Redis URI
- `JWT_SECRET` is too short
- other required values are invalid

This helps detect configuration problems before the app starts serving requests.

## Project setup

```bash
npm install
```

## Start dependencies

If you are using the repository Docker setup from the project root, start infrastructure first:

```bash
docker compose up -d
```

Or start your own PostgreSQL and Redis instances manually.

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

The server listens on the port defined by `PORT`.

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Notes

- Prisma CLI configuration and seed scripts run outside the NestJS runtime, so they still rely on environment variables directly.
- NestJS modules inside `src/` should use the config module abstractions instead of reading env values themselves.
