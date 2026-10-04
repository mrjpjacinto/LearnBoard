-- PROPOSAL ONLY. Review and approve before applying to the connected database.
-- Additive changes to existing tables; no table replacement or historical deletion.
begin;

alter table public.assignments add column if not exists group_assignment_id uuid
  references public.learning_board_group_assignments(id) on delete restrict;
alter table public.attempts add column if not exists package_id uuid
  references public.scorm_packages(id) on delete restrict;
alter table public.attempts add column if not exists launch_config jsonb not null default '{}'::jsonb;
create unique index if not exists assignments_class_student_unique
  on public.assignments(group_assignment_id, student_id) where group_assignment_id is not null;
-- Fail the transaction if historical runtime duplicates exist; do not delete them.
create unique index if not exists scorm_runtime_attempt_unique on public.scorm_runtime_data(attempt_id);
create index if not exists attempts_assignment_game_student on public.attempts(assignment_id, game_id, student_id);
create index if not exists assignments_student_school on public.assignments(student_id, school_id);

create or replace function public.learnboard_keep_game_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists(select 1 from attempts where game_id=old.id) then raise exception 'Games with student attempts cannot be deleted.'; end if;
  return old;
end $$;
drop trigger if exists learnboard_keep_game_history on public.games;
create trigger learnboard_keep_game_history before delete on public.games
  for each row execute function public.learnboard_keep_game_history();

