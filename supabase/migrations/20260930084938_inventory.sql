-- Inventory & warranties, plus the shared files table and storage bucket
-- (the documents vault reuses both).

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text check (length(category) <= 60),
  location text check (length(location) <= 60),
  brand text check (length(brand) <= 60),
  model text check (length(model) <= 60),
  serial_number text check (length(serial_number) <= 100),
  purchased_on date,
  price numeric(12, 2) check (price >= 0),
  warranty_expires_on date,
  notes text check (length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, id) -- target for same-household composite FKs
);
create index on public.items (household_id, name);

-- A task can be about an item; the composite FK keeps both in one household.
alter table public.tasks
  add column item_id uuid,
  add foreign key (household_id, item_id)
    references public.items (household_id, id) on delete set null (item_id);
create index on public.tasks (item_id) where item_id is not null;

create table public.files (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  item_id uuid,
  kind text not null check (kind in ('receipt', 'manual', 'photo', 'document')),
  name text not null check (length(name) between 1 and 200),
  mime text not null,
  size bigint not null check (size > 0),
  -- "<household_id>/<file id>" in the household-files bucket
  storage_path text not null unique check (storage_path = household_id || '/' || id),
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (household_id, item_id) references public.items (household_id, id) on delete cascade
);
-- Storage objects can't be deleted from SQL (protect_objects_delete), so the
-- app removes objects before deleting an item.
-- ponytail: deleting a whole household orphans its objects; sweep "<household_id>/" via the Storage API if that ships.
create index on public.files (household_id, item_id);

alter table public.items enable row level security;
alter table public.files enable row level security;

create policy "members all" on public.items
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members all" on public.files
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- Private bucket; objects live under "<household_id>/" and only members reach them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('household-files', 'household-files', false, 20 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

create function public.is_member_of_path(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id::text = (storage.foldername(path))[1] and user_id = (select auth.uid())
  );
$$;

create policy "members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'household-files' and public.is_member_of_path(name));
create policy "members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'household-files' and public.is_member_of_path(name));
create policy "members delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'household-files' and public.is_member_of_path(name));
