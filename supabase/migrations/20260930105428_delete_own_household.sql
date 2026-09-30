-- A household can only be deleted by its owner once they're its last member
-- (the last owner can't leave, so this is how a solo household ends).
-- Shared households can't be deleted out from under other members.

create function public.is_sole_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = (select auth.uid())
  ) and not exists (
    select 1 from public.household_members
    where household_id = hid and user_id <> (select auth.uid())
  );
$$;

drop policy "owners delete" on public.households;
create policy "sole owner deletes" on public.households
  for delete to authenticated
  using (public.is_owner(id) and public.is_sole_member(id));
