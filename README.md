# HomeIQ

Shared home management for households: maintenance tasks, inventory & warranties, bills & expenses, documents.

## Setup

1. `npm install`
2. Fill `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`
   and enable Google and Discord (disable Email and Phone) under Supabase → Authentication → Sign In / Providers
3. `npx supabase link` then `npx supabase db push`
4. `npm run dev`

## Checks

- `npm run lint`, `npx tsc --noEmit`, `npm test` (unit)
- `npm run test:db` — pgTAP tests against the linked Supabase project (rolled back, no Docker needed)

## Deploy (Cloudflare Workers Builds)

Pushing to `master` deploys. Worker settings → Build:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy`
- Build variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (inlined at build time)

In Supabase → Authentication → URL Configuration, add `https://<worker>.workers.dev/**`
(and `http://localhost:3000/**` for local dev) to Redirect URLs, or OAuth logins bounce to the Site URL.
