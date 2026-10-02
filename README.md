# SYNAPSE

**Closer, one conversation at a time.** SYNAPSE gives two people from different generations — a grandparent and a grandchild, a parent and a teenager, an older adult and a caregiver — a private space with simple, guided ways to talk, do small activities together, and keep what they share.

This repository is the MVP: a Next.js 16 web app with a PostgreSQL database, real authentication, private two-person Connection Spaces, a conversation-prompt library, guided activities, a shared scrapbook, plan limits with a Stripe-ready billing layer, and an admin dashboard.

---

## Quick start (local)

Requirements: **Node 20+** (tested on Node 24), **Docker** (for PostgreSQL), npm.

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. (If port 3000 is busy, run `npm run dev -- -p 3210` and set `APP_URL` to match, so email links point at the right port.)

### Demo accounts (password for all: `synapse-demo-2026`)

| Email | Who | What you'll see |
| --- | --- | --- |
| `rose@synapse.test` | Rose, older side, text size Large | An established Connection Space with Leo: conversation history, finished activities, memories |
| `leo@synapse.test` | Leo, younger side | The same space from the other side, with an unread update |
| `sam@synapse.test` | Sam, waiting for someone to join | The "waiting" state with a pending invitation (code `GRAN-7K3P`) |
| `admin@synapse.test` | Avery, admin | The admin dashboard at `/admin` |

Emails (verification, password reset, invitations) are not sent in development. They appear at **http://localhost:3000/dev/mailbox**.

To try the full new-user flow: sign up with any email, confirm it from the dev mailbox, finish onboarding, then open `/invite/GRAN-7K3P` in a private window as another new user — or create your own invitation on `/connect`.

---

## Public demo

`DEMO_MODE=true` turns on the one-click demo: opening **`/demo`** (or `/demo?as=rose`) creates a private copy of Rose and Leo's space with ten weeks of history and logs the visitor straight in. Each visitor gets their own copy; copies are deleted after a day. Demo accounts have no password, cannot send email invitations, and can switch between Rose's and Leo's side from the banner.

The `Dockerfile` runs Postgres and the app in one container, seeds fresh data on every boot, and removes the sample accounts' passwords so nobody can log in with the password printed in this README (set a `DEMO_ADMIN_PASSWORD` secret of 12+ characters to keep an admin login).

**Vercel (current live demo).** Create a database (`npx create-db --region us-east-1 --json`, no sign-up; claim it to keep it past 24 hours), apply the schema and data with `DATABASE_URL=... npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx prisma/demo-lockdown.ts`, then run `DBURL=... bash deploy/vercel-temporary.sh`. It prints a `*.vercel.app` address and a claim link; claim it within the hour to keep it. Photos are stored in Postgres, so nothing needs a disk.

**From this computer instead**, with a free Cloudflare quick tunnel (no account needed):

```bash
powershell -NoProfile -File deploy/run-public-demo.ps1 -Build
```

It prints `DEMO LIVE <url>`. The URL changes each time the tunnel restarts, and the computer must stay on. For a permanent address, deploy the same `Dockerfile` to any container host (a Hugging Face Docker Space now needs a PRO plan; Fly.io, Render or Railway also work).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest against a separate `synapse_test` database (created and migrated automatically) |
| `npm run db:seed` | Wipes and re-seeds the development database with demo data (refuses in production) |
| `npm run db:reset` | Drops and re-applies all migrations |
| `npm run audit` | Static route audit (auth guards, internal links) |
| `npm run check` | Typecheck + lint + audit + tests |

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_URL` | yes | Public base URL, used in emails and OAuth redirects |
| `TEST_DATABASE_URL` | for tests | Must point at a database whose name ends in `_test` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | Enables "Continue with Google" (the button is hidden when unset). Redirect URI: `${APP_URL}/api/auth/google/callback` |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Sends real email through Resend. Without it, email is only written to the outbox (`/dev/mailbox`) |
| `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | no | Real Stripe Checkout, billing portal and webhook sync. Without them a clearly labelled **test checkout** is used in development; it is disabled in production |

Secrets are only read on the server (`src/lib/env.ts` imports `server-only`).

---

## Architecture

```
src/
  app/                    Next.js App Router
    page.tsx              Landing page
    (auth)/               Log in, sign up, forgot/reset password, check email
    onboarding/           Six one-question-per-screen steps
    invite/[code]/        Public invitation landing
    (app)/                Signed-in app (layout enforces session + onboarding)
      dashboard/          "Today": what can we do together today?
      connect/            Invite by link, code or email; join with a code
      spaces/[connectionId]/
        talk/             Prompt generator, conversation threads
        activities/       Library, activity detail, guided sessions
        sessions/         Step-by-step activity in progress
        memories/         Shared scrapbook, add memory, memory detail
      settings/, billing/
    admin/                Admin dashboard (role-gated)
    api/                  Google OAuth, Stripe webhook, private photo serving
    verify-email/         Email confirmation link handler
  actions/                Server Actions (all writes): auth, connections, together, account, admin
  lib/                    Server logic: db, session, crypto, spaces (authorization),
                          queries (scoped reads), entitlements, invitations, billing, uploads, email
  components/             UI kit (ui.tsx), client helpers, landing sections, app forms, admin forms
  proxy.ts                Optimistic signed-out redirect (real checks run on the server)
prisma/                   schema.prisma, migrations, seed + seed content (prompts, activities)
tests/                    Vitest suites + helpers
```

