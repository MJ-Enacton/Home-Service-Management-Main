# HandyHub — Home Service Management

Marketplace where customers book home services, providers list and manage services, and admins moderate the platform.

Built with Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4 + shadcn + Drizzle ORM + Neon Postgres + Better-Auth + Socket.IO + Cloudinary + Razorpay.

## Features

**Customers**
- Browse/search/filter/sort service catalog (`/services`) with debounced API, category, price, rating filters
- Service detail with tiers, gallery, reviews, availability slots, checkout
- Book services (today → +7 days), pay via Razorpay, track lifecycle
- Reviews (1 per completed booking), favorites/wishlist, notifications inbox
- Realtime per-booking chat with provider (confirmed/in_progress only) + typing indicator
- Profile with saved contact/address, change password

**Providers**
- Dashboard with KPIs, earnings chart (completed-only net), today/upcoming bookings
- Service CRUD with Zod validation, tiers, Cloudinary gallery, draft/active/inactive flow
- Weekly availability windows → generated booking slots
- Accept/decline/start/complete/cancel bookings via atomic state machine
- Notifications inbox, profile/bio/avatar/availability editors

**Admins**
- KPI dashboard: revenue, users, bookings + revenue/status/growth charts
- Moderate listings (approve/reject/activate), users (ban/unban with reason), all bookings table
- Revenue view with platform fees + payments + payout settlement status

**Platform**
- Auth: Better-Auth email+password + Google OAuth, 6-digit email OTP verification, password reset, onboarding gate, ban gate
- Role guards in `src/proxy.ts` (Next 16 `proxy`) + layout-level re-checks; never trust client role
- Bookings state machine: `requested → confirmed → in_progress → completed`, `cancelled` from requested/confirmed
- Anti-double-booking: partial unique index on `(provider_id, scheduled_date, scheduled_time_slot)` where status != `cancelled`
- Payments: Razorpay Orders + signature verification, cents/paise math, 10% platform fee, `HB-xxxxx` booking numbers
- Realtime: standalone Socket.IO server, Better-Auth cookie auth, `user:{id}` rooms, `POST /internal/emit` bridge
- Uploads: browser → Cloudinary direct (signed), `pending_uploads` tracking + orphan GC
- Email: Nodemailer Gmail, best-effort `sendMail()` (OTP, reset, welcome, completed, cancelled)

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.1 App Router, React 19, React Compiler |
| Styling / UI | Tailwind CSS 4, shadcn (base-nova, neutral), lucide-react, framer-motion, recharts |
| Auth | Better-Auth 1.7.1 (Drizzle adapter, email+password + Google) |
| DB | Neon Postgres + Drizzle ORM 0.45.2, 17 tables in `src/lib/db/schema.ts` |
| Realtime | Socket.IO 4.8.3 server + client singleton |
| Uploads | Cloudinary signed direct upload + `next-cloudinary` |
| Payments | Razorpay Checkout + Orders API (test mode) |
| Email | Nodemailer 10 via Gmail App Password |
| Validation | Zod 4 |
| Maps | Leaflet / react-leaflet (address picking) |

## Getting Started

### Prerequisites

- Node.js 20+
- Neon Postgres database (pooled + direct URLs)
- Cloudinary account (cloud name, API key/secret)
- Gmail account with 2FA + App Password (for email)
- Razorpay test keys (for payments)
- Google OAuth client ID/secret (for social sign-in)

### 1. Install

```bash
npm install
```

### 2. Configure env

Copy `.env.example` to `.env.local` and fill in:

