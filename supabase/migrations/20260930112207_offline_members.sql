-- Offline members: people in a household without an account (a parent, a
-- child, house help), so one person can run a household alone. They get a
-- membership row with their own id in user_id and is_offline = true.
--
-- "Person" columns (payer, split member, settlement parties, income recipient)
-- therefore hold *member* ids, which aren't always auth users: their auth.users
-- FKs go, and membership is enforced at write time by RLS (is_household_user).
-- An offline member can later be linked to a real account via an invite.

alter table public.household_members
  add column is_offline boolean not null default false,
  drop constraint household_members_user_id_fkey;

-- Keep "deleting an account removes its memberships" without the FK.
create function public.remove_memberships_of_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.household_members where user_id = old.id and not is_offline;
  return old;
end;
$$;
create trigger remove_memberships after delete on auth.users
  for each row execute function public.remove_memberships_of_deleted_user();

alter table public.expenses drop constraint expenses_paid_by_fkey;
alter table public.expense_splits drop constraint expense_splits_user_id_fkey;
alter table public.settlements drop constraint settlements_from_user_fkey, drop constraint settlements_to_user_fkey;
alter table public.incomes drop constraint incomes_received_by_fkey;
alter table public.income_sources drop constraint income_sources_received_by_fkey;

-- Linking swaps the member id; let task assignments follow automatically.
alter table public.tasks
  drop constraint tasks_household_id_assignee_id_fkey,
  add constraint tasks_household_id_assignee_id_fkey foreign key (household_id, assignee_id)
    references public.household_members (household_id, user_id)
    on update cascade on delete set null (assignee_id);

-- Owners add offline members.
create function public.add_offline_member(p_household uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  mid uuid := gen_random_uuid();
begin
  if not public.is_owner(p_household) then
    raise exception 'Only an owner can add members';
  end if;
  insert into public.household_members (household_id, user_id, role, display_name, is_offline)
    values (p_household, mid, 'member', trim(p_name), true);
  return mid;
end;
$$;

-- Invites can be "for" an offline member: accepting takes over their place.
alter table public.household_invites add column member_id uuid;

create or replace function public.accept_invite(invite_token uuid, member_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.household_invites;
  me uuid := auth.uid();
begin
  select * into inv from public.household_invites
    where token = invite_token
      and accepted_at is null
      and expires_at > now()
      and email = lower(auth.jwt() ->> 'email')
    for update;
  if not found then
    raise exception 'Invite is invalid, expired, or for a different account';
  end if;

  if inv.member_id is not null and exists (
    select 1 from public.household_members
    where household_id = inv.household_id and user_id = inv.member_id and is_offline
  ) then
    if exists (select 1 from public.household_members where household_id = inv.household_id and user_id = me) then
      raise exception 'You are already a member of this household';
    end if;
    -- Take over the offline member: their id becomes this account everywhere.
    update public.household_members
      set user_id = me, is_offline = false, display_name = member_name
      where household_id = inv.household_id and user_id = inv.member_id; -- cascades to tasks
    update public.expenses set paid_by = me where household_id = inv.household_id and paid_by = inv.member_id;
    update public.expense_splits set user_id = me where household_id = inv.household_id and user_id = inv.member_id;
    update public.settlements set from_user = me where household_id = inv.household_id and from_user = inv.member_id;
    update public.settlements set to_user = me where household_id = inv.household_id and to_user = inv.member_id;
    update public.incomes set received_by = me where household_id = inv.household_id and received_by = inv.member_id;
    update public.income_sources set received_by = me where household_id = inv.household_id and received_by = inv.member_id;
  else
    insert into public.household_members (household_id, user_id, role, display_name)
      values (inv.household_id, me, 'member', member_name)
      on conflict do nothing;
  end if;

  update public.household_invites set accepted_at = now(), accepted_by = me where id = inv.id;
  return inv.household_id;
end;
$$;

-- "Last member" for deletion means the last person with an account.
create or replace function public.is_sole_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = (select auth.uid())
  ) and not exists (
    select 1 from public.household_members
    where household_id = hid and user_id <> (select auth.uid()) and not is_offline
  );
$$;

revoke execute on function public.add_offline_member from public, anon;
grant execute on function public.add_offline_member to authenticated;
