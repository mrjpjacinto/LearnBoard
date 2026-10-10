-- Additive migration: one game, many skills; existing game IDs, packages and history preserved.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table public.games,public.skills,public.subjects in share row exclusive mode;
create table public.game_skills (
 game_id uuid not null references public.games(id) on delete cascade,
 skill_id uuid not null references public.skills(id) on delete cascade,
 primary key(game_id,skill_id)
);
create index game_skills_skill_idx on public.game_skills(skill_id,game_id);
alter table public.game_skills enable row level security;
revoke all on public.game_skills from public,anon,authenticated;
grant select,insert,update,delete on public.game_skills to service_role;
-- Reads follow the existing game visibility policy. Classification writes use the server only.
grant select on public.game_skills to authenticated;
create policy game_skill_read on public.game_skills for select to authenticated
 using(exists(select 1 from public.games g where g.id=game_id));
insert into public.game_skills(game_id,skill_id)
 select g.id,g.skill_id from public.games g join public.skills s on s.id=g.skill_id;

create function public.lumentrail_refresh_game_classification(p_game uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare chosen uuid; subject uuid;
begin
 perform 1 from public.games where id=p_game for update;
 select s.id,s.subject_id into chosen,subject from public.game_skills gs
 join public.skills s on s.id=gs.skill_id join public.subjects sub on sub.id=s.subject_id
 where gs.game_id=p_game
 order by (s.id=(select skill_id from public.games where id=p_game)) desc nulls last,s.id limit 1;
 update public.games set skill_id=chosen,subject_id=subject where id=p_game
 and (skill_id is distinct from chosen or subject_id is distinct from subject);
end $$;
create function public.lumentrail_game_skill_removed()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.lumentrail_refresh_game_classification(old.game_id);return old;end $$;
create trigger game_skill_removed after delete on public.game_skills
 for each row execute function public.lumentrail_game_skill_removed();
-- Keep legacy primary columns compatible for new uploads and cascading FK updates.
create function public.lumentrail_game_primary_sync()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.skill_id is not null then
  insert into public.game_skills(game_id,skill_id) values(new.id,new.skill_id) on conflict do nothing;
 else
  perform public.lumentrail_refresh_game_classification(new.id);
 end if;
 return new;
end $$;
create trigger game_primary_sync after insert or update of skill_id on public.games
 for each row execute function public.lumentrail_game_primary_sync();
create function public.lumentrail_skill_subject_sync()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare affected uuid;
begin
 for affected in select game_id from public.game_skills where skill_id=new.id order by game_id
 loop perform public.lumentrail_refresh_game_classification(affected);end loop;
 return new;
end $$;
create trigger skill_subject_sync after update of subject_id on public.skills
 for each row execute function public.lumentrail_skill_subject_sync();

-- Normalize legacy primary labels from the actual surviving skill associations.
do $normalize$ declare game uuid; begin
 for game in select id from public.games order by id loop
  perform public.lumentrail_refresh_game_classification(game);
 end loop;
end $normalize$;

create function public.lumentrail_save_game_skills(p_game uuid,p_skills uuid[],p_values jsonb)
returns setof public.games language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[]; subject uuid;
begin
 if coalesce(cardinality(p_skills),0)=0 or cardinality(p_skills)>50 or array_position(p_skills,null) is not null
 then raise exception 'Choose between 1 and 50 valid skills.';end if;
 select array_agg(distinct id) into ids from unnest(p_skills) id;
 perform 1 from public.games where id=p_game for update;
 if not found then raise exception 'Game not found.';end if;
 -- Lock referenced classifications against concurrent deletion or reassignment.
 perform s.id from public.skills s join public.subjects sub on sub.id=s.subject_id
 where s.id=any(ids) and s.is_active and sub.is_active order by s.id for key share of s,sub;
 if (select count(*) from public.skills s join public.subjects sub on sub.id=s.subject_id
 where s.id=any(ids) and s.is_active and sub.is_active)<>cardinality(ids)
 then raise exception 'Choose available skills.';end if;
 select subject_id into subject from public.skills where id=p_skills[1];
 insert into public.game_skills(game_id,skill_id) select p_game,id from unnest(ids) id on conflict do nothing;
 delete from public.game_skills where game_id=p_game and not(skill_id=any(ids));
 update public.games set
 name=case when p_values?'name' then p_values->>'name' else name end,
 description=case when p_values?'description' then p_values->>'description' else description end,
 image_path=case when p_values?'image_path' then p_values->>'image_path' else image_path end,
 orientation_mode='landscape',skill_id=p_skills[1],subject_id=subject,updated_at=now()
 where id=p_game;
 return query select * from public.games where id=p_game;
end $$;
revoke all on function public.lumentrail_refresh_game_classification(uuid),public.lumentrail_game_skill_removed(),public.lumentrail_game_primary_sync(),public.lumentrail_skill_subject_sync(),public.lumentrail_save_game_skills(uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.lumentrail_save_game_skills(uuid,uuid[],jsonb) to service_role;
notify pgrst,'reload schema';
commit;