```bash
SOCKET_PORT=5000
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
DIRECT_DATABASE_URL=          # optional, else DATABASE_URL minus "-pooler"
GMAIL_USER=
GMAIL_APP_PASSWORD=           # preferred (GMAIL_PASSWORD also works)
EMAIL_FROM=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Path alias `@/*` maps to `./src/*` (`tsconfig.json`).

### 3. Database

Schema is the single source of truth in `src/lib/db/schema.ts`. Migrations live in `drizzle/`.

Generate after schema edits, then apply one file at a time:

```bash
npx drizzle-kit generate
node scripts/apply-migration.mjs <file.sql>
```

Seed helpers:

```bash
node scripts/seed-categories.mjs      # upserts 10 categories by slug
node scripts/seed-demo-listings.mjs   # demo provider + 3 listings
node scripts/seed-demo-chat.mjs       # confirmed booking + 2-way messages
```

Check mail config (sends nothing):

```bash
npm run verify:email
```

### 4. Run

```bash
npm run dev          # next dev + socket-server concurrently
npm run dev:next     # next only
npm run dev:socket   # socket-server only (SOCKET_PORT default 5000)
```

Open http://localhost:3000.

### 5. Build / start / lint

```bash
npm run build
npm start            # next start + socket-server concurrently
npm run lint
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | `next dev` + `node socket-server/server.js` |
| `npm run dev:next` / `dev:socket` / `dev:all` | Next only / socket only / both |
| `npm run build` / `npm start` | Build / serve + socket server |
| `npm run lint` | ESLint |
| `npm run verify:email` | `scripts/verify-email.mjs` — checks Gmail SMTP auth |
| `node scripts/apply-migration.mjs <file.sql>` | Apply one Drizzle SQL file statement-wise, idempotent |
| `node scripts/seed-categories.mjs` | Upsert categories |
| `node scripts/seed-demo-listings.mjs` | Demo provider + listings |
| `node scripts/seed-demo-chat.mjs` | Demo booking chat |

## Project Structure

```text
src/app/            # RSC page.tsx + loading.tsx + *Client.tsx + actions.ts per feature
  (auth)/           # sign-in, sign-up, forgot/reset-password, verify-email
  services/         # public catalog + [id] detail + bookService actions
  customer/         # my-bookings, profile, notifications (customer guard)
  provider/         # dashboard, my-services, new/[id]/edit, my-bookings, profile, notifications
  admin/            # KPIs/charts, bookings, customers, providers, services, revenue
  notifications/    # shared inbox + respondToBooking actions
  onboarding/       # contact/address/role collection
  api/              # auth/[...all], listings, notifications/unread|recent, cloudinary/sign|orphan
src/components/     # Navbar, Footer, BanGate, ProfileCheck, NotificationBell,
                    # ListingCard/Row, bookings/MyBookingsClient, chat/BookingChatWidget,
                    # home/*, profile/*, reviews/*, ui/* (shadcn primitives)
src/lib/
  auth.ts / auth-client.ts / roles.ts / auth-redirect.ts
  db/db.ts (Neon singleton) / db/schema.ts (17 tables) / db/queries/
  bookings/actions.ts / booking-transitions.ts (atomic state machine)
  availability.ts (slots from weekly windows) / booking-window.ts (today→+7d)
  pricing.ts (cents, 10% fee, HB-xxxxx) / browse-params.ts (catalog URL state)
  socket/client.ts / socket/emit.ts / notify.ts
  email/ (transporter, send, templates, welcome)
  cloudinary.ts / cloudinary-client.ts / validators.ts (Zod)
  razorpay/ + razorpay-checkout.ts
  format.ts / notification-types.ts / utils.ts (cn)
src/types/          # auth, booking, service, notification, user + ActionResult barrel
src/hooks/          # useDebouncedValue
socket-server/server.js  # Socket.IO hub: cookie auth → Neon lookup, user:{id} rooms
drizzle/            # versioned SQL + meta/
scripts/            # apply-migration, seeds, verify-email
```

Routing convention: `page.tsx` (RSC fetch) + `loading.tsx` (skeleton) + `*Client.tsx` (interactive) + `actions.ts` (server actions) per feature.

## Core Concepts

**Auth & roles (`src/proxy.ts`, `src/lib/roles.ts`)**
- Public: `/services*`. Everything else forces sign-in + `/verify-email` (email/password users; Google skips).
- `/customer*`, `/provider*`, `/admin*` guarded by `resolveRole()` → customer|provider|admin. Layouts re-check server-side.

**Bookings (`src/lib/booking-transitions.ts`, `src/lib/bookings/actions.ts`)**
- All mutations go through the state machine (atomic txn + notification + socket + email).
- DB arbitrates concurrency via the no-overlap unique index; second committer gets a violation, not a phantom booking.

**Pricing (`src/lib/pricing.ts`)**
- Integer cents math, 10% platform fee, human-readable `HB-xxxxx` numbers.

**Availability (`src/lib/availability.ts`, `src/lib/booking-window.ts`)**
- Provider weekly windows (0=Sun..6=Sat, `HH:mm`) expand into slots; only today→+7d is bookable.

**Realtime (`socket-server/server.js`, `src/lib/socket/`)**
- Next pushes via `POST /internal/emit` (`lib/socket/emit.ts` → `emitToUser(s)`). Browser subscribes via `lib/socket/client.ts` singleton with backoff. Keep `notification-types.ts` in sync with DB enum.

**Uploads (`src/lib/cloudinary.ts`, `api/cloudinary/`)**
- Server signs in `api/cloudinary/sign` + records `pending_uploads`; browser uploads direct; save actions consume rows; cancelled/stale assets deleted via `api/cloudinary/orphan`.

**Email (`src/lib/email/`)**
- `sendMail()` is best-effort and never throws. Run `npm run verify:email` before debugging mail.

**Migrations**
- Edit `schema.ts` → `drizzle-kit generate` → `node scripts/apply-migration.mjs`. Use direct (non-pooled) URL for DDL.

## Deployment

- Set production `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (see `.env.example`), plus Neon, Cloudinary, Gmail, Razorpay, Google vars.
- `next.config.ts` enables `reactCompiler` and allows `res.cloudinary.com` images.
- Run Next + `socket-server/server.js` together (`npm start`). Socket server needs `DATABASE_URL`, `SOCKET_PORT`, `SOCKET_CORS_ORIGIN`, `SOCKET_INTERNAL_SECRET`.
