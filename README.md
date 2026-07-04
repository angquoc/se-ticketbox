# TicketBox

A full-stack ticketing platform for concert events, built with NestJS (backend), Next.js (frontend apps), PostgreSQL, Redis, and MinIO (S3-compatible storage).

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontends (Next.js)                                 │
│  ├── customer-web   : Mua vé & chọn ghế  (:3000)    │
│  ├── admin-web      : Dashboard quản lý   (:3002)   │
│  └── checkin-pwa    : Quét vé tại cổng    (:3003)   │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼───────────────────────────────┐
│  Backend (NestJS)                                    │
│  ├── backend        : API + WebSocket   (:3001)     │
│  └── worker         : BullMQ job processor           │
└──────────┬──────────────────────┬────────────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │ PostgreSQL  │        │    Redis    │
    │   :5432     │        │   :6379     │
    └─────────────┘        └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │    MinIO     │
                            │  :9000/:9001│
                            └─────────────┘
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for local dev) or 20+ recommended
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Git](https://git-scm.com/)

## Quick Start (with Docker)

This is the recommended way to run the entire stack.

```bash
# 1. Start all services (builds images if needed)
docker compose up -d

# 2. Run migrations + seed demo data in one step
docker compose exec backend npm run db:init

# 3. Open the apps
#    Customer Web  → http://localhost:3000
#    Admin Web     → http://localhost:3002
#    Checkin PWA   → http://localhost:3003
#    Backend API   → http://localhost:3001
#    MinIO Console → http://localhost:9001
```

To run only migrations (without seed):

```bash
docker compose exec backend npm run db:migrate
```

To watch logs:

```bash
docker compose logs -f backend worker
```

To stop everything:

```bash
docker compose down        # keep data volumes
docker compose down -v     # destroy data volumes (reset)
```

---

## Local Development (without Docker)

If you prefer to run services directly on your machine.

### 1. Start infrastructure

```bash
docker compose up -d postgres redis minio
```

Wait for the services to be healthy, then create the database:

```bash
docker compose exec postgres psql -U ticketbox_user -d ticketbox_db -c "SELECT 1"
```

### 2. Backend

```bash
cd src/backend

# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env

# Run database migrations and seed demo data
npm run db:init

# Or run them separately:
npm run db:migrate    # migrations only
npm run db:seed       # seed data only
npm run db:reset      # drop schema, re-migrate, and seed

# Start in watch mode
npm run start:dev

# Start the worker (in a separate terminal)
npm run worker:dev
```

Backend runs at `http://localhost:3001`.

### 3. Customer Web

```bash
cd src/frontend/customer-web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local    # Next.js reads .env.local

# Start dev server
npm run dev
```

Opens at `http://localhost:3000`.

### 4. Admin Web

```bash
cd src/frontend/admin-web

# Install dependencies
npm install

# Copy environment variables (no .env.example yet — use customer-web as reference)
# BACKEND_API_URL=http://localhost:3001

# Start dev server
npm run dev
```

Opens at `http://localhost:3000` (runs on same port as customer-web if both are active; use one at a time for local dev).

### 5. Checkin PWA

```bash
cd src/frontend/checkin-pwa

# Install dependencies
npm install

# Start dev server
npm run dev
```

Opens at `http://localhost:3000` (same note as admin-web).

> **Tip:** For local development with all three frontends running simultaneously,
> edit their `package.json` `dev` scripts to use different ports, e.g.
> `next dev --port 3003`, then access them at `:3000`, `:3002`, `:3003`.

---

## Environment Variables

All environment variables and their defaults are documented in `src/backend/.env.example`.

Key variables:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing JWT tokens | (required in prod) |
| `PORT` | Backend HTTP port | `3001` |
| `MINIO_ENDPOINT` | MinIO / S3 endpoint | `http://localhost:9000` |
| `MINIO_BUCKET` | MinIO bucket name | `ticketbox` |
| `EMAIL_*` | SMTP settings for notifications | (optional for dev) |

For frontend apps, set `BACKEND_API_URL` pointing to the backend base URL.

---

## Available Scripts

### Backend (`src/backend/`)

| Command | Description |
|---|---|
| `npm run start` | Start in production mode |
| `npm run start:dev` | Start with hot-reload (NestJS watch) |
| `npm run start:prod` | Run built output (`dist/main`) |
| `npm run worker:dev` | Start BullMQ worker with hot-reload |
| `npm run worker:prod` | Run built worker output |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:migrate` | Run database migrations (reads from `data/migrations/`) |
| `npm run db:seed` | Seed demo data (reads from `data/seed/seed.ts`) |
| `npm run db:init` | Run migrations then seed in one command |
| `npm run db:reset` | Drop schema, re-migrate, and seed |
| `npx prisma studio` | Open Prisma Studio (DB browser) |

### Customer Web (`src/frontend/customer-web/`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on `:3000` |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type check |

### Admin Web (`src/frontend/admin-web/`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run validate` | Run type-check + lint |
| `npm run test` | Run Jest tests |

### Checkin PWA (`src/frontend/checkin-pwa/`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |

---

## Database

The backend uses [Prisma ORM](https://www.prisma.io/) with PostgreSQL. Schema lives in `src/backend/prisma/schema.prisma`, and migration files live in `data/migrations/`.

```bash
# Open Prisma Studio (visual DB editor)
cd src/backend && npx prisma studio

# Reset database and re-seed
cd src/backend && npm run db:reset
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 |
| Frontend | Next.js 14 (React 18) |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7 + BullMQ |
| ORM | Prisma 7 |
| File Storage | MinIO (S3-compatible) |
| Auth | Passport JWT |
| API Validation | class-validator + Joi |
| Real-time | Socket.io + Redis Adapter |
| Email | Nodemailer |
| AI | Google Gemini (`@google/generative-ai`) |

---

## Project Structure

```
.
├── data/                          # Database migrations, seed data, and init scripts
│   ├── migrations/               # Prisma migration files (SQL)
│   │   ├── migration_lock.toml
│   │   └── <timestamp>_*/         # Individual migration folders
│   ├── seed/
│   │   └── seed.ts               # Demo data seeder (users, concerts, tickets, etc.)
│   └── scripts/
│       ├── init-db.sh            # Run migrations + seed
│       └── reset-db.sh           # Reset DB then seed
│
├── src/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/          # Feature modules (auth, order, ticket, etc.)
│   │   │   ├── config/           # NestJS ConfigService loaders
│   │   │   ├── database/         # Prisma module
│   │   │   ├── common/          # Shared adapters (Redis IO)
│   │   │   └── worker/          # BullMQ job processors
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema (migrations = data/migrations/)
│   │   ├── Dockerfile
│   │   └── Dockerfile.worker
│   └── frontend/
│       ├── customer-web/          # Public ticket purchasing UI
│       ├── admin-web/             # Admin dashboard
│       └── checkin-pwa/           # Gate check-in Progressive Web App
```
