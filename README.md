# HomeIQ

Shared home management for households: maintenance tasks, inventory & warranties, bills & expenses, documents.

## Setup

1. `npm install`
2. Fill `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`
   and enable Phone, Google and Discord under Supabase → Authentication → Sign In / Providers
3. `npx supabase link` then `npx supabase db push`
4. `npm run dev`
