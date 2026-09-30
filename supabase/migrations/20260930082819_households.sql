-- Households, membership and invites. Every later table references
-- households(id) and gates RLS on is_member(household_id).

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.household_invites (household_id);

-- Membership checks. security definer so policies on household_members
-- don't recurse into themselves.
create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = (select auth.uid())
  );
$$;

create function public.is_owner(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- households: created only via create_household(); members read, owners edit.
create policy "members read" on public.households
  for select to authenticated using (public.is_member(id));
create policy "owners update" on public.households
  for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));
create policy "owners delete" on public.households
  for delete to authenticated using (public.is_owner(id));

-- household_members: joined only via create_household()/accept_invite().
create policy "members read" on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy "self or owner update" on public.household_members
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_owner(household_id))
  with check (user_id = (select auth.uid()) or public.is_owner(household_id));
create policy "leave or owner removes" on public.household_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_owner(household_id));
-- Only display_name is editable directly; role changes would be privilege escalation.
revoke update on public.household_members from authenticated, anon;
grant update (display_name) on public.household_members to authenticated;

-- household_invites: owners manage.
create policy "owners read" on public.household_invites
  for select to authenticated using (public.is_owner(household_id));
create policy "owners create" on public.household_invites
  for insert to authenticated
  with check (public.is_owner(household_id) and invited_by = (select auth.uid()));
create policy "owners delete" on public.household_invites
  for delete to authenticated using (public.is_owner(household_id));

-- A household must always keep an owner. Skipped when the household itself
-- is being deleted (cascade), since it's no longer visible here.
create function public.keep_an_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;
  if old.role = 'owner'
     and exists (select 1 from public.households where id = old.household_id)
     and not exists (
       select 1 from public.household_members
       where household_id = old.household_id and role = 'owner' and user_id <> old.user_id
     ) then
    raise exception 'A household needs at least one owner';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger keep_an_owner
  before delete or update of role on public.household_members
  for each row
  when (old.role = 'owner')
  execute function public.keep_an_owner();

create function public.create_household(household_name text, member_name text, household_currency text default 'INR')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.households (name, currency, created_by)
    values (household_name, household_currency, auth.uid()) returning id into hid;
  insert into public.household_members (household_id, user_id, role, display_name)
    values (hid, auth.uid(), 'owner', member_name);
  return hid;
end;
$$;

-- Invite must be unexpired, unused, and addressed to the caller's email,
-- so a leaked link can't be redeemed by someone else.
create function public.accept_invite(invite_token uuid, member_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.household_invites;
begin
  select * into inv from public.household_invites
    where token = invite_token
      and accepted_at is null
      and expires_at > now()
      and email = lower(auth.jwt() ->> 'email')
    for update;
  if not found then
    raise exception 'Invite is invalid, expired, or for a different email';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
    values (inv.household_id, auth.uid(), 'member', member_name)
    on conflict do nothing;
  update public.household_invites
    set accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id;
  return inv.household_id;
end;
$$;

revoke execute on function public.create_household, public.accept_invite from public, anon;
grant execute on function public.create_household, public.accept_invite to authenticated;
