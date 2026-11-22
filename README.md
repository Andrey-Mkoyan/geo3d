# Geo3D (Next.js)

Single Next.js 16 app (App Router): UI + API in one project. Guest checkout, **no card payments**:
the customer pays by bank transfer and uploads a screenshot; staff verify it in the admin panel.

Full design: [`docs/plan.md`](docs/plan.md).

## Run locally

Requires Node 22+ and a local PostgreSQL.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate            # apply migrations
npm run db:seed               # catalog, printers, spools, promo code, settings, first admin
npm run dev                   # http://localhost:3000
```

Create the database once (psql as a superuser):

```sql
CREATE ROLE geo3d LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE geo3d OWNER geo3d;
```

First admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (default `admin@geo3d.local` / `ChangeMe123!`). **Change it** before going live. Sign in at `/admin/login`.

`docker-compose.yml` (Postgres, optional MinIO) is kept for later but is not required.

## Where things are

| Area | Path |
|---|---|
| Pages | `src/app/**/page.tsx` (`/catalog`, `/custom-print`, `/track/[token]`, `/tracking`, `/admin`, ...) |
| API | `src/app/api/**/route.ts` (public: orders, track, products, settings; staff: `api/admin/*`) |
| Business logic | `src/server/services/*` (orders, payments, pricing, audit) |
| DB schema / seed | `prisma/schema.prisma`, `prisma/seed.ts` |
| Payment screenshots | `src/server/storage/*`: local disk `.storage/` (private) or S3 (`STORAGE_DRIVER=s3`) |
| Email / SMS | `src/server/notify/*` (logged to the console until `RESEND_API_KEY` / an SMS provider is set) |

## Before going live

- Replace the placeholder IBANs in the `Setting` table (`bankAccounts`) and the seed.
- Change the seed admin password; set a real `AUTH_SECRET` and `APP_URL`.
- Set `RESEND_API_KEY` + `EMAIL_FROM`; plug an SMS provider into `src/server/notify/sms.ts`.
- On Vercel (no persistent disk): use `STORAGE_DRIVER=s3` (Cloudflare R2 / S3) and a hosted Postgres; swap the in-memory rate limiter (`src/server/ratelimit.ts`) for Upstash.
