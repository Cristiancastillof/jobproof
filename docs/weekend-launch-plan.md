# JobProof Weekend Launch Plan

Use this as the final working order before promoting JobProof.

## 1. Production Domain and Environment

- Choose the final production domain.
- Set `VITE_PUBLIC_APP_URL` and `PUBLIC_APP_URL` to that HTTPS domain.
- Set `VITE_SUPPORT_EMAIL` to a real monitored inbox.
- Confirm `/terms`, `/privacy`, `/forgot-password`, and `/reset-password`
  load on the production domain.

## 2. Supabase

- Add `https://YOUR_DOMAIN/reset-password` to Supabase Auth redirect URLs.
- Confirm `business-logos` and `report-photos` storage buckets exist.
- Confirm RLS is enabled on all company data tables.
- Create one demo company and one test admin account.
- Test password recovery with the test admin account.

## 3. Stripe

- Confirm the three Stripe Price IDs for Starter, Business, and Pro.
- Set `STRIPE_SECRET_KEY` in Vercel.
- Create a webhook pointing to `https://YOUR_DOMAIN/api/stripe-webhook`.
- Set `STRIPE_WEBHOOK_SECRET` in Vercel.
- Run one test checkout and one customer portal session.

## 4. App QA

- Register a new admin.
- Complete Business Profile.
- Create a client.
- Create a report with before and after photos.
- Download the PDF and confirm it matches the current report.
- Open the public report link while logged out.
- Invite a team member and confirm the role permissions.
- Confirm plan limits block extra clients, reports, or users.

## 5. Promotion Readiness

- Replace placeholder support email if needed.
- Confirm the legal pages are visible in the footer.
- Prepare a 60-second demo script.
- Prepare 3 screenshots from a phone: reports list, report detail, PDF/public
  report.
- Start promotion with a small beta group before paid ads.