**Data flow.** Pages are React Server Components that read through `src/lib/queries.ts`; every write goes through a Server Action in `src/actions/`. Each action validates input with Zod, re-checks the session, and re-checks Connection Space membership.

**Authorization boundary.** `getSpace` / `requireSpace` in `src/lib/spaces.ts` return a space only when the current user is a member; otherwise the page renders a 404, so a guessed id reveals nothing. Every space-scoped query is additionally filtered by that space's id, and every action that receives an id looks the row up through a `members: { some: { userId } }` filter.

---

## Database

PostgreSQL via Prisma 7 (`prisma/schema.prisma`). Main tables:

- **Identity:** `User`, `Profile` (onboarding answers, text-size preference), `Session` (hashed tokens), `AuthToken` (hashed email-verify / password-reset tokens)
- **Connections:** `Connection` (a private space), `ConnectionMember` (unique per space+user, records which side of the generational gap each person is on), `Invitation` (unique human-friendly code, expiry, status)
- **Content (admin-managed):** `Category` (prompt themes and activity types), `Prompt`, `Activity`, `ActivityStep`, `Collection` (monthly activity collections)
- **Doing things together:** `Conversation` (one prompt in one space; unique per space+prompt), `PromptResponse`, `PromptFavorite`, `ActivitySession`, `ActivityNote`
- **Memories:** `Memory` (story, conversation, activity, photo, moment; links back to its source), `Photo` (random storage key, MIME sniffed from bytes)
- **Billing & system:** `Plan` (admin-editable limits), `Subscription` (one per user), `Notification`, `Report` (safety reports), `EmailOutbox`

Foreign keys use `Cascade` for private data owned by a user or space, `Restrict` for content that has been used (a used prompt can be unpublished but not deleted), and `SetNull` for optional links. Indexes cover every space-scoped list query.

---

## Security and privacy measures

- Passwords hashed with Node's built-in `scrypt` (per-password salt, constant-time compare).
- Sessions: 32-byte random token in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie; only its SHA-256 is stored. Password reset signs out every device.
- Email-verify and reset tokens are single-use (conditional update), hashed at rest, and expire (24 h / 1 h).
- Login, sign-up, password reset, invitations, responses, notes and memories are rate-limited.
- Login and forgot-password do not reveal whether an account exists (sign-up does, for clarity to first-time users; it is rate-limited).
- Open-redirect protection on every `next=` parameter.
- Zod validation and plain-text cleaning on every input; user text is only rendered as text, never HTML.
- Photos: type detected from the file's bytes (JPEG/PNG/WebP only), 5 MB limit, EXIF/XMP/text metadata (including GPS) stripped, random file names, stored outside `public/`, and served only to members of the photo's space with `nosniff` and a locked-down CSP.
- Server Actions are CSRF-protected by Next.js origin checks; the Stripe webhook verifies Stripe's signature.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, permissions policy, HSTS.
- Any member can leave a space at any time and report a concern to the admin team.

---

## Testing

`npm test` runs Vitest suites against a real PostgreSQL test database (never the development database — the setup refuses any database whose name does not end in `_test`). Next.js request APIs are mocked so Server Actions are exercised directly and their database effects asserted. See `tests/`.

---

## Known limitations

- **Rate limiting is in-memory** (`src/lib/rate-limit.ts`). Correct for one server; move to Redis/Upstash before running several instances.
- **Photos are stored on local disk** (`uploads/`, outside `public/`). Swap `saveImage`/`readImage` in `src/lib/uploads.ts` for S3/R2 before deploying to serverless or multiple servers.
- **Google sign-in and live Stripe are implemented but untested against the real services** (no credentials were available). Both are off unless their environment variables are set; the mock checkout covers billing in development and is disabled in production.
- **Email** is written to an outbox and sent through Resend only when `RESEND_API_KEY` is set. There is no retry queue for failed sends.
- **Connection Spaces are for exactly two people.** Group/family spaces need a different activity design, not just a higher member limit.
- **Self-service account deletion and data export are not built yet.** People can delete memories they added and leave a space; full deletion is manual.
- **No real-time updates.** A partner's new answer appears on refresh or the next navigation (notifications are shown on the dashboard).
- **Testimonials are an honest placeholder** — no quotes were invented.
- **No strict Content-Security-Policy** (Next.js inline scripts need a nonce setup); the other security headers are in `next.config.ts`.

## Quality checks

```bash
npm run check
```

runs type checking, ESLint, a static route audit (`scripts/audit-pages.mjs`: every space page calls `requireSpace`, every admin page calls `requireAdmin`, every internal link resolves to a real route) and the full test suite.
