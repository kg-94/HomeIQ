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
Google / Discord OAuth only; the first login creates the account (no separate sign-up, no passwords).
Invites target an email and only redeem for the account with that email (`accept_invite`).
Supabase's Email and Phone providers should stay disabled, or accounts could be created through the API directly.

## Conventions
- Every table carries `household_id`; RLS on every table uses `is_member(household_id)`. No table ships without RLS, and every new table gets cases in `supabase/tests/rls.sql`.
- Active household = `hid` cookie, resolved by `getHouseholdContext()` in `src/lib/household.ts`.
- Members can be **offline** (`household_members.is_offline`, no account). "Person" columns (`paid_by`, `expense_splits.user_id`, settlement `from_user`/`to_user`, `received_by`, `assignee_id`) hold *member* ids, not necessarily auth users: no FK to `auth.users`; validate with `is_household_user()` in RLS. Linking an offline member to an account (`accept_invite` with `member_id`) rewrites those columns, so any new person column must be added there too.
- Money is `numeric(12,2)`; never floats.
- Secrets live in `.env.local` (git-ignored), never in the repo.
- Version: the husky pre-commit hook bumps the patch version on every commit; don't bump it by hand. The footer shows `v<version> · <commit>`.
