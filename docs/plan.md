# Geo3D Backend Plan: Checkout with Manual Payment Proof

> Review document. Once approved, it is saved as `geo3d-next/docs/BACKEND_PLAN.md`, and implementation follows the phases below.

## 1. Context

`geo3d-next` is a single Next.js 16 (App Router) app. Its frontend was migrated from the Vite/React version. Today **everything is client-side mock state**:
- `src/lib/AppContext.tsx` holds orders, cart, printers, spools and audit logs, seeded from `src/data/initialData.ts`.
- `CheckoutModal.tsx` fakes order creation with `setTimeout`, a random `GEO-####` number, prefilled demo contact data, card buttons (BoG/TBC), and a hardcoded promo `GEO3D`.
- `AdminWorkspace.tsx` has no authentication. Anyone can switch role in the Header.
- `OrderTrackerView.tsx` looks orders up by order number only, which would leak customer data once the data is real.
- `src/app/api/*` contains stub routes (501).

**Goal:** a real backend inside the same Next.js app. Guest checkout, **no card payments**. The customer pays by bank transfer outside the site and **uploads a screenshot of the payment**. An admin reviews the screenshot in the admin panel and approves or rejects it. The customer gets a private tracking link by email or SMS.

## 2. Decisions (from your answers)

| Topic | Decision |
|---|---|
| App shape | One Next.js app: UI + Route Handlers under `/api` |
| Customers | Guest checkout, no accounts. Private tracking link sent by email/SMS |
| Payment | Single method: **bank transfer made outside the site + screenshot upload**. No card, COD or invoice for now |
| Custom 3D models | The order stores a **model reference** only (catalog product / model key / file reference). No STL upload in this phase |
| Hosting | Not decided yet. The design must work on **both** a self-hosted Node server (`npm run build && npm start`) and Vercel |

## 3. Proposed technology

| Concern | Choice | Why |
|---|---|---|
| Database | **PostgreSQL 16** | Relational data (orders → items → timeline), transactions, sequences for order numbers. Runs anywhere: Docker locally, a VPS, or Neon/Supabase if on Vercel |
| ORM / migrations | **Prisma** | Typed client, migrations, seed script. Works with Next.js server code |
| Validation | **Zod** | One schema shared by the client form and the server handler |
| File storage | **S3-compatible API** (`@aws-sdk/client-s3`) behind a small `Storage` interface, plus a **local-disk driver** | Local disk for dev and a self-hosted VPS. Cloudflare R2 / AWS S3 / MinIO for Vercel (Vercel has no persistent disk). The driver is picked via env `STORAGE_DRIVER=local\|s3` |
| Image handling | **sharp** | Check real image type (magic bytes), re-encode to WebP/JPEG, strip EXIF/GPS metadata, cap the size, create a thumbnail for the admin list |
| Admin auth | **Auth.js v5 (credentials)** + `bcrypt` (or `@node-rs/argon2`) | Email + password for staff. JWT session cookie carries the role. Route protection via `proxy.ts`/middleware plus a per-handler check |
| Email | **Resend** (+ React Email templates), behind a `Notifier` interface | Simple API, good deliverability. Can be swapped for SMTP/Nodemailer |
| SMS | `SmsProvider` interface. Georgian provider (e.g. smsoffice.ge) or Twilio, decided later | The first version logs to the console; the real provider is plugged in later |
| Rate limiting | Simple in-memory limiter (VPS) / Upstash Ratelimit (Vercel), behind one helper | Protects order creation, upload and tracking lookup |
| Local dev | `docker-compose.yml` with Postgres (+ optional MinIO) | One command to get a DB |

## 4. Server architecture

```
src/
  app/
    api/
      orders/route.ts                      POST create order (public)
      orders/quote/route.ts                POST recompute totals (public)
      track/[token]/route.ts               GET order for customer (public, token)
      track/[token]/payment-proof/route.ts POST upload screenshot (public, token)
      products/route.ts                    GET catalog (public)
      settings/public/route.ts             GET bank accounts, delivery prices (public)
      admin/
        orders/route.ts                    GET list (filters: status, paymentStatus, search)
        orders/[id]/route.ts               GET detail, PATCH price/notes
        orders/[id]/status/route.ts        POST status transition + note
        orders/[id]/payment/route.ts       POST approve | reject (reason)
        files/[id]/route.ts                GET stream screenshot (auth only)
        printers/…, materials/…, audit-logs/…   (move existing mock features)
      auth/[...nextauth]/route.ts
    admin/login/page.tsx
    track/[token]/page.tsx                 private tracking page
  server/                                  server-only code (import 'server-only')
    db.ts                                  Prisma client singleton
    auth.ts                                Auth.js config, requireRole()
    storage/{index,local,s3}.ts            put/get/delete/getSignedUrl
    notify/{index,email,sms}.ts            sendOrderCreated, sendPaymentApproved, …
    services/
      orders.service.ts                    createOrder, transitionStatus, adjustPrice
      payments.service.ts                  submitProof, approve, reject
      pricing.service.ts                   server-side totals (reuses pricing lib)
      audit.service.ts                     log(action, entity, actor, details)
    validation/*.ts                        Zod schemas
  lib/pricing.ts                           pure pricing, moved out of utils/stlParser.ts
```

