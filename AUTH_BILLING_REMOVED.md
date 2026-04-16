# Auth & billing (removed for now — reference for re-enabling)

This file summarizes what was implemented before login/subscription were disabled, so a future agent can restore it.

## Login options

- **Email + password** at `/login` and `/register`.
- **Register** collected: name, email, password, organization name. New users were redirected to `/billing`.
- **Session**: HTTP-only cookie `session` with a **JWT** signed by `JWT_SECRET` (see former `lib/auth.ts`). Payload included `userId`, `email`, `name`, `role`, `organizationId`, `organizationName`, `subscriptionStatus`.
- **API**: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`.

## Billing / subscription

- **PayPal Subscriptions** on `/billing` (PayPal JS SDK, `vault=true`, `intent=subscription`). Plan ID from env (e.g. `PAYPAL_PLAN_ID`).
- **After approval**: `POST /api/paypal/activate` stored `paypalSubscriptionId` and set org `subscriptionStatus` to `ACTIVE`.
- **Webhooks**: `POST /api/paypal/webhook` handled `BILLING.SUBSCRIPTION.*` and `PAYMENT.SALE.COMPLETED` to sync `subscriptionStatus` on **Organization**.
- **Gating** (former `middleware.ts`): Without a valid JWT → redirect to `/login`. With JWT but `subscriptionStatus !== "ACTIVE"` → redirect to `/billing` (except billing/auth/paypal paths). API calls returned 401/403 accordingly.
- **Admin override**: `POST /api/admin/activate` with `Authorization: Bearer <ADMIN_SECRET>` could set subscription status (for testing/support).
- **Org API key**: Admins could store **Anthropic** key per organization via **Settings** (`/settings`, `GET/PATCH /api/settings`); format/chat fell back to `CV_ANTHROPIC_KEY` or org key.

## Data model (Prisma)

- **Organization**: name, optional `anthropicApiKey`, `paypalSubscriptionId`, `subscriptionStatus` (`ACTIVE`, `PAST_DUE`, `CANCELED`, etc.).
- **User**: email, `passwordHash` (bcrypt), role (`ADMIN` / member), linked to organization.

## Env vars (when re-enabling)

- `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, PayPal client/plan/webhook ids, `CV_ANTHROPIC_KEY` (optional org fallback).

---

**Current behavior:** No middleware; **Anthropic API key is server-only** (`ANTHROPIC_API_KEY` or `CV_ANTHROPIC_KEY` in environment). `format` and `chat` do **not** accept a key from the browser.