create or replace function public.learnboard_save_path_games(p_board uuid, p_games uuid[], p_expected timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; board public.learning_boards; item uuid; pos integer := 0;
begin
  select * into actor from profiles where id = auth.uid() and is_active;
  select * into board from learning_boards where id = p_board for update;
  if actor.id is null or actor.role not in ('admin','super_admin') or board.id is null
     or board.school_id is null or (actor.role <> 'super_admin' and actor.school_id is distinct from board.school_id)
     or not exists(select 1 from schools where id=board.school_id and is_active)
     then raise exception 'Learning Path is not available.'; end if;
  if board.updated_at is distinct from p_expected then raise exception 'This path changed. Reload before saving.'; end if;
  if cardinality(p_games)>200 or exists(select 1 from unnest(p_games) g group by g having count(*)>1)
     or exists(select 1 from unnest(p_games) g where not exists(select 1 from games where id=g))
     then raise exception 'Choose a valid, unique game sequence.'; end if;
  if exists(select 1 from assignments where board_id=p_board)
     or exists(select 1 from learning_board_group_assignments where board_id=p_board)
     then raise exception 'This path has assignments. Create a new path to change its sequence without affecting student history.'; end if;
  delete from learning_board_games where board_id=p_board;
  foreach item in array p_games loop
    insert into learning_board_games(board_id,game_id,sort_order) values(p_board,item,pos);
    pos := pos+1;
  end loop;
  update learning_boards set updated_at=clock_timestamp() where id=p_board;
end $$;

create or replace function public.learnboard_resolve_class_assignment(p_source uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; src public.learning_board_group_assignments; board public.learning_boards; result uuid;
begin
  select * into actor from profiles where id=auth.uid() and role='student' and is_active;
  select * into src from learning_board_group_assignments where id=p_source and status='active' for update;
  select * into board from learning_boards where id=src.board_id and status='active';
  if actor.id is null or src.id is null or board.id is null or actor.school_id is distinct from board.school_id
    or not exists(select 1 from schools where id=actor.school_id and is_active)
    or not exists(select 1 from groups g join group_members m on m.group_id=g.id
      where g.id=src.group_id and g.school_id=actor.school_id and g.is_active and m.user_id=actor.id)
    then raise exception 'This class assignment is not available.'; end if;
  insert into assignments(student_id,board_id,school_id,group_assignment_id,available_from,available_until,
    max_attempts,time_limit_minutes,passing_score,allow_resume,status,assigned_by)
  values(actor.id,src.board_id,actor.school_id,src.id,src.available_from,src.available_until,
    src.max_attempts,src.time_limit_minutes,src.passing_score,src.allow_resume,src.status,src.assigned_by)
  on conflict(group_assignment_id,student_id) where group_assignment_id is not null do nothing;
  select id into result from assignments where group_assignment_id=src.id and student_id=actor.id;
  return result;
end $$;

-- Resolve current class settings and membership on every launch/commit.
create or replace function public.learnboard_student_assignment(p_assignment uuid)
returns public.assignments language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; item public.assignments; src public.learning_board_group_assignments;
begin
  select * into actor from profiles where id=auth.uid() and role='student' and is_active;
  select * into item from assignments where id=p_assignment and student_id=actor.id for update;
  if actor.id is null or item.id is null or item.school_id is distinct from actor.school_id
    or not exists(select 1 from schools where id=actor.school_id and is_active)
    then raise exception 'Assignment is not available.'; end if;
  if item.group_assignment_id is not null then
    select * into src from learning_board_group_assignments where id=item.group_assignment_id;
    if src.id is null or src.board_id is distinct from item.board_id
       or not exists(select 1 from groups g join group_members m on m.group_id=g.id
         where g.id=src.group_id and g.school_id=actor.school_id and g.is_active and m.user_id=actor.id)
       then raise exception 'Class assignment is not available.'; end if;
    item.available_from := src.available_from; item.available_until := src.available_until;
    item.max_attempts := src.max_attempts; item.time_limit_minutes := src.time_limit_minutes;
    item.passing_score := src.passing_score; item.allow_resume := src.allow_resume;
    item.status := src.status;
  end if;
  if item.status<>'active' or (item.available_from is not null and item.available_from>now())
     or (item.available_until is not null and item.available_until<=now())
     then raise exception 'Assignment is not currently available.'; end if;
  if item.board_id is not null and not exists(select 1 from learning_boards
     where id=item.board_id and school_id=actor.school_id and status='active')
     then raise exception 'Learning Path is not available.'; end if;
  return item;
end $$;

create or replace function public.learnboard_start_attempt(p_assignment uuid, p_game uuid)
returns public.attempts language plpgsql security definer set search_path = public, pg_temp as $$
declare item public.assignments; result public.attempts; pkg public.scorm_packages;
  used integer; token uuid := gen_random_uuid(); deadline timestamptz; position integer;
begin
  item := learnboard_student_assignment(p_assignment);
  if item.game_id is not null and item.game_id<>p_game then raise exception 'Game is not assigned.'; end if;
  if item.board_id is not null then
    select sort_order into position from learning_board_games where board_id=item.board_id and game_id=p_game;
    if position is null then raise exception 'Game is not in this Learning Path.'; end if;
    if exists(select 1 from learning_board_games bg where bg.board_id=item.board_id and bg.sort_order<position
      and not exists(select 1 from attempts a where a.assignment_id=item.id and a.student_id=auth.uid()
        and a.game_id=bg.game_id and a.completion_status='completed'))
      then raise exception 'Complete the earlier games first.'; end if;
  elsif item.game_id is null then raise exception 'Assignment has no learning content.'; end if;
  perform 1 from games where id=p_game and status='published' for update;
  if not found then raise exception 'This game has not been published.'; end if;
  select sp.* into pkg from scorm_packages sp join games g on g.id=sp.game_id where sp.game_id=p_game and sp.processing_status='ready'
    and sp.launch_file=g.launch_file and sp.extraction_path=g.package_path order by sp.created_at desc limit 1;
  if pkg.id is null or pkg.scorm_version not in ('1.2','2004') then raise exception 'This game is not ready to launch.'; end if;
  select * into result from attempts where assignment_id=item.id and game_id=p_game
    and student_id=auth.uid() and status='in_progress' order by started_at desc limit 1 for update;
  if result.id is not null then
    deadline := nullif(result.launch_config->>'deadline','')::timestamptz;
    if item.allow_resume and coalesce((result.launch_config->>'allow_resume')::boolean,false)
       and exists(select 1 from scorm_packages where id=result.package_id and processing_status='ready') and (deadline is null or deadline>now()) then
      update attempts set launch_config=launch_config || jsonb_build_object('session_token',token,'session_started_at',now(),
        'session_base',coalesce((select total_time_seconds from scorm_runtime_data where attempt_id=result.id),0))
        where id=result.id returning * into result;
      return result;
    end if;
    update attempts set status='completed',completion_status='incomplete',completed_at=now() where id=result.id;
  end if;
  select count(*) into used from attempts where assignment_id=item.id and game_id=p_game and student_id=auth.uid();
  if item.max_attempts is not null and used>=item.max_attempts then raise exception 'Attempt limit reached.'; end if;
  deadline := case when item.time_limit_minutes is null then null else now()+make_interval(mins=>item.time_limit_minutes) end;
  insert into attempts(student_id,game_id,assignment_id,package_id,attempt_number,status,completion_status,launch_config)
    values(auth.uid(),p_game,item.id,pkg.id,used+1,'in_progress','incomplete',jsonb_build_object(
      'deadline',deadline,'passing_score',item.passing_score,'allow_resume',item.allow_resume,
      'session_token',token,'scorm_version',pkg.scorm_version,'session_started_at',now(),'session_base',0)) returning * into result;
  insert into scorm_runtime_data(attempt_id,raw_data) values(result.id,'{}'::jsonb);
  return result;
end $$;

-- Called by the server-only service client after validating the runtime payload.
-- The explicit actor and session token are checked against the locked attempt.
create or replace function public.learnboard_commit_runtime(p_actor uuid,p_attempt uuid,p_token uuid,
  p_raw jsonb,p_score numeric,p_completion text,p_success text,p_session_seconds integer,p_finish boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare item public.attempts; actor public.profiles; assigned public.assignments;
  src public.learning_board_group_assignments; prior public.scorm_runtime_data; elapsed integer;
begin
  select * into item from attempts where id=p_attempt and student_id=p_actor for update;
  select * into actor from profiles where id=p_actor and role='student' and is_active;
  select * into assigned from assignments where id=item.assignment_id and student_id=p_actor;
  if item.id is null or actor.id is null or assigned.id is null or item.status<>'in_progress'
     or item.launch_config->>'session_token' is distinct from p_token::text
     or actor.school_id is distinct from assigned.school_id
     or not exists(select 1 from schools where id=actor.school_id and is_active)
     then raise exception 'This learning session is no longer active.'; end if;
  if assigned.group_assignment_id is not null then
    select * into src from learning_board_group_assignments where id=assigned.group_assignment_id;
    if src.id is null or not exists(select 1 from groups g join group_members m on m.group_id=g.id
      where g.id=src.group_id and g.is_active and g.school_id=actor.school_id and m.user_id=p_actor)
      then raise exception 'Class assignment is not available.'; end if;
    assigned.status:=src.status; assigned.available_until:=src.available_until;
  end if;
  if assigned.status<>'active' or (assigned.available_from is not null and assigned.available_from>now()) or (assigned.available_until is not null and assigned.available_until<=now())
     or (assigned.board_id is not null and not exists(select 1 from learning_boards where id=assigned.board_id and status='active' and school_id=actor.school_id))
     then raise exception 'Assignment is no longer available.'; end if;
  if nullif(item.launch_config->>'deadline','')::timestamptz<=now() then
    raise exception 'Time limit reached.';
  end if;
  select * into prior from scorm_runtime_data where attempt_id=item.id;
  elapsed := greatest(coalesce(prior.total_time_seconds,0),p_session_seconds);
  insert into scorm_runtime_data(attempt_id,raw_data,lesson_status,completion_status,success_status,
    score_raw,score_min,score_max,total_time_seconds,suspend_data,location,interactions,objectives,updated_at)
  values(item.id,p_raw,p_raw->>'cmi.core.lesson_status',p_completion,p_success,
    coalesce(nullif(p_raw->>'cmi.core.score.raw','')::numeric,nullif(p_raw->>'cmi.score.raw','')::numeric),
    coalesce(nullif(p_raw->>'cmi.core.score.min','')::numeric,nullif(p_raw->>'cmi.score.min','')::numeric),
    coalesce(nullif(p_raw->>'cmi.core.score.max','')::numeric,nullif(p_raw->>'cmi.score.max','')::numeric),
    elapsed,p_raw->>'cmi.suspend_data',coalesce(p_raw->>'cmi.core.lesson_location',p_raw->>'cmi.location'),
    (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(p_raw) where key like 'cmi.interactions.%'),
    (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(p_raw) where key like 'cmi.objectives.%'),now())
  on conflict(attempt_id) do update set raw_data=excluded.raw_data,lesson_status=excluded.lesson_status,
    completion_status=excluded.completion_status,success_status=excluded.success_status,
    score_raw=excluded.score_raw,score_min=excluded.score_min,score_max=excluded.score_max,
    total_time_seconds=excluded.total_time_seconds,suspend_data=excluded.suspend_data,location=excluded.location,
    interactions=excluded.interactions,objectives=excluded.objectives,updated_at=now();
  update attempts set score=p_score,completion_status=p_completion,success_status=p_success,
    time_spent_seconds=elapsed,status=case when p_finish and p_completion='completed' then 'completed' else 'in_progress' end,
    completed_at=case when p_finish and p_completion='completed' then now() else null end where id=item.id;
end $$;

create or replace function public.learnboard_update_user(p_actor uuid,p_target uuid,p_name text,p_role text,p_active boolean,p_school uuid,p_classes uuid[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; target public.profiles;
begin
  select * into actor from profiles where id=p_actor and is_active and role in ('super_admin','admin');
  select * into target from profiles where id=p_target for update;
  if actor.id is null or target.id is null or target.role='super_admin' or p_role not in ('admin','student')
    or (actor.role<>'super_admin' and (actor.school_id is null or actor.school_id is distinct from target.school_id or actor.school_id is distinct from p_school))
    then raise exception 'User update is not permitted.'; end if;
  if p_target=p_actor and (not p_active or p_role<>target.role) then raise exception 'You cannot change your own role or deactivate your account.'; end if;
  if not exists(select 1 from schools where id=p_school and (is_active or id=target.school_id))
    then raise exception 'School is not available.'; end if;
  if p_role='student' and exists(select 1 from unnest(p_classes) c where not exists(select 1 from groups where id=c and school_id=p_school and is_active))
    then raise exception 'Students may only join active classes at their school.'; end if;
  update profiles set full_name=p_name,role=p_role,is_active=p_active,school_id=p_school,updated_at=now() where id=p_target;
  delete from group_members where user_id=p_target;
  if p_role='student' then insert into group_members(group_id,user_id) select distinct unnest(p_classes),p_target; end if;
end $$;

create or replace function public.learnboard_save_assignment(p_actor uuid,p_kind text,p_id uuid,
  p_board uuid,p_game uuid,p_target uuid,p_config jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; school uuid; result uuid; old public.assignments; old_class public.learning_board_group_assignments;
begin
  select * into actor from profiles where id=p_actor and is_active and role in ('admin','super_admin');
  if actor.id is null or p_kind not in ('class','student') then raise exception 'Assignment access denied.'; end if;
  if p_kind='class' then select school_id into school from groups where id=p_target and is_active;
  else select school_id into school from profiles where id=p_target and role='student' and is_active; end if;
  if school is null or (actor.role<>'super_admin' and actor.school_id is distinct from school)
     or not exists(select 1 from schools where id=school and is_active)
     then raise exception 'Assignment target is not available.'; end if;
  if (p_board is null)=(p_game is null) or (p_kind='class' and p_board is null)
     then raise exception 'Choose valid learning content.'; end if;
  if p_board is not null then
    perform 1 from learning_boards where id=p_board and school_id=school and status='active' for update;
    if not found and p_config->>'status'='active' then raise exception 'Learning Path is not active.'; end if;
    if not exists(select 1 from learning_boards where id=p_board and school_id=school) then raise exception 'Path school does not match.'; end if;
    if p_config->>'status'='active' and (not exists(select 1 from learning_board_games where board_id=p_board)
      or exists(select 1 from learning_board_games bg join games g on g.id=bg.game_id
        where bg.board_id=p_board and (g.status<>'published' or not exists(select 1 from scorm_packages sp
          where sp.game_id=g.id and sp.processing_status='ready' and sp.scorm_version in ('1.2','2004')))))
      then raise exception 'The path needs published games with ready SCORM packages before assignment.'; end if;
  elsif p_config->>'status'='active' and not exists(select 1 from games g where g.id=p_game and g.status='published'
    and exists(select 1 from scorm_packages sp where sp.game_id=g.id and sp.processing_status='ready' and sp.scorm_version in ('1.2','2004')))
    then raise exception 'This game is not ready for assignment.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_kind||p_target::text||coalesce(p_board,p_game)::text,0));
  if p_kind='class' then
    if p_id is not null then
      select * into old_class from learning_board_group_assignments where id=p_id for update;
      if old_class.id is null or old_class.board_id<>p_board or old_class.group_id<>p_target then raise exception 'Assignment target cannot be changed.'; end if;
    elsif exists(select 1 from learning_board_group_assignments where board_id=p_board and group_id=p_target and status='active')
      then raise exception 'This path is already assigned to this class. Edit its schedule instead.'; end if;
    if p_id is null then
      insert into learning_board_group_assignments(board_id,group_id,assigned_by) values(p_board,p_target,p_actor) returning id into result;
    else result:=p_id; end if;
    update learning_board_group_assignments set available_from=nullif(p_config->>'available_from','')::timestamptz,
      available_until=nullif(p_config->>'available_until','')::timestamptz,max_attempts=(p_config->>'max_attempts')::integer,
      time_limit_minutes=(p_config->>'time_limit_minutes')::integer,passing_score=(p_config->>'passing_score')::numeric,
      allow_resume=(p_config->>'allow_resume')::boolean,status=p_config->>'status',updated_at=now() where id=result;
  else
    if p_id is not null then
      select * into old from assignments where id=p_id and group_assignment_id is null for update;
      if old.id is null or old.student_id<>p_target or old.board_id is distinct from p_board or old.game_id is distinct from p_game
         or old.school_id is distinct from school then raise exception 'Assignment target cannot be changed.'; end if;
    elsif exists(select 1 from assignments where student_id=p_target and board_id is not distinct from p_board
      and game_id is not distinct from p_game and group_assignment_id is null and status='active')
      then raise exception 'This learning is already assigned to this student. Edit its schedule instead.'; end if;
    if p_id is null then
      insert into assignments(student_id,school_id,board_id,game_id,assigned_by) values(p_target,school,p_board,p_game,p_actor) returning id into result;
    else result:=p_id; end if;
    update assignments set available_from=nullif(p_config->>'available_from','')::timestamptz,
      available_until=nullif(p_config->>'available_until','')::timestamptz,max_attempts=(p_config->>'max_attempts')::integer,
      time_limit_minutes=(p_config->>'time_limit_minutes')::integer,passing_score=(p_config->>'passing_score')::numeric,
      allow_resume=(p_config->>'allow_resume')::boolean,status=p_config->>'status',updated_at=now() where id=result;
  end if;
  return result;
end $$;

-- Browser table writes cannot bypass the server-side assignment and runtime rules.
-- Existing server-side service-role APIs retain their access; RLS policies are untouched.
revoke insert,update,delete on public.assignments,public.learning_board_group_assignments,
  public.attempts,public.scorm_runtime_data,public.learning_board_games from anon,authenticated;
revoke insert,update,delete on public.profiles,public.schools,public.groups,public.group_members,
  public.games,public.subjects,public.skills,public.learning_boards from anon,authenticated;
-- Package metadata and content pointers remain server-only for all browser roles.
revoke all on public.scorm_packages from anon,authenticated;
revoke select on public.attempts,public.scorm_runtime_data from anon,authenticated;
grant select(id,student_id,game_id,assignment_id,attempt_number,started_at,completed_at,score,status,
  time_spent_seconds,completion_status,success_status,created_at) on public.attempts to authenticated;
revoke select on public.games from anon,authenticated;
grant select(id,name,description,status,created_by,created_at,updated_at,subject_id,skill_id,image_path,orientation_mode)
  on public.games to authenticated;
-- Keep every SCORM object private; student content is delivered through guarded routes.
update storage.buckets set public=false where id='scorm-packages';
drop policy if exists learnboard_scorm_server_only on storage.objects;
create policy learnboard_scorm_server_only on storage.objects as restrictive for all
  to anon,authenticated using(bucket_id<>'scorm-packages') with check(bucket_id<>'scorm-packages');
revoke all on function public.learnboard_update_user(uuid,uuid,text,text,boolean,uuid,uuid[]) from public,anon,authenticated;
revoke all on function public.learnboard_keep_game_history() from public,anon,authenticated;
grant execute on function public.learnboard_update_user(uuid,uuid,text,text,boolean,uuid,uuid[]) to service_role;
revoke all on function public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb) to service_role;
revoke all on function public.learnboard_save_path_games(uuid,uuid[],timestamptz) from public, anon;
revoke all on function public.learnboard_resolve_class_assignment(uuid) from public, anon;
revoke all on function public.learnboard_student_assignment(uuid) from public, anon;
revoke all on function public.learnboard_start_attempt(uuid,uuid) from public, anon;
revoke all on function public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.learnboard_save_path_games(uuid,uuid[],timestamptz) to authenticated;
grant execute on function public.learnboard_resolve_class_assignment(uuid) to authenticated;
grant execute on function public.learnboard_student_assignment(uuid) to authenticated;
grant execute on function public.learnboard_start_attempt(uuid,uuid) to authenticated;
grant execute on function public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean) to service_role;
commit;
