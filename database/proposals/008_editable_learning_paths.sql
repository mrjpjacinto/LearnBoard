-- REVIEW ONLY. Apply after a verified current backup. Replaces append-only proposal 007.
-- Independent of 005/006; do not run 007 afterward. Existing attempts and assignments are preserved.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$ begin
if replace(pg_get_functiondef('public.learnboard_save_path_games(uuid,uuid[],timestamptz)'::regprocedure),E'\r\n',E'\n') is distinct from replace($reviewed$CREATE OR REPLACE FUNCTION public.learnboard_save_path_games(p_board uuid, p_games uuid[], p_expected timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$
$reviewed$,E'\r\n',E'\n') and replace(pg_get_functiondef('public.learnboard_save_path_games(uuid,uuid[],timestamptz)'::regprocedure),E'\r\n',E'\n') is distinct from replace($append$CREATE OR REPLACE FUNCTION public.learnboard_save_path_games(p_board uuid, p_games uuid[], p_expected timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare actor public.profiles; board public.learning_boards; item uuid; pos integer := 0;
begin
  select * into actor from profiles where id = auth.uid() and is_active;
  select * into board from learning_boards where id = p_board for update;
  if actor.id is null or actor.role not in ('admin','super_admin') or board.id is null
     or board.school_id is null or (actor.role <> 'super_admin' and actor.school_id is distinct from board.school_id)
     or not exists(select 1 from schools where id=board.school_id and is_active)
     then raise exception 'Learning Path is not available.'; end if;
  if board.updated_at is distinct from p_expected then raise exception 'This path changed. Reload before saving.'; end if;
  if p_games is null or array_position(p_games,null) is not null or cardinality(p_games)>200 or exists(select 1 from unnest(p_games) g group by g having count(*)>1)
     or exists(select 1 from unnest(p_games) g where not exists(select 1 from games where id=g))
     then raise exception 'Choose a valid, unique game sequence.'; end if;
  if exists(select 1 from assignments where board_id=p_board)
     or exists(select 1 from learning_board_group_assignments where board_id=p_board) then
    -- Current assigned content is a stable prefix. Only append new games.
    if exists(select 1 from (
      select game_id,row_number() over(order by sort_order,game_id)::integer as position
      from learning_board_games where board_id=p_board
    ) current_games where p_games[current_games.position] is distinct from current_games.game_id)
    then raise exception 'Games already assigned to students must stay in their current order. Add new games at the end.';end if;
  end if;
  if exists(select 1 from assignments where board_id=p_board)
     or exists(select 1 from learning_board_group_assignments where board_id=p_board) then
    pos := (select coalesce(max(sort_order),-1)+1 from learning_board_games where board_id=p_board);
    foreach item in array p_games loop
      if not exists(select 1 from learning_board_games where board_id=p_board and game_id=item) then
        insert into learning_board_games(board_id,game_id,sort_order) values(p_board,item,pos);pos:=pos+1;
      end if;
    end loop;
    update learning_boards set updated_at=clock_timestamp() where id=p_board;
    return;
  end if;
  delete from learning_board_games where board_id=p_board;
  foreach item in array p_games loop
    insert into learning_board_games(board_id,game_id,sort_order) values(p_board,item,pos);
    pos := pos+1;
  end loop;
  update learning_boards set updated_at=clock_timestamp() where id=p_board;
end $function$
$append$,E'\r\n',E'\n') then raise exception 'Function learnboard_save_path_games differs from reviewed catalog. Inspect before applying.'; end if;
if replace(pg_get_functiondef('public.learnboard_start_attempt(uuid,uuid)'::regprocedure),E'\r\n',E'\n') is distinct from replace($reviewed$CREATE OR REPLACE FUNCTION public.learnboard_start_attempt(p_assignment uuid, p_game uuid)
 RETURNS attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$
$reviewed$,E'\r\n',E'\n') then raise exception 'Function learnboard_start_attempt differs from reviewed catalog. Inspect before applying.'; end if;
if replace(pg_get_functiondef('public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean)'::regprocedure),E'\r\n',E'\n') is distinct from replace($reviewed$CREATE OR REPLACE FUNCTION public.learnboard_commit_runtime(p_actor uuid, p_attempt uuid, p_token uuid, p_raw jsonb, p_score numeric, p_completion text, p_success text, p_session_seconds integer, p_finish boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$
$reviewed$,E'\r\n',E'\n') then raise exception 'Function learnboard_commit_runtime differs from reviewed catalog. Inspect before applying.'; end if;
if exists(select 1 from pg_trigger where tgrelid='public.learning_board_games'::regclass and not tgisinternal and tgname='learnboard_path_sequence_guard') then raise exception 'Separate sequence guard requires review.';end if;
if replace(pg_get_functiondef('public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb)'::regprocedure),E'\r\n',E'\n') is distinct from replace($assignment$CREATE OR REPLACE FUNCTION public.learnboard_save_assignment(p_actor uuid, p_kind text, p_id uuid, p_board uuid, p_game uuid, p_target uuid, p_config jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
end $function$
$assignment$,E'\r\n',E'\n') then raise exception 'Assignment function differs from reviewed catalog. Inspect before applying.';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.learnboard_save_path_games(p_board uuid, p_games uuid[], p_expected timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare actor public.profiles; board public.learning_boards; item uuid; pos integer := 0;
begin
  select * into actor from profiles where id = auth.uid() and is_active;
  select * into board from learning_boards where id = p_board for update;
  if actor.id is null or actor.role not in ('admin','super_admin') or board.id is null
     or board.school_id is null or (actor.role <> 'super_admin' and actor.school_id is distinct from board.school_id)
     or not exists(select 1 from schools where id=board.school_id and is_active)
     then raise exception 'Learning Path is not available.'; end if;
  if board.updated_at is distinct from p_expected then raise exception 'This path changed. Reload before saving.'; end if;
  if p_games is null or array_position(p_games,null) is not null or cardinality(p_games)>200 or exists(select 1 from unnest(p_games) g group by g having count(*)>1)
     or exists(select 1 from unnest(p_games) g where not exists(select 1 from games where id=g))
     then raise exception 'Choose a valid, unique game sequence.'; end if;
  -- Delete relationships only. Keep assignments, games and all student history.
  delete from learning_board_games where board_id=p_board and not(game_id=any(p_games));
  foreach item in array p_games loop
    update learning_board_games set sort_order=pos where board_id=p_board and game_id=item;
    if not found then insert into learning_board_games(board_id,game_id,sort_order) values(p_board,item,pos);end if;
    pos:=pos+1;
  end loop;
  update learning_boards set updated_at=clock_timestamp() where id=p_board;
end $function$;
CREATE OR REPLACE FUNCTION public.learnboard_start_attempt(p_assignment uuid, p_game uuid)
 RETURNS attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare item public.assignments; result public.attempts; pkg public.scorm_packages;
  used integer; token uuid := gen_random_uuid(); deadline timestamptz; position integer;
begin
  item := learnboard_student_assignment(p_assignment);
  if item.game_id is not null and item.game_id<>p_game then raise exception 'Game is not assigned.'; end if;
  if item.board_id is not null then
    select sort_order into position from learning_board_games where board_id=item.board_id and game_id=p_game;
    if position is null then raise exception 'Game is not in this Learning Path.'; end if;
    if not exists(select 1 from attempts where assignment_id=item.id and game_id=p_game and student_id=auth.uid() and (status='in_progress' or completion_status='completed'))
    and exists(select 1 from learning_board_games bg where bg.board_id=item.board_id and bg.sort_order<position
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
end $function$;
CREATE OR REPLACE FUNCTION public.learnboard_commit_runtime(p_actor uuid, p_attempt uuid, p_token uuid, p_raw jsonb, p_score numeric, p_completion text, p_success text, p_session_seconds integer, p_finish boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  -- A removed individual student may finish the already-open session, never launch anew.
  if assigned.group_assignment_id is null and assigned.status='cancelled' and item.launch_config->>'path_removal_finish'='true' then
    assigned.status:='active';assigned.available_from:=null;
    assigned.available_until:=nullif(item.launch_config->>'path_removal_until','')::timestamptz;
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
end $function$;
create function public.lumentrail_remove_path_student(p_actor uuid,p_board uuid,p_assignment uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor profiles; board learning_boards; item assignments;
begin
 select * into actor from profiles where id=p_actor and is_active and role in ('admin','super_admin');
 select * into board from learning_boards where id=p_board for update;
 if actor.id is null or board.id is null or board.school_id is null or (actor.role<>'super_admin' and actor.school_id is distinct from board.school_id) or not exists(select 1 from schools where id=board.school_id and is_active) then raise exception 'Path access denied.';end if;
 select * into item from assignments where id=p_assignment and board_id=p_board and school_id=board.school_id and group_assignment_id is null for update;
 if item.id is null then raise exception 'Individual assignment not found. Manage class membership separately.';end if;
 if item.status='active' then
 update attempts set launch_config=launch_config || jsonb_build_object('path_removal_finish',true,'path_removal_until',item.available_until) where assignment_id=item.id and status='in_progress';
 end if;
 update assignments set status='cancelled',updated_at=now() where id=item.id;
end $$;
revoke all on function public.lumentrail_remove_path_student(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.lumentrail_remove_path_student(uuid,uuid,uuid) to service_role;
CREATE OR REPLACE FUNCTION public.learnboard_save_assignment(p_actor uuid, p_kind text, p_id uuid, p_board uuid, p_game uuid, p_target uuid, p_config jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    if p_config->>'status'='active' and (exists(select 1 from learning_board_games bg join games g on g.id=bg.game_id
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
end $function$;
notify pgrst,'reload schema';
commit;
