-- Sign-in is Google/Discord only, so every account has an email:
-- invites go back to email-only.
delete from public.household_invites where email is null;

alter table public.household_invites
  drop constraint invite_has_one_target,
  drop column phone,
  alter column email set not null;

create or replace function public.accept_invite(invite_token uuid, member_name text)
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
    raise exception 'Invite is invalid, expired, or for a different account';
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
