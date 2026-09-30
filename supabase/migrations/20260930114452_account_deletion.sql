-- Ownership transfer and self-service account deletion.

-- Owner hands the household to another member who has an account; the caller
-- becomes a plain member (keep_an_owner is satisfied: the new owner is set first).
create function public.transfer_ownership(p_household uuid, p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if not public.is_owner(p_household) then
    raise exception 'Only an owner can transfer ownership';
  end if;
  if p_to = me or not exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = p_to and not is_offline
  ) then
    raise exception 'Ownership can only go to another member with an account';
  end if;
  update public.household_members set role = 'owner' where household_id = p_household and user_id = p_to;
  update public.household_members set role = 'member' where household_id = p_household and user_id = me;
end;
$$;

-- Households that stop the caller deleting their account: they're the only
-- owner and someone else with an account still belongs to it.
create function public.account_deletion_blockers() returns table (household_id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select h.id, h.name
  from public.households h
  join public.household_members me on me.household_id = h.id and me.user_id = auth.uid() and me.role = 'owner'
  where not exists (
    select 1 from public.household_members o
    where o.household_id = h.id and o.role = 'owner' and o.user_id <> auth.uid()
  ) and exists (
    select 1 from public.household_members o
    where o.household_id = h.id and o.user_id <> auth.uid() and not o.is_offline
  );
$$;

-- Deletes the caller's account. Households where they're the only account
-- holder go with it (the app removes their stored files first); private
-- income elsewhere is deleted; shared history stays so others' balances hold.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  blocker text;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  select name into blocker from public.account_deletion_blockers() limit 1;
  if blocker is not null then
    raise exception 'Transfer ownership of "%" to another member first', blocker;
  end if;

  delete from public.households h
  where exists (select 1 from public.household_members m where m.household_id = h.id and m.user_id = me)
    and not exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.user_id <> me and not m.is_offline
    );
  delete from public.incomes where received_by = me and is_private;
  delete from public.income_sources where received_by = me and is_private;

  -- Memberships go via the remove_memberships trigger; invites they sent cascade.
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.transfer_ownership, public.account_deletion_blockers, public.delete_my_account from public, anon;
grant execute on function public.transfer_ownership, public.account_deletion_blockers, public.delete_my_account to authenticated;