Rules:
- Route handlers stay thin: auth → Zod parse → service → JSON.
- All business rules live in `services/`. Every mutation writes an audit log in the same DB transaction.
- **Never trust client prices.** The server recalculates catalog prices from the DB, delivery fees from settings, and promo codes from the DB. `calculatePrintPrice` (currently in `src/utils/stlParser.ts:221`) moves to `src/lib/pricing.ts` with no `three` import, so both client and server use the same code.

## 5. Data model (Prisma, summarized)

```
AdminUser      id, email (unique), passwordHash, name, role (ADMIN | OPERATOR_ORDERS | OPERATOR_PROD), active, createdAt

Product        id, slug, title Json{ka,en,ru}, description Json, category, priceGel Decimal,
               imageUrl, dimensions Json, weightGrams, materials String[], colors Json,
               leadTimeHours, inStock, featured, modelRef (path/CDN key of the 3D model), tags String[]

Order          id, orderNumber (unique, "GEO-" + DB sequence), trackingTokenHash (unique),
               customerName, customerPhone, customerEmail, preferredContact (EMAIL|SMS),
               deliveryMethod, city, deliveryAddress,
               subtotalGel, deliveryGel, discountGel, totalGel (Decimal), promoCode?,
               status (OrderStatus), paymentStatus (PaymentStatus),
               customerNotes, internalNotes, estimatedCompletion, assignedPrinterId?,
               createdAt, updatedAt

OrderItem      id, orderId, type (CATALOG|CUSTOM), productId?, modelRef?, title, subtitle,
               material, colorName, colorHex, layerHeight, infillPercent, scalePercent,
               quantity, options Json (smoothVapor, brassInserts), geometry Json?,
               unitPriceGel, totalPriceGel, requiresReview          ← snapshot at order time

OrderEvent     id, orderId, status?, paymentStatus?, note, actorId?, actorName, createdAt   (timeline)

PaymentProof   id, orderId, fileKey, thumbKey, mimeType, sizeBytes, sha256,
               amountClaimedGel?, payerName?, bankName?, transferDate?,   (optional customer-entered)
               status (PENDING|APPROVED|REJECTED), reviewedById?, reviewedAt?, rejectReason?,
               uploadedAt
               → several per order (re-upload after a rejection keeps the history)

PromoCode      code, percentOff, active, validUntil?, maxUses?, usedCount
Setting        key/value Json: bankAccounts [{bank, iban, recipient}], deliveryFees, pickupAddress
Printer, MaterialSpool, AuditLog           ← mirror existing types in src/types.ts
```

Enums:
- `OrderStatus` = the existing 9 statuses from `src/types.ts` **plus** `awaiting_payment` and `cancelled`.
- `PaymentStatus` = `awaiting_quote | awaiting_payment | proof_submitted | verified | rejected | refunded`.

Tracking token: 32 random bytes in base64url. Only its **SHA-256 hash** is stored. The link is `/track/<token>`.

## 6. Checkout and payment flow

```
Customer                                   Server                                  Admin
────────                                   ──────                                  ─────
Cart → Checkout form (contact, delivery,
  promo)  ──POST /api/orders/quote──▶  recompute totals
          ◀── totals ──
Confirm   ──POST /api/orders──────────▶  validate, recalc, create Order + Items
                                         status=awaiting_payment
                                         paymentStatus=awaiting_payment
                                         (or awaiting_quote if any item requiresReview)
                                         send email/SMS with /track/<token>
          ◀── orderNumber, token, total, bank accounts ──
Step 2 in modal: "Transfer X ₾ to IBAN …,
 reference GEO-1234", then upload screenshot
          ──POST /api/track/<token>/payment-proof (multipart)──▶
                                         validate (≤10 MB, jpg/png/webp/heic),
                                         sharp re-encode + strip EXIF, store privately,
                                         PaymentProof=PENDING,
                                         paymentStatus=proof_submitted   ──notify──▶  "Payment to review" badge/email
                                                                                       opens order, views screenshot
                                                                                       (streamed via /api/admin/files/:id)
                                         ◀── POST /api/admin/orders/:id/payment {approve} ──
                                         paymentStatus=verified, status=confirmed,
                                         timeline + audit, notify customer
                                         ◀── {reject, reason} ──
                                         paymentStatus=rejected, notify customer
                                         to re-upload via the same link
```

Details:
- The customer can skip the upload in the modal and do it later from the tracking link. The link is also in the email/SMS.
- **Custom / requires-review items:** the order is created with `awaiting_quote`, and no bank details are shown yet. The admin sets the final price (existing "Apply New Quote" UI). The server then moves the order to `awaiting_payment` and notifies the customer, who pays and uploads.
- Admin price change after a proof was submitted → the proof is marked stale, and the customer is asked to pay the difference or re-upload.
- Unpaid orders: the admin can cancel them manually. Auto-cancel after N days can come later via cron.
- Production statuses (`preparation` … `shipped`) are allowed only after `paymentStatus=verified`. This is enforced in `orders.service.transitionStatus`.

