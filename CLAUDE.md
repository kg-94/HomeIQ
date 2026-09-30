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

## Conventions
- Every table carries `household_id`; RLS on every table uses `is_member(household_id)`. No table ships without RLS.
- Money is `numeric(12,2)`; never floats.
- Secrets live in `.env.local` (git-ignored), never in the repo.
