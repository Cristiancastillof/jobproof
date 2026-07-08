# JobProof

JobProof is a mobile-first field reporting app for service teams. It supports
company profiles, clients, team roles, job reports, photo evidence, PDF exports,
public report links, plan limits, and Stripe subscriptions.

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

3. Start the Vite dev server:

   ```bash
   npm run dev
   ```

## Environment Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL`

Serverless APIs:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and
`STRIPE_WEBHOOK_SECRET` must only be configured in the hosting provider, never
in frontend code.

## Supabase Requirements

The app expects these tables:

- `companies`
- `profiles`
- `clients`
- `reports`
- `report_photos`
- `report_workers`
- `report_activity`
- `team_invitations`

The app expects these public storage buckets:

- `business-logos`
- `report-photos`

Row Level Security should be enabled so authenticated users can only access rows
for their own `company_id`. Public report links should be readable only through
their public token flow.

## Stripe Billing

Billing uses three API endpoints:

- `POST /api/create-checkout-session`
- `POST /api/create-customer-portal-session`
- `POST /api/stripe-webhook`

Configure a Stripe webhook pointing to:

```text
https://YOUR_DOMAIN/api/stripe-webhook
```

Recommended webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Stripe Price IDs are mapped in `src/config/plans.js`. If Stripe prices change,
update the plan config before deploying.

## Deploy

The project is ready for Vercel-style deployment:

1. Set all environment variables in the hosting provider.
2. Deploy from `main`.
3. Confirm `/api/create-checkout-session` and `/api/stripe-webhook` are not
   routed to the SPA fallback.
4. Configure the Stripe webhook URL after the production domain is live.
5. Run the production QA checklist in `docs/production-launch-checklist.md`.

## Checks

```bash
npm run build
npm run lint
```
