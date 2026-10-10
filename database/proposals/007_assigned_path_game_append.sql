-- Allow new games at the end of assigned paths; preserve existing order and all history.
-- Independent of proposals 005 and 006. No data or assignment deletion.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$ begin
 if replace(pg_get_functiondef('public.learnboard_save_path_games(uuid,uuid[],timestamptz)'::regprocedure),E'\r\n',E'\n') is distinct from $reviewed$CREATE OR REPLACE FUNCTION public.learnboard_save_path_games(p_board uuid, p_games uuid[], p_expected timestamp with time zone)
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
$reviewed$
 then raise exception 'Path sequence function differs from reviewed catalog. Inspect before applying.';end if;
 if exists(select 1 from pg_trigger where tgrelid='public.learning_board_games'::regclass and not tgisinternal and tgname='learnboard_path_sequence_guard')
 then raise exception 'A separate path sequence guard is present. Review it before applying this change.';end if;
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
end $function$;

commit;
