-- Documents vault: household files not attached to an item (kind 'document'),
-- with a category and an optional expiry (insurance, ID, PUC, lease...).
alter table public.files
  add column category text check (category in ('insurance', 'property', 'identity', 'vehicle', 'tax', 'medical', 'contract', 'other')),
  add column expires_on date;
create index on public.files (household_id, expires_on) where expires_on is not null;
