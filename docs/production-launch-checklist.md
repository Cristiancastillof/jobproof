# JobProof Production Launch Checklist

Use this checklist before inviting real customers into JobProof.

## Code Readiness

- [ ] `npm ci` completes on a clean checkout.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes or only contains acknowledged warnings.
- [ ] `/api/create-checkout-session` returns JSON, not `index.html`.
- [ ] `/api/create-customer-portal-session` returns JSON, not `index.html`.
- [ ] `/api/stripe-webhook` rejects unsigned requests.
- [ ] Mobile navigation is usable on iPhone Safari and Android Chrome.
- [ ] Long forms do not hide save buttons behind the bottom menu.

## Supabase

- [ ] Project URL and anon key are configured in production.
- [ ] Service role key is configured only as a server-side variable.
- [ ] Tables exist: `companies`, `profiles`, `clients`, `reports`,
      `report_photos`, `report_workers`, `report_activity`,
      `team_invitations`.
- [ ] RPC `create_admin_profile_for_current_user` exists and creates an admin
      profile with an initial company.
- [ ] RLS is enabled on all business tables.
- [ ] Users can only read/write rows for their own `company_id`.
- [ ] Workers cannot edit completed reports unless intended.
- [ ] Public report tokens expose only the intended report data.
- [ ] Buckets exist: `business-logos`, `report-photos`.
- [ ] Storage policies prevent cross-company uploads/deletes.
- [ ] Database backups are enabled.

## Stripe

- [ ] Stripe products and prices match `src/config/plans.js`.
- [ ] `STRIPE_SECRET_KEY` is configured in production.
- [ ] `STRIPE_WEBHOOK_SECRET` is configured in production.
- [ ] Webhook URL is set to `/api/stripe-webhook`.
- [ ] Webhook listens to checkout, subscription, and invoice events.
- [ ] Test checkout creates or updates `stripe_customer_id`.
- [ ] Test checkout creates or updates `stripe_subscription_id`.
- [ ] Subscription updates change `plan_key` and `subscription_status`.
- [ ] Cancellation sets the company subscription to `inactive`.
- [ ] Customer Portal returns users to `/billing`.

## Core User Flows

- [ ] Register a new admin user.
- [ ] Complete Business Profile.
- [ ] Upload a business logo.
- [ ] Create a client.
- [ ] Create a report from a client.
- [ ] Add before and after photos.
- [ ] Save report.
- [ ] Edit report.
- [ ] Generate PDF.
- [ ] Open public report link in a logged-out browser.
- [ ] Invite or manage team members.
- [ ] Confirm workers see only the reports they should see.
- [ ] Confirm billing limits block report/client/user creation when exceeded.

## Operations

- [ ] Domain and HTTPS are active.
- [ ] `VITE_PUBLIC_APP_URL` points to the production domain.
- [ ] Error monitoring is installed or hosting logs are actively checked.
- [ ] Support email is visible to users.
- [ ] Privacy policy and terms are available.
- [ ] A demo company exists for sales/testing.
