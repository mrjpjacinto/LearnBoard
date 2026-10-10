-- REVIEW ONLY: requires explicit approval before live execution.
-- No existing objects are deleted by this migration.
begin;
create table public.scorm_cleanup_jobs (
 package_id uuid primary key, game_id uuid not null,
 storage_path text not null, extraction_path text not null,
 eligible_at timestamptz not null default (now() + interval '35 minutes'),
 state text not null default 'pending' check(state in ('pending','detached','complete')),
 last_error text, completed_at timestamptz
);
alter table public.scorm_cleanup_jobs enable row level security;
revoke all on public.scorm_cleanup_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.scorm_cleanup_jobs to service_role;
create function public.lumentrail_queue_scorm_cleanup(p_game uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.games where id=p_game for update;
 insert into public.scorm_cleanup_jobs(package_id,game_id,storage_path,extraction_path)
 select p.id,p.game_id,p.storage_path,p.extraction_path from public.scorm_packages p
 join public.games g on g.id=p.game_id
 where p.game_id=p_game and p.processing_status='ready'
 and g.package_path is distinct from p.extraction_path
 and p.storage_path is not null and p.extraction_path is not null
 on conflict(package_id) do nothing;
end $$;
create function public.lumentrail_detach_scorm_cleanup(p_package uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.scorm_cleanup_jobs%rowtype;
begin
 select * into j from public.scorm_cleanup_jobs where package_id=p_package for update;
 if not found or j.state='complete' or j.eligible_at>now() then return false; end if;
 if j.state='detached' then return true; end if;
 perform 1 from public.games where id=j.game_id for update;
 perform 1 from public.scorm_packages where id=p_package for update;
 if not found then return false; end if;
 if exists(select 1 from public.games where package_path=j.extraction_path)
 or exists(select 1 from public.attempts where package_id=p_package or (game_id=j.game_id and package_id is null))
 or exists(select 1 from public.scorm_packages p where p.id<>p_package and
 (p.storage_path=j.storage_path or p.extraction_path=j.extraction_path
 or starts_with(p.extraction_path,j.extraction_path||'/') or starts_with(j.extraction_path,p.extraction_path||'/')))
 then return false; end if;
 -- Deleting the package row first uses foreign-key locking to prevent a
 -- concurrently created attempt from losing its package files.
 begin
 delete from public.scorm_packages where id=p_package;
 exception when foreign_key_violation then return false;
 end;
 update public.scorm_cleanup_jobs set state='detached',last_error=null where package_id=p_package;
 return true;
end $$;
revoke all on function public.lumentrail_queue_scorm_cleanup(uuid),public.lumentrail_detach_scorm_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.lumentrail_queue_scorm_cleanup(uuid),public.lumentrail_detach_scorm_cleanup(uuid) to service_role;
commit;
