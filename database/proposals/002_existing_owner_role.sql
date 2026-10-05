-- LearnBoard Database: PROPOSAL ONLY. Requires explicit review/approval.
-- First open /api/account/identity while signed in to the owner account.
-- Copy auth_user_id and email from that response into BOTH placeholders below.
-- Do not identify the owner by display name, oldest account, or missing school.
-- Review constraints/triggers/policies using database/inspection.sql first.
begin;
do $$
declare
  owner_id uuid := 'REPLACE_WITH_VERIFIED_AUTH_USER_ID';
  owner_email text := 'REPLACE_WITH_VERIFIED_AUTH_EMAIL';
  target public.profiles;
begin
  select p.* into target from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = owner_id and lower(u.email) = lower(owner_email)
    for update of p;
  if target.id is null or not target.is_active or target.role <> 'admin'
     or target.school_id is not null then
    raise exception 'Owner identity or expected profile state does not match. No correction applied.';
  end if;
  update public.profiles set role = 'super_admin', school_id = null
    where id = owner_id;
end $$;
-- Returns the platform-owner profile after the guarded correction.
select id, full_name, role, school_id, is_active from public.profiles
  where role = 'super_admin';
commit;
