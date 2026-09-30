@AGENTS.md

# HomeIQ

Multi-user home-management web app: households share maintenance tasks, inventory & warranties, bills & expenses, and a documents vault.

## Stack
- Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind 4, zod
- Supabase: Postgres (the database), Auth, Storage
- Deployed to Cloudflare Workers via `@opennextjs/cloudflare`

## Commands
- `npm run dev` — local dev
- `npm run lint` / `npm run build`
- `npm run preview` — build and run on the local Workers runtime
- `npm run deploy` — deploy to Cloudflare
- `npx supabase migration new <name>` — new migration in `supabase/migrations/`
- `npx supabase db push` — apply migrations to the linked project
- `npm run db:types` — regenerate `src/lib/supabase/types.ts` after a migration
- `npm run test:db` — pgTAP tests in `supabase/tests/` against the linked DB (no Docker; always rolled back)
- `npm test` — unit tests (`src/lib/*.test.ts`, node:test)

## Auth
Mobile + password (Supabase phone auth), or Google / Discord OAuth. No email/password.
Phones are E.164 in the app (`toE164` in `src/lib/phone.ts`) and stored without `+` in the DB, like `auth.users.phone`.
Invites target a phone or an email and only redeem for the matching account (`accept_invite`).

## Conventions
- Every table carries `household_id`; RLS on every table uses `is_member(household_id)`. No table ships without RLS, and every new table gets cases in `supabase/tests/rls.sql`.
- Active household = `hid` cookie, resolved by `getHouseholdContext()` in `src/lib/household.ts`.
- Money is `numeric(12,2)`; never floats.
- Secrets live in `.env.local` (git-ignored), never in the repo.