## 7. Security essentials

- Screenshots are **private**: never in `public/`, never a public bucket URL. Only staff can read them, through an authenticated streaming route or short-lived signed URLs.
- Upload checks: size limit, real MIME from magic bytes (not the extension), re-encoding with sharp (drops embedded payloads and EXIF/GPS), random storage keys, and a SHA-256 to spot duplicate screenshots reused across orders.
- Rate limits on order creation, proof upload and tracking lookup. A honeypot field on the checkout form.
- Admin: hashed passwords, role checks in every admin handler (not only in middleware), and every action written to the audit log with the actor.
- Public tracking returns only what the customer needs (no internal notes, operator names optional).
- PII: phone/email are visible only to staff and on the tracking page that holds the token.

## 8. Frontend changes required

| File | Change |
|---|---|
| `src/components/CheckoutModal.tsx` | Remove card/COD/invoice options and demo prefilled values. Call `/api/orders/quote` and `/api/orders`. Add step 2 "Bank details + upload screenshot" (drag & drop, preview). Add a contact preference (email/SMS) |
| `src/lib/AppContext.tsx` | Keep only UI state (cart, language, theme, modals). Persist the cart in `localStorage`. Data comes from the API. Remove orders/printers/spools/auditLogs |
| `src/app/catalog`, `src/app/page.tsx` | Load products from the DB (server component fetch) instead of `INITIAL_PRODUCTS` |
| `src/components/OrderTrackerView.tsx` + new `src/app/track/[token]/page.tsx` | Token-based view. Show payment state and an "upload/re-upload screenshot" action. The `/tracking` page becomes a "lookup by order number + phone" form |
| `src/components/AdminWorkspace.tsx` | Fetch from `/api/admin/*`. New **Payment review** panel in the order detail (screenshot viewer, zoom, approve/reject with reason, proof history). Payment-status filter and "to review" counter |
| `src/components/Header.tsx` | Remove the role switcher. The Admin link shows only when signed in. Add `/admin/login` |
| `src/types.ts` | Align with the Prisma enums (`PaymentStatus`, new order statuses). Remove the card payment methods |
| `src/utils/stlParser.ts` | Move the pricing constants and `calculatePrintPrice` to `src/lib/pricing.ts` |

## 9. Implementation phases

1. **Foundation:** save this doc to `docs/BACKEND_PLAN.md`. Add `docker-compose.yml` (Postgres), Prisma schema + first migration, and a seed script that ports `src/data/initialData.ts`. Add `server/db.ts`, the env template, and `lib/pricing.ts`.
2. **Catalog + settings API:** `GET /api/products` and `/api/settings/public`. The catalog pages read from the DB.
3. **Orders:** quote + create endpoints, server-side pricing, order number sequence, tracking token, audit log. CheckoutModal step 1 wired up.
4. **Payment proof:** storage interface (local driver first), sharp pipeline, upload endpoint, CheckoutModal step 2, and the tracking page with the upload.
5. **Admin auth + panel:** Auth.js credentials, seed admin user, `/admin/login`, route protection, admin order endpoints, payment review UI, and status/price actions moved to the API.
6. **Notifications:** Notifier interface. Resend email templates (order created, payment approved/rejected, quote ready, status updates). SMS stub.
7. **Rest of admin:** printers, materials and audit log endpoints replace the mock state. Remove `AppContext` data.
8. **Hardening:** rate limits, the S3 storage driver, error pages, and a deployment doc (VPS vs Vercel), decided at that point.

## 10. Open questions (can be answered during review)

1. **Model reference:** for custom prints, how does the model reach your server today (customer sends it separately, or a CDN path we receive)? The plan stores `modelRef` as a string (URL/key) on `OrderItem`. Should the calculator's local STL upload stay as a preview only?
2. Bank accounts to show at checkout: BoG and TBC IBANs plus the recipient name. The admin will edit these in `Setting`.
3. Which language should emails/SMS use: the customer's UI language at checkout (stored on the order)? The plan assumes yes.
4. Should any sender (email domain / SMS sender name) be prepared now?

## 11. Verification

- `docker compose up -d && npx prisma migrate dev && npx prisma db seed` → the DB holds the seeded catalog and admin.
- `npm run build` and `npm run lint` (tsc) pass.
- Manual end-to-end: add a catalog item → checkout → order created (row in DB, email logged) → upload a screenshot (file in storage, EXIF stripped, `proof_submitted`) → log into `/admin` → see the "to review" badge → approve → status `confirmed`, timeline + audit entries, customer notification logged → tracking link shows the update. Repeat with reject → re-upload.
- Negative checks: upload a `.exe` renamed to `.jpg` (rejected); a wrong or missing token (404); admin API without a session (401); a tampered client price (ignored, server total used); a production status before payment is verified (rejected).
- Optional: Vitest unit tests for `pricing.ts`, the status-transition rules and the upload validator.
