-- Household icon (an emoji) and tags on households and on entries.
-- Tags are lowercase labels normalised by the app (src/lib/tags.ts); the DB
-- only bounds them. GIN indexes serve the per-page "filter by tag" (@>).

alter table public.households
  add column icon text check (char_length(icon) between 1 and 16),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 10);

alter table public.tasks    add column tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.items    add column tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.files    add column tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.expenses add column tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.bills    add column tags text[] not null default '{}' check (cardinality(tags) <= 10);
alter table public.incomes  add column tags text[] not null default '{}' check (cardinality(tags) <= 10);

create index on public.tasks using gin (tags);
create index on public.items using gin (tags);
create index on public.files using gin (tags);
create index on public.expenses using gin (tags);
create index on public.bills using gin (tags);
create index on public.incomes using gin (tags);
