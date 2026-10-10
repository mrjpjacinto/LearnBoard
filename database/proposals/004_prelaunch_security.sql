-- REVIEW ONLY. Explicit user approval and a verified backup are required before live execution.
-- Security-only alternative to Master Paths proposal 003; it does not implement Master Paths.
-- Existing application IDs and data are preserved. Validate current catalog drift first.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $guard$ begin
 -- Normalize CRLF only; all other definition differences still abort.
 if replace(pg_get_functiondef('public.handle_new_user()'::regprocedure), E'\r\n', E'\n') is distinct from replace($catalog$CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );

  return new;
end;
$function$
$catalog$, E'\r\n', E'\n') then raise exception 'Auth trigger function differs from reviewed catalog. Refresh inspection before approval.'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Admins can view group members') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Admins can view group members'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='School admins can view own school group members') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM groups\n  WHERE ((groups.id = group_members.group_id) AND (groups.school_id = current_school_id())))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: School admins can view own school group members'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Students can view own group memberships') is distinct from '{"qual":"(user_id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Students can view own group memberships'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Super admins can view all group members') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Super admins can view all group members'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Admins can view groups') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Admins can view groups'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='School admins can view own school groups') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: School admins can view own school groups'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Students can view their groups') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM group_members\n  WHERE ((group_members.group_id = groups.id) AND (group_members.user_id = auth.uid()))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Students can view their groups'; end if;
 if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Super admins can view all groups') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy differs from reviewed catalog: Super admins can view all groups'; end if;
end $guard$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.profiles(id,full_name,email,role)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),150),new.email,'student');
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
-- Privileged provisioning subsequently sets role/school through the server client.
create function public.lumentrail_view_group(p_group uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles p join groups g on g.id=p_group where p.id=auth.uid() and p.is_active
 and (p.role='super_admin' or (p.school_id=g.school_id and exists(select 1 from schools where id=p.school_id and is_active)
 and (p.role='admin' or (p.role='student' and exists(select 1 from group_members m where m.group_id=g.id and m.user_id=p.id))))));
$$;
create function public.lumentrail_view_membership(p_group uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles p join groups g on g.id=p_group where p.id=auth.uid() and p.is_active
 and (p.role='super_admin' or (p.school_id=g.school_id and exists(select 1 from schools where id=p.school_id and is_active)
 and (p.role='admin' or (p.role='student' and p_user=p.id)))));
$$;
create function public.lumentrail_view_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles actor join profiles target on target.id=p_profile where actor.id=auth.uid() and actor.is_active
 and (actor.id=target.id or actor.role='super_admin' or (actor.role='admin' and actor.school_id=target.school_id
 and exists(select 1 from schools where id=actor.school_id and is_active))));
$$;
-- Replace recursive group/member reads; preserve unrelated policies.
drop policy "Admins can view group members" on public.group_members;
drop policy "School admins can view own school group members" on public.group_members;
drop policy "Students can view own group memberships" on public.group_members;
drop policy "Super admins can view all group members" on public.group_members;
drop policy "Admins can view groups" on public.groups;
drop policy "School admins can view own school groups" on public.groups;
drop policy "Students can view their groups" on public.groups;
drop policy "Super admins can view all groups" on public.groups;
create policy lumentrail_group_read on public.groups for select to authenticated using(lumentrail_view_group(id));
create policy lumentrail_group_boundary on public.groups as restrictive for select to authenticated using(lumentrail_view_group(id));
create policy lumentrail_membership_boundary on public.group_members as restrictive for select to authenticated using(lumentrail_view_membership(group_id,user_id));
create policy lumentrail_membership_read on public.group_members for select to authenticated using(lumentrail_view_membership(group_id,user_id));
create policy lumentrail_profile_boundary on public.profiles as restrictive for select to authenticated using(lumentrail_view_profile(id));
revoke all on function public.lumentrail_view_group(uuid),public.lumentrail_view_membership(uuid,uuid),public.lumentrail_view_profile(uuid) from public,anon,authenticated;
grant execute on function public.lumentrail_view_group(uuid),public.lumentrail_view_membership(uuid,uuid),public.lumentrail_view_profile(uuid) to authenticated,service_role;
revoke truncate on public.activity_logs,public.assignments,public.attempts,public.game_score_events,public.games,public.group_members,public.groups,public.learning_board_games,public.learning_board_group_assignments,public.learning_boards,public.profiles,public.schools,public.scorm_packages,public.scorm_runtime_data,public.skills,public.subjects from public,anon,authenticated;
revoke insert,update,delete on public.groups,public.group_members,public.profiles,public.game_score_events from public,anon,authenticated;
revoke select on public.game_score_events,public.scorm_runtime_data from public,anon,authenticated;
-- Column grants are independent of table grants.
do $$ declare g record; begin
 for g in select distinct table_name,column_name,privilege_type from information_schema.column_privileges
 where table_schema='public' and grantee in ('PUBLIC','anon','authenticated')
 and ((table_name in ('groups','group_members','profiles','game_score_events') and privilege_type in ('INSERT','UPDATE'))
 or (table_name in ('game_score_events','scorm_runtime_data') and privilege_type='SELECT'))
 loop execute format('revoke %s (%I) on public.%I from public,anon,authenticated',g.privilege_type,g.column_name,g.table_name); end loop;
end $$;
alter table public.assignments drop constraint assignments_board_id_fkey;
alter table public.assignments add constraint assignments_board_id_fkey FOREIGN KEY (board_id) REFERENCES learning_boards(id) ON DELETE RESTRICT;
alter table public.assignments drop constraint assignments_game_id_fkey;
alter table public.assignments add constraint assignments_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT;
alter table public.assignments drop constraint assignments_student_id_fkey;
alter table public.assignments add constraint assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.attempts drop constraint attempts_assignment_id_fkey;
alter table public.attempts add constraint attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE RESTRICT;
alter table public.attempts drop constraint attempts_game_id_fkey;
alter table public.attempts add constraint attempts_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT;
alter table public.attempts drop constraint attempts_student_id_fkey;
alter table public.attempts add constraint attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.learning_board_group_assignments drop constraint learning_board_group_assignments_board_id_fkey;
alter table public.learning_board_group_assignments add constraint learning_board_group_assignments_board_id_fkey FOREIGN KEY (board_id) REFERENCES learning_boards(id) ON DELETE RESTRICT;
alter table public.learning_board_group_assignments drop constraint learning_board_group_assignments_group_id_fkey;
alter table public.learning_board_group_assignments add constraint learning_board_group_assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT;
commit;
