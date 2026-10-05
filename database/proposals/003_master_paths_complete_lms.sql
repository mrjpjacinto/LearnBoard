-- PROPOSAL ONLY: review and approve before applying to the EXISTING LearnBoard Database.
-- Replaces the incomplete 003 schema draft. Do not run 001 or the schema-only draft.
-- No existing users, schools, paths, content, assignments, attempts or results are deleted.
-- Apply with the coordinated application release; older clients are not Master-aware.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Fail before changes if reviewed function definitions have drifted.
do $preflight$ begin
  if md5(pg_get_functiondef(to_regprocedure('public.validate_assignment_school()'))) is distinct from '05eaae2e7a8686b69eb6724c85f3fa82' then raise exception 'Catalog changed: validate_assignment_school. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.validate_learning_board_group_school()'))) is distinct from '4e8e7cc6fdab314012c4f2c6a81443a8' then raise exception 'Catalog changed: validate_learning_board_group_school. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb)'))) is distinct from '37caf5022f6a81c17fac83d865436f3f' then raise exception 'Catalog changed: learnboard_save_assignment. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_save_path_games(uuid,uuid[],timestamp with time zone)'))) is distinct from '352f2f5e2d43b4c5d28cc8d0d6b57ab2' then raise exception 'Catalog changed: learnboard_save_path_games. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_resolve_class_assignment(uuid)'))) is distinct from 'a44caa1529fbb70f9afa9cd7b1a815a1' then raise exception 'Catalog changed: learnboard_resolve_class_assignment. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_student_assignment(uuid)'))) is distinct from '23efb3dc7fd7025295f0050b40f4e3f3' then raise exception 'Catalog changed: learnboard_student_assignment. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_start_attempt(uuid,uuid)'))) is distinct from '31ec65a12ce008a1b7b3625fb1821737' then raise exception 'Catalog changed: learnboard_start_attempt. Review the migration again.'; end if;
  if md5(pg_get_functiondef(to_regprocedure('public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean)'))) is distinct from '508536a0605a9f7328870ea445f2cf57' then raise exception 'Catalog changed: learnboard_commit_runtime. Review the migration again.'; end if;

-- Check reviewed constraints and policy expressions before altering either.
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_id_fkey') is distinct from 'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE' then raise exception 'Constraint changed: profiles_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: profiles_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_role_check') is distinct from 'CHECK ((role = ANY (ARRAY[''super_admin''::text, ''admin''::text, ''student''::text])))' then raise exception 'Constraint changed: profiles_role_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_school_id_fkey') is distinct from 'FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: profiles_school_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_created_by_fkey') is distinct from 'FOREIGN KEY (created_by) REFERENCES profiles(id)' then raise exception 'Constraint changed: games_created_by_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_orientation_mode_check') is distinct from 'CHECK ((orientation_mode = ANY (ARRAY[''landscape''::text, ''portrait''::text])))' then raise exception 'Constraint changed: games_orientation_mode_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: games_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_scorm_version_check') is distinct from 'CHECK ((scorm_version = ANY (ARRAY[''SCORM 1.2''::text, ''SCORM 2004''::text])))' then raise exception 'Constraint changed: games_scorm_version_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_skill_id_fkey') is distinct from 'FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL' then raise exception 'Constraint changed: games_skill_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_status_check') is distinct from 'CHECK ((status = ANY (ARRAY[''draft''::text, ''published''::text, ''archived''::text])))' then raise exception 'Constraint changed: games_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.games'::regclass and conname='games_subject_id_fkey') is distinct from 'FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL' then raise exception 'Constraint changed: games_subject_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_packages'::regclass and conname='scorm_packages_game_id_fkey') is distinct from 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE' then raise exception 'Constraint changed: scorm_packages_game_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_packages'::regclass and conname='scorm_packages_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: scorm_packages_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_packages'::regclass and conname='scorm_packages_processing_status_check') is distinct from 'CHECK ((processing_status = ANY (ARRAY[''pending''::text, ''processing''::text, ''ready''::text, ''failed''::text])))' then raise exception 'Constraint changed: scorm_packages_processing_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_packages'::regclass and conname='scorm_packages_uploaded_by_fkey') is distinct from 'FOREIGN KEY (uploaded_by) REFERENCES profiles(id)' then raise exception 'Constraint changed: scorm_packages_uploaded_by_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_boards'::regclass and conname='learning_boards_created_by_fkey') is distinct from 'FOREIGN KEY (created_by) REFERENCES profiles(id)' then raise exception 'Constraint changed: learning_boards_created_by_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_boards'::regclass and conname='learning_boards_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: learning_boards_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_boards'::regclass and conname='learning_boards_school_id_fkey') is distinct from 'FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: learning_boards_school_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_boards'::regclass and conname='learning_boards_status_check') is distinct from 'CHECK ((status = ANY (ARRAY[''active''::text, ''archived''::text])))' then raise exception 'Constraint changed: learning_boards_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_games'::regclass and conname='learning_board_games_board_id_fkey') is distinct from 'FOREIGN KEY (board_id) REFERENCES learning_boards(id) ON DELETE CASCADE' then raise exception 'Constraint changed: learning_board_games_board_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_games'::regclass and conname='learning_board_games_board_id_game_id_key') is distinct from 'UNIQUE (board_id, game_id)' then raise exception 'Constraint changed: learning_board_games_board_id_game_id_key'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_games'::regclass and conname='learning_board_games_game_id_fkey') is distinct from 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE' then raise exception 'Constraint changed: learning_board_games_game_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_games'::regclass and conname='learning_board_games_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: learning_board_games_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_assigned_by_fkey') is distinct from 'FOREIGN KEY (assigned_by) REFERENCES profiles(id)' then raise exception 'Constraint changed: assignments_assigned_by_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_board_id_fkey') is distinct from 'FOREIGN KEY (board_id) REFERENCES learning_boards(id) ON DELETE CASCADE' then raise exception 'Constraint changed: assignments_board_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_exactly_one_target_check') is distinct from 'CHECK ((((game_id IS NOT NULL) AND (board_id IS NULL)) OR ((game_id IS NULL) AND (board_id IS NOT NULL))))' then raise exception 'Constraint changed: assignments_exactly_one_target_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_game_id_fkey') is distinct from 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE' then raise exception 'Constraint changed: assignments_game_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_group_assignment_id_fkey') is distinct from 'FOREIGN KEY (group_assignment_id) REFERENCES learning_board_group_assignments(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: assignments_group_assignment_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: assignments_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_school_id_fkey') is distinct from 'FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: assignments_school_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_status_check') is distinct from 'CHECK ((status = ANY (ARRAY[''scheduled''::text, ''active''::text, ''expired''::text, ''completed''::text, ''cancelled''::text])))' then raise exception 'Constraint changed: assignments_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.assignments'::regclass and conname='assignments_student_id_fkey') is distinct from 'FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE' then raise exception 'Constraint changed: assignments_student_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_assignment_id_fkey') is distinct from 'FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL' then raise exception 'Constraint changed: attempts_assignment_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_game_id_fkey') is distinct from 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE' then raise exception 'Constraint changed: attempts_game_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_package_id_fkey') is distinct from 'FOREIGN KEY (package_id) REFERENCES scorm_packages(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: attempts_package_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: attempts_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_status_check') is distinct from 'CHECK ((status = ANY (ARRAY[''in_progress''::text, ''completed''::text, ''passed''::text, ''failed''::text, ''suspended''::text])))' then raise exception 'Constraint changed: attempts_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.attempts'::regclass and conname='attempts_student_id_fkey') is distinct from 'FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE' then raise exception 'Constraint changed: attempts_student_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_runtime_data'::regclass and conname='scorm_runtime_data_attempt_id_fkey') is distinct from 'FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE' then raise exception 'Constraint changed: scorm_runtime_data_attempt_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_runtime_data'::regclass and conname='scorm_runtime_data_attempt_id_key') is distinct from 'UNIQUE (attempt_id)' then raise exception 'Constraint changed: scorm_runtime_data_attempt_id_key'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.scorm_runtime_data'::regclass and conname='scorm_runtime_data_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: scorm_runtime_data_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.activity_logs'::regclass and conname='activity_logs_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: activity_logs_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.activity_logs'::regclass and conname='activity_logs_user_id_fkey') is distinct from 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL' then raise exception 'Constraint changed: activity_logs_user_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.groups'::regclass and conname='groups_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: groups_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.groups'::regclass and conname='groups_school_id_fkey') is distinct from 'FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT' then raise exception 'Constraint changed: groups_school_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.group_members'::regclass and conname='group_members_group_id_fkey') is distinct from 'FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE' then raise exception 'Constraint changed: group_members_group_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.group_members'::regclass and conname='group_members_pkey') is distinct from 'PRIMARY KEY (group_id, user_id)' then raise exception 'Constraint changed: group_members_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.group_members'::regclass and conname='group_members_user_id_fkey') is distinct from 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE' then raise exception 'Constraint changed: group_members_user_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.schools'::regclass and conname='schools_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: schools_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_attempt_id_fkey') is distinct from 'FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE' then raise exception 'Constraint changed: game_score_events_attempt_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_game_id_fkey') is distinct from 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE' then raise exception 'Constraint changed: game_score_events_game_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: game_score_events_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_quiz_attempt_check') is distinct from 'CHECK ((quiz_attempt >= 1))' then raise exception 'Constraint changed: game_score_events_quiz_attempt_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_speed_check') is distinct from 'CHECK (((speed IS NULL) OR (speed >= (0)::numeric)))' then raise exception 'Constraint changed: game_score_events_speed_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_score_events'::regclass and conname='game_score_events_student_id_fkey') is distinct from 'FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE' then raise exception 'Constraint changed: game_score_events_student_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.subjects'::regclass and conname='subjects_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: subjects_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.skills'::regclass and conname='skills_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: skills_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.skills'::regclass and conname='skills_subject_id_fkey') is distinct from 'FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE' then raise exception 'Constraint changed: skills_subject_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_assigned_by_fkey') is distinct from 'FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL' then raise exception 'Constraint changed: learning_board_group_assignments_assigned_by_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_board_id_fkey') is distinct from 'FOREIGN KEY (board_id) REFERENCES learning_boards(id) ON DELETE CASCADE' then raise exception 'Constraint changed: learning_board_group_assignments_board_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_board_id_group_id_key') is distinct from 'UNIQUE (board_id, group_id)' then raise exception 'Constraint changed: learning_board_group_assignments_board_id_group_id_key'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_dates_check') is distinct from 'CHECK (((available_until IS NULL) OR (available_from IS NULL) OR (available_until > available_from)))' then raise exception 'Constraint changed: learning_board_group_assignments_dates_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_group_id_fkey') is distinct from 'FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE' then raise exception 'Constraint changed: learning_board_group_assignments_group_id_fkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_max_attempts_check') is distinct from 'CHECK (((max_attempts IS NULL) OR (max_attempts > 0)))' then raise exception 'Constraint changed: learning_board_group_assignments_max_attempts_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_passing_score_check') is distinct from 'CHECK (((passing_score >= (0)::numeric) AND (passing_score <= (100)::numeric)))' then raise exception 'Constraint changed: learning_board_group_assignments_passing_score_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_pkey') is distinct from 'PRIMARY KEY (id)' then raise exception 'Constraint changed: learning_board_group_assignments_pkey'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_status_check') is distinct from 'CHECK ((status = ANY (ARRAY[''scheduled''::text, ''active''::text, ''expired''::text, ''cancelled''::text])))' then raise exception 'Constraint changed: learning_board_group_assignments_status_check'; end if;
  if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.learning_board_group_assignments'::regclass and conname='learning_board_group_assignments_time_limit_check') is distinct from 'CHECK (((time_limit_minutes IS NULL) OR (time_limit_minutes > 0)))' then raise exception 'Constraint changed: learning_board_group_assignments_time_limit_check'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='School admins can create own school assignments') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can create own school assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='School admins can delete own school assignments') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can delete own school assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='School admins can update own school assignments') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can update own school assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='School admins can view own school assignments') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='Students can view their assignments') is distinct from '{"qual":"(student_id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view their assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='Super admins can create assignments') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can create assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='Super admins can delete assignments') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can delete assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='Super admins can update assignments') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='assignments' and policyname='Super admins can view all assignments') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='attempts' and policyname='Students can create their attempts') is distinct from '{"qual":null,"with_check":"(student_id = auth.uid())","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can create their attempts'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='attempts' and policyname='Students can update their attempts') is distinct from '{"qual":"(student_id = auth.uid())","with_check":"(student_id = auth.uid())","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can update their attempts'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='attempts' and policyname='Students can view their attempts') is distinct from '{"qual":"(student_id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view their attempts'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='game_score_events' and policyname='Students can view own game score events') is distinct from '{"qual":"(student_id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["public"]}'::jsonb then raise exception 'Policy changed: Students can view own game score events'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='games' and policyname='Students can view published games') is distinct from '{"qual":"((status = ''published''::text) OR (created_by = auth.uid()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view published games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Admins can add group members') is distinct from '{"qual":null,"with_check":"is_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can add group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Admins can remove group members') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can remove group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Admins can view group members') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can view group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='School admins can add own school group members') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM groups\n  WHERE ((groups.id = group_members.group_id) AND (groups.school_id = current_school_id())))) AND (EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = group_members.user_id) AND (profiles.school_id = current_school_id()) AND (profiles.role = ''student''::text)))))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can add own school group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='School admins can remove own school group members') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM groups\n  WHERE ((groups.id = group_members.group_id) AND (groups.school_id = current_school_id())))))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can remove own school group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='School admins can view own school group members') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM groups\n  WHERE ((groups.id = group_members.group_id) AND (groups.school_id = current_school_id())))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Students can view own group memberships') is distinct from '{"qual":"(user_id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view own group memberships'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Super admins can add group members') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can add group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Super admins can remove group members') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can remove group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='group_members' and policyname='Super admins can view all group members') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all group members'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Admins can create groups') is distinct from '{"qual":null,"with_check":"is_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can create groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Admins can delete groups') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can delete groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Admins can update groups') is distinct from '{"qual":"is_admin()","with_check":"is_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can update groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Admins can view groups') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can view groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='School admins can create own school groups') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can create own school groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='School admins can delete own school groups') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can delete own school groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='School admins can update own school groups') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can update own school groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='School admins can view own school groups') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Students can view their groups') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM group_members\n  WHERE ((group_members.group_id = groups.id) AND (group_members.user_id = auth.uid()))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view their groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Super admins can create groups') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can create groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Super admins can delete groups') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can delete groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Super admins can update groups') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='groups' and policyname='Super admins can view all groups') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all groups'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='School admins can add own school learning path games') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_games.board_id) AND (lb.school_id = current_school_id())))))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can add own school learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='School admins can remove own school learning path games') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_games.board_id) AND (lb.school_id = current_school_id())))))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can remove own school learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='School admins can update own school learning path games') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_games.board_id) AND (lb.school_id = current_school_id())))))","with_check":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_games.board_id) AND (lb.school_id = current_school_id())))))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can update own school learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='School admins can view own school learning path games') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_games.board_id) AND (lb.school_id = current_school_id())))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='Students can view assigned learning path games') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE (lb.id = learning_board_games.board_id)))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view assigned learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='Super admins can add learning path games') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can add learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='Super admins can remove learning path games') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can remove learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='Super admins can update learning path games') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_games' and policyname='Super admins can view all learning path games') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all learning path games'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='School admins can create own class path assignments') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_group_assignments.board_id) AND (lb.school_id = current_school_id())))) AND (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = learning_board_group_assignments.group_id) AND (g.school_id = current_school_id())))))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can create own class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='School admins can delete own class path assignments') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_group_assignments.board_id) AND (lb.school_id = current_school_id())))))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can delete own class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='School admins can update own class path assignments') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_group_assignments.board_id) AND (lb.school_id = current_school_id())))))","with_check":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_group_assignments.board_id) AND (lb.school_id = current_school_id())))) AND (EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = learning_board_group_assignments.group_id) AND (g.school_id = current_school_id())))))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can update own class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='School admins can view own class path assignments') is distinct from '{"qual":"(is_school_admin() AND (EXISTS ( SELECT 1\n   FROM learning_boards lb\n  WHERE ((lb.id = learning_board_group_assignments.board_id) AND (lb.school_id = current_school_id())))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='Students can view own class path assignments') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM group_members gm\n  WHERE ((gm.group_id = learning_board_group_assignments.group_id) AND (gm.user_id = auth.uid()))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view own class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='Super admins can create class path assignments') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can create class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='Super admins can delete class path assignments') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can delete class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='Super admins can update class path assignments') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_board_group_assignments' and policyname='Super admins can view all class path assignments') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all class path assignments'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='School admins can create own school learning paths') is distinct from '{"qual":null,"with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can create own school learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='School admins can delete own school learning paths') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can delete own school learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='School admins can update own school learning paths') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":"(is_school_admin() AND (school_id = current_school_id()))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can update own school learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='School admins can view own school learning paths') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='Students can view assigned learning paths') is distinct from '{"qual":"((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = ''student''::text) AND (p.is_active = true) AND (p.school_id = learning_boards.school_id)))) AND ((EXISTS ( SELECT 1\n   FROM assignments a\n  WHERE ((a.student_id = auth.uid()) AND (a.board_id = learning_boards.id) AND (a.status = ANY (ARRAY[''scheduled''::text, ''active''::text, ''completed''::text]))))) OR (EXISTS ( SELECT 1\n   FROM (learning_board_group_assignments lga\n     JOIN group_members gm ON ((gm.group_id = lga.group_id)))\n  WHERE ((lga.board_id = learning_boards.id) AND (gm.user_id = auth.uid()) AND (lga.status = ANY (ARRAY[''scheduled''::text, ''active''::text])))))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view assigned learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='Super admins can create learning paths') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can create learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='Super admins can delete learning paths') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"DELETE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can delete learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='Super admins can update learning paths') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='learning_boards' and policyname='Super admins can view all learning paths') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all learning paths'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='profiles' and policyname='Admins can view all profiles') is distinct from '{"qual":"is_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can view all profiles'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='profiles' and policyname='School admins can view own school profiles') is distinct from '{"qual":"(is_school_admin() AND (school_id = current_school_id()))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: School admins can view own school profiles'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='profiles' and policyname='Super admins can view all profiles') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all profiles'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='profiles' and policyname='Users can safely update own profile') is distinct from '{"qual":"(id = auth.uid())","with_check":"((id = auth.uid()) AND (role = current_user_role()) AND (is_active = current_user_active_status()))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Users can safely update own profile'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='profiles' and policyname='Users can view their own profile') is distinct from '{"qual":"(id = auth.uid())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Users can view their own profile'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='schools' and policyname='Admins can view own school') is distinct from '{"qual":"((id = current_school_id()) AND is_admin())","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Admins can view own school'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='schools' and policyname='Super admins can create schools') is distinct from '{"qual":null,"with_check":"is_super_admin()","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can create schools'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='schools' and policyname='Super admins can update schools') is distinct from '{"qual":"is_super_admin()","with_check":"is_super_admin()","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can update schools'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='schools' and policyname='Super admins can view all schools') is distinct from '{"qual":"is_super_admin()","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Super admins can view all schools'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='scorm_runtime_data' and policyname='Students can create runtime data') is distinct from '{"qual":null,"with_check":"(EXISTS ( SELECT 1\n   FROM attempts a\n  WHERE ((a.id = scorm_runtime_data.attempt_id) AND (a.student_id = auth.uid()))))","cmd":"INSERT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can create runtime data'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='scorm_runtime_data' and policyname='Students can update runtime data') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM attempts a\n  WHERE ((a.id = scorm_runtime_data.attempt_id) AND (a.student_id = auth.uid()))))","with_check":"(EXISTS ( SELECT 1\n   FROM attempts a\n  WHERE ((a.id = scorm_runtime_data.attempt_id) AND (a.student_id = auth.uid()))))","cmd":"UPDATE","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can update runtime data'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='scorm_runtime_data' and policyname='Students can view their runtime data') is distinct from '{"qual":"(EXISTS ( SELECT 1\n   FROM attempts a\n  WHERE ((a.id = scorm_runtime_data.attempt_id) AND (a.student_id = auth.uid()))))","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Students can view their runtime data'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='skills' and policyname='Authenticated users can view active skills') is distinct from '{"qual":"(is_active = true)","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Authenticated users can view active skills'; end if;
  if (select jsonb_build_object('qual',qual,'with_check',with_check,'cmd',cmd,'permissive',permissive,'roles',roles) from pg_policies where schemaname='public' and tablename='subjects' and policyname='Authenticated users can view active subjects') is distinct from '{"qual":"(is_active = true)","with_check":null,"cmd":"SELECT","permissive":"PERMISSIVE","roles":["authenticated"]}'::jsonb then raise exception 'Policy changed: Authenticated users can view active subjects'; end if;
end $preflight$;

create table public.learning_board_school_availability (
  board_id uuid not null references public.learning_boards(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  is_available boolean not null default true,
  made_available_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(board_id,school_id)
);
create index learning_board_school_availability_school
  on public.learning_board_school_availability(school_id,board_id) where is_available;
alter table public.assignments add column score_visible boolean not null default true;
alter table public.learning_board_group_assignments add column score_visible boolean not null default true;

-- Only NEW assignment creation checks current Master availability. Existing
-- assignments survive withdrawal/archival, subject to schedule and membership.
create function public.learnboard_path_eligible(p_board uuid,p_school uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from learning_boards b where b.id=p_board and b.status='active'
    and exists(select 1 from schools where id=p_school and is_active)
    and (b.school_id=p_school or (b.school_id is null and exists(
      select 1 from learning_board_school_availability v
      where v.board_id=b.id and v.school_id=p_school and v.is_available))));
$$;

create function public.learnboard_view_path(p_board uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from profiles p join learning_boards b on b.id=p_board
    where p.id=auth.uid() and p.is_active and (
      p.role='super_admin' or
      (p.role='admin' and exists(select 1 from schools where id=p.school_id and is_active)
        and (b.school_id=p.school_id or (b.school_id is null and exists(
          select 1 from learning_board_school_availability v
          where v.board_id=b.id and v.school_id=p.school_id and v.is_available))
          or (b.school_id is null and (exists(select 1 from assignments a where a.board_id=b.id and a.school_id=p.school_id)
            or exists(select 1 from learning_board_group_assignments a join groups g on g.id=a.group_id
              where a.board_id=b.id and g.school_id=p.school_id))))) or
      (p.role='student' and exists(select 1 from schools where id=p.school_id and is_active)
        and (b.school_id=p.school_id or b.school_id is null)
        and (exists(select 1 from assignments a where a.board_id=b.id and a.student_id=p.id and a.school_id=p.school_id)
          or exists(select 1 from learning_board_group_assignments a join groups g on g.id=a.group_id
            join group_members m on m.group_id=g.id where a.board_id=b.id and g.school_id=p.school_id and m.user_id=p.id)))
    ));
$$;

create function public.learnboard_availability_guard()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from learning_boards where id=new.board_id and school_id is null for update;
  if not found then raise exception 'School availability applies only to LearnBoard Master Paths.'; end if;
  if tg_op='UPDATE' and (new.board_id<>old.board_id or new.school_id<>old.school_id) then
    raise exception 'Availability targets cannot be changed.';
  end if;
  new.updated_at:=clock_timestamp(); return new;
end $$;
create trigger learnboard_availability_guard before insert or update on public.learning_board_school_availability
  for each row execute function public.learnboard_availability_guard();

create function public.learnboard_set_path_schools(p_actor uuid,p_board uuid,p_schools uuid[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item uuid;
begin
  if not exists(select 1 from profiles where id=p_actor and role='super_admin' and is_active)
    then raise exception 'Super Admin access is required.'; end if;
  perform 1 from learning_boards where id=p_board and school_id is null for update;
  if not found then raise exception 'Master Path not found.'; end if;
  if p_schools is null or cardinality(p_schools)>1000
    or exists(select 1 from unnest(p_schools) s where s is null or not exists(select 1 from schools where id=s and is_active))
    then raise exception 'Choose active schools.'; end if;
  update learning_board_school_availability set is_available=false,made_available_by=p_actor
    where board_id=p_board and not(school_id=any(p_schools));
  foreach item in array p_schools loop
    insert into learning_board_school_availability(board_id,school_id,made_available_by)
      values(p_board,item,p_actor)
      on conflict(board_id,school_id) do update set is_available=true,made_available_by=p_actor;
  end loop;
end $$;

create function public.learnboard_customize_path(p_actor uuid,p_board uuid,p_school uuid,p_name text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor public.profiles; source public.learning_boards; result uuid;
begin
  select * into actor from profiles where id=p_actor and is_active and role in ('admin','super_admin');
  if actor.id is null or (actor.role='admin' and actor.school_id is distinct from p_school)
    or not exists(select 1 from schools where id=p_school and is_active)
    then raise exception 'School access denied.'; end if;
  select * into source from learning_boards where id=p_board and school_id is null for update;
  if source.id is null or not learnboard_path_eligible(p_board,p_school)
    then raise exception 'This Master Path is not available.'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 150 then raise exception 'Choose a valid path name.'; end if;
  insert into learning_boards(name,description,status,school_id,created_by)
    values(trim(p_name),source.description,'active',p_school,p_actor) returning id into result;
  insert into learning_board_games(board_id,game_id,sort_order)
    select result,game_id,sort_order from learning_board_games where board_id=p_board;
  return result;
end $$;

create or replace function public.validate_assignment_school()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare student_school uuid; board_school uuid;
begin
  select school_id into student_school from profiles where id=new.student_id and role='student';
  if student_school is null then raise exception 'Student must belong to a school.'; end if;
  new.school_id:=coalesce(new.school_id,student_school);
  if new.school_id is distinct from student_school then raise exception 'Student and assignment must belong to the same school.'; end if;
  if tg_op='UPDATE' and (new.student_id<>old.student_id or new.school_id is distinct from old.school_id
    or new.board_id is distinct from old.board_id or new.game_id is distinct from old.game_id
    or new.group_assignment_id is distinct from old.group_assignment_id)
    then raise exception 'Assignment targets cannot be changed.'; end if;
  if new.board_id is not null then
    select school_id into board_school from learning_boards where id=new.board_id for update;
    if not found or (board_school is not null and board_school<>new.school_id)
      then raise exception 'Path school does not match.'; end if;
    if tg_op='INSERT' and new.group_assignment_id is null and not learnboard_path_eligible(new.board_id,new.school_id)
      then raise exception 'Path is not available for new assignments.'; end if;
  end if;
  if new.group_assignment_id is not null and not exists(select 1 from learning_board_group_assignments s join groups g on g.id=s.group_id
    where s.id=new.group_assignment_id and s.board_id=new.board_id and g.school_id=new.school_id)
    then raise exception 'Class assignment school does not match.'; end if;
  return new;
end $$;

create or replace function public.validate_learning_board_group_school()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare board_school uuid; class_school uuid;
begin
  select school_id into class_school from groups where id=new.group_id;
  if class_school is null then raise exception 'Class must belong to a school.'; end if;
  select school_id into board_school from learning_boards where id=new.board_id for update;
  if not found or (board_school is not null and board_school<>class_school)
    then raise exception 'Learning Path and class must belong to the same school.'; end if;
  if tg_op='UPDATE' and (new.board_id<>old.board_id or new.group_id<>old.group_id)
    then raise exception 'Assignment targets cannot be changed.'; end if;
  if tg_op='INSERT' and not learnboard_path_eligible(new.board_id,class_school)
    then raise exception 'Path is not available for new assignments.'; end if;
  return new;
end $$;

-- Existing assignment links must never be deleted. Cancellation is an update.
create function public.learnboard_keep_assignment_history()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'Assignments are retained for history. Cancel or expire the assignment instead.'; end $$;
create trigger learnboard_keep_assignment_history before delete on public.assignments
  for each row execute function public.learnboard_keep_assignment_history();
create trigger learnboard_keep_class_assignment_history before delete on public.learning_board_group_assignments
  for each row execute function public.learnboard_keep_assignment_history();

create function public.learnboard_path_identity_guard()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.school_id is distinct from old.school_id then raise exception 'Path ownership cannot be changed. Customize a copy instead.'; end if;
  return new;
end $$;
create trigger learnboard_path_identity_guard before update on public.learning_boards
  for each row execute function public.learnboard_path_identity_guard();

create function public.learnboard_path_sequence_guard()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare path uuid;
begin
  if tg_op='UPDATE' and new.board_id<>old.board_id then raise exception 'Game relationships cannot be transferred between paths.'; end if;
  if tg_op='DELETE' then path:=old.board_id; else path:=new.board_id; end if;
  perform 1 from learning_boards where id=path for update;
  if exists(select 1 from assignments where board_id=path) or exists(select 1 from learning_board_group_assignments where board_id=path)
    then raise exception 'This path has assignments. Create a copy to change its games without affecting history.'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger learnboard_path_sequence_guard before insert or update or delete on public.learning_board_games
  for each row execute function public.learnboard_path_sequence_guard();

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
     or (actor.role <> 'super_admin' and (board.school_id is null or actor.school_id is distinct from board.school_id))
     or (board.school_id is not null and not exists(select 1 from schools where id=board.school_id and is_active))
     then raise exception 'Learning Path is not available.'; end if;
  if board.updated_at is distinct from p_expected then raise exception 'This path changed. Reload before saving.'; end if;
  if p_games is null or cardinality(p_games)>200 or exists(select 1 from unnest(p_games) g group by g having count(*)>1)
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
;

CREATE OR REPLACE FUNCTION public.learnboard_save_assignment(p_actor uuid, p_kind text, p_id uuid, p_board uuid, p_game uuid, p_target uuid, p_config jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare actor public.profiles; school uuid; result uuid; old public.assignments; old_class public.learning_board_group_assignments;
begin
  select * into actor from profiles where id=p_actor and is_active and role in ('admin','super_admin');
  if actor.id is null or p_kind is null or p_kind not in ('class','student') then raise exception 'Assignment access denied.'; end if;
  if p_kind='class' then select school_id into school from groups where id=p_target and is_active;
  else select school_id into school from profiles where id=p_target and role='student' and is_active; end if;
  if school is null or (actor.role<>'super_admin' and actor.school_id is distinct from school)
     or not exists(select 1 from schools where id=school and is_active)
     then raise exception 'Assignment target is not available.'; end if;
  if p_config is null or jsonb_typeof(p_config)<>'object'
    or coalesce(p_config->>'status','') not in ('scheduled','active','expired','completed','cancelled')
    or (p_kind='class' and p_config->>'status'='completed')
    or coalesce(p_config->>'allow_resume','') not in ('true','false')
    or coalesce(p_config->>'score_visible','true') not in ('true','false')
    or (p_config->>'passing_score') is null or (p_config->>'passing_score')::numeric not between 0 and 100
    or ((p_config->>'max_attempts') is not null and (p_config->>'max_attempts')::integer not between 1 and 1000)
    or ((p_config->>'time_limit_minutes') is not null and (p_config->>'time_limit_minutes')::integer not between 1 and 1440)
    or (nullif(p_config->>'available_until','')::timestamptz<=nullif(p_config->>'available_from','')::timestamptz)
    then raise exception 'Choose valid assignment settings.'; end if;
  if (p_board is null)=(p_game is null) or (p_kind='class' and p_board is null)
     then raise exception 'Choose valid learning content.'; end if;
  if p_board is not null then
    perform 1 from learning_boards where id=p_board and (school_id=school or school_id is null) for update;
    if not found then raise exception 'Path school does not match.'; end if;
    if p_id is null and not learnboard_path_eligible(p_board,school) then raise exception 'Path is not available for new assignments.'; end if;
    if p_config->>'status' in ('active','scheduled') and (not exists(select 1 from learning_board_games where board_id=p_board)
      or exists(select 1 from learning_board_games bg join games g on g.id=bg.game_id
        where bg.board_id=p_board and (g.status<>'published' or not exists(select 1 from scorm_packages sp
          where sp.game_id=g.id and sp.processing_status='ready' and sp.scorm_version in ('1.2','2004')))))
      then raise exception 'The path needs published games with ready SCORM packages before assignment.'; end if;
  elsif p_config->>'status' in ('active','scheduled') and not exists(select 1 from games g where g.id=p_game and g.status='published'
    and exists(select 1 from scorm_packages sp where sp.game_id=g.id and sp.processing_status='ready' and sp.scorm_version in ('1.2','2004')))
    then raise exception 'This game is not ready for assignment.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_kind||p_target::text||coalesce(p_board,p_game)::text,0));
  if p_kind='class' then
    if p_id is not null then
      select * into old_class from learning_board_group_assignments where id=p_id for update;
      if old_class.id is null or old_class.board_id<>p_board or old_class.group_id<>p_target then raise exception 'Assignment target cannot be changed.'; end if;
    elsif exists(select 1 from learning_board_group_assignments where board_id=p_board and group_id=p_target and status in ('active','scheduled'))
      then raise exception 'This path is already assigned to this class. Edit its schedule instead.'; end if;
    if p_id is null then
      insert into learning_board_group_assignments(board_id,group_id,assigned_by) values(p_board,p_target,p_actor) returning id into result;
    else result:=p_id; end if;
    update learning_board_group_assignments set available_from=nullif(p_config->>'available_from','')::timestamptz,
      available_until=nullif(p_config->>'available_until','')::timestamptz,max_attempts=(p_config->>'max_attempts')::integer,
      time_limit_minutes=(p_config->>'time_limit_minutes')::integer,passing_score=(p_config->>'passing_score')::numeric,
      allow_resume=(p_config->>'allow_resume')::boolean,score_visible=coalesce((p_config->>'score_visible')::boolean,true),status=p_config->>'status',updated_at=now() where id=result;
  else
    if p_id is not null then
      select * into old from assignments where id=p_id and group_assignment_id is null for update;
      if old.id is null or old.student_id<>p_target or old.board_id is distinct from p_board or old.game_id is distinct from p_game
         or old.school_id is distinct from school then raise exception 'Assignment target cannot be changed.'; end if;
    elsif exists(select 1 from assignments where student_id=p_target and board_id is not distinct from p_board
      and game_id is not distinct from p_game and group_assignment_id is null and status in ('active','scheduled'))
      then raise exception 'This learning is already assigned to this student. Edit its schedule instead.'; end if;
    if p_id is null then
      insert into assignments(student_id,school_id,board_id,game_id,assigned_by) values(p_target,school,p_board,p_game,p_actor) returning id into result;
    else result:=p_id; end if;
    update assignments set available_from=nullif(p_config->>'available_from','')::timestamptz,
      available_until=nullif(p_config->>'available_until','')::timestamptz,max_attempts=(p_config->>'max_attempts')::integer,
      time_limit_minutes=(p_config->>'time_limit_minutes')::integer,passing_score=(p_config->>'passing_score')::numeric,
      allow_resume=(p_config->>'allow_resume')::boolean,score_visible=coalesce((p_config->>'score_visible')::boolean,true),status=p_config->>'status',updated_at=now() where id=result;
  end if;
  return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.learnboard_resolve_class_assignment(p_source uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare actor public.profiles; src public.learning_board_group_assignments; board public.learning_boards; result uuid;
begin
  select * into actor from profiles where id=auth.uid() and role='student' and is_active;
  select * into src from learning_board_group_assignments where id=p_source and status in ('active','scheduled') for update;
  select * into board from learning_boards where id=src.board_id;
  if actor.id is null or src.id is null or board.id is null or (board.school_id is not null and actor.school_id is distinct from board.school_id)
    or not exists(select 1 from schools where id=actor.school_id and is_active)
    or not exists(select 1 from groups g join group_members m on m.group_id=g.id
      where g.id=src.group_id and g.school_id=actor.school_id and g.is_active and m.user_id=actor.id)
    then raise exception 'This class assignment is not available.'; end if;
  insert into assignments(student_id,board_id,school_id,group_assignment_id,available_from,available_until,
    max_attempts,time_limit_minutes,passing_score,allow_resume,score_visible,status,assigned_by)
  values(actor.id,src.board_id,actor.school_id,src.id,src.available_from,src.available_until,
    src.max_attempts,src.time_limit_minutes,src.passing_score,src.allow_resume,src.score_visible,src.status,src.assigned_by)
  on conflict(group_assignment_id,student_id) where group_assignment_id is not null do nothing;
  select id into result from assignments where group_assignment_id=src.id and student_id=actor.id;
  return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.learnboard_student_assignment(p_assignment uuid)
 RETURNS assignments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    item.status := src.status; item.score_visible := src.score_visible;
  end if;
  if item.status not in ('active','scheduled') or (item.available_from is not null and item.available_from>now())
     or (item.available_until is not null and item.available_until<=now())
     then raise exception 'Assignment is not currently available.'; end if;
  if item.board_id is not null and not exists(select 1 from learning_boards
     where id=item.board_id and (school_id=actor.school_id or school_id is null))
     then raise exception 'Learning Path is not available.'; end if;
  return item;
end $function$
;

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
      if not item.score_visible then result.score:=null; result.success_status:='unknown'; end if;
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
  if not item.score_visible then result.score:=null; result.success_status:='unknown'; end if;
      return result;
end $function$
;

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
    if src.id is null or src.board_id is distinct from assigned.board_id or not exists(select 1 from groups g join group_members m on m.group_id=g.id
      where g.id=src.group_id and g.is_active and g.school_id=actor.school_id and m.user_id=p_actor)
      then raise exception 'Class assignment is not available.'; end if;
    assigned.status:=src.status; assigned.available_from:=src.available_from; assigned.available_until:=src.available_until;
  end if;
  if assigned.status not in ('active','scheduled') or (assigned.available_from is not null and assigned.available_from>now()) or (assigned.available_until is not null and assigned.available_until<=now())
     or (assigned.board_id is not null and not exists(select 1 from learning_boards where id=assigned.board_id and (school_id=actor.school_id or school_id is null)))
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
;
-- All recipients are validated inside ONE transaction; one failure rolls back
-- every assignment. Bound and sort the batch to make locking predictable.
create function public.learnboard_assign_students(p_actor uuid,p_board uuid,p_students uuid[],p_config jsonb)
returns uuid[] language plpgsql security definer set search_path=public,pg_temp as $$
declare student uuid; result uuid[]:='{}';
begin
  if p_students is null or cardinality(p_students) not between 1 and 500
    or exists(select 1 from unnest(p_students) s where s is null)
    or exists(select 1 from unnest(p_students) s group by s having count(*)>1)
    then raise exception 'Choose between 1 and 500 unique students.'; end if;
  for student in select s from unnest(p_students) s order by s loop
    result:=array_append(result,learnboard_save_assignment(p_actor,'student',null,p_board,null,student,p_config));
  end loop;
  return result;
end $$;

-- New table access; no anon access or browser mutation grants.
alter table public.learning_board_school_availability enable row level security;
revoke all on public.learning_board_school_availability from public,anon,authenticated;
grant all on public.learning_board_school_availability to service_role;
grant select on public.learning_board_school_availability to authenticated;
create policy learnboard_available_school_read on public.learning_board_school_availability
  for select to authenticated using(exists(select 1 from profiles p where p.id=auth.uid() and p.is_active
    and (p.role='super_admin' or (p.role='admin' and p.school_id=learning_board_school_availability.school_id
      and exists(select 1 from schools s where s.id=p.school_id and s.is_active)))));

-- Preserve existing policies; add a restrictive boundary plus the intentional
-- SELECT expansion for available Masters and historical assigned paths.
-- Replace the legacy student SELECT that recurses through class assignments.
drop policy "Students can view assigned learning paths" on public.learning_boards;
create policy learnboard_path_read_boundary on public.learning_boards as restrictive
  for select to authenticated using(learnboard_view_path(id));
create policy learnboard_path_read_master_history on public.learning_boards
  for select to authenticated using(learnboard_view_path(id));
create policy learnboard_path_games_read_boundary on public.learning_board_games as restrictive
  for select to authenticated using(learnboard_view_path(board_id));
create policy learnboard_path_games_read_master_history on public.learning_board_games
  for select to authenticated using(learnboard_view_path(board_id));

-- Master class assignments derive their school from the class, not the Master.
create policy learnboard_class_assignment_school_read on public.learning_board_group_assignments
  for select to authenticated using(exists(select 1 from profiles p join groups g on g.id=group_id
    where p.id=auth.uid() and p.is_active and (p.role='super_admin'
      or (p.role='admin' and p.school_id=g.school_id)
      or (p.role='student' and p.school_id=g.school_id and exists(select 1 from group_members m where m.group_id=g.id and m.user_id=p.id)))));

-- Browser mutation remains server-only. Remove inherited COLUMN grants too;
-- revoking a table privilege alone does not remove a separate column grant.
revoke all on public.attempts,public.scorm_runtime_data,public.game_score_events from public,anon,authenticated;
do $grants$
declare r record;
begin
  for r in select table_name,column_name from information_schema.columns
    where table_schema='public' and table_name in ('attempts','scorm_runtime_data','game_score_events') loop
    execute format('revoke select(%I),insert(%I),update(%I),references(%I) on public.%I from public,anon,authenticated',
      r.column_name,r.column_name,r.column_name,r.column_name,r.table_name);
  end loop;
end $grants$;
grant select(id,student_id,game_id,assignment_id,attempt_number,started_at,completed_at,status,
  time_spent_seconds,completion_status,created_at) on public.attempts to authenticated;

-- RLS does NOT govern TRUNCATE. Remove that privilege from browser roles on
-- every reviewed public application table; no table is actually truncated.
revoke truncate on public.activity_logs,public.assignments,public.attempts,public.game_score_events,public.games,public.group_members,public.groups,public.learning_board_games,public.learning_board_group_assignments,public.learning_boards,public.profiles,public.schools,public.scorm_packages,public.scorm_runtime_data,public.skills,public.subjects from public,anon,authenticated;
revoke insert,update,delete on public.learning_boards,public.learning_board_games,public.learning_board_group_assignments,public.assignments,public.subjects,public.skills from public,anon,authenticated;

-- Replace historical CASCADE/SET NULL links with RESTRICT; existing rows/IDs remain.
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

-- Explicit EXECUTE permissions; actor-parameter RPCs are server-only.
revoke all on function public.learnboard_path_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.learnboard_path_eligible(uuid,uuid) to service_role;
revoke all on function public.learnboard_view_path(uuid) from public,anon,authenticated;
grant execute on function public.learnboard_view_path(uuid) to authenticated,service_role;
revoke all on function public.learnboard_availability_guard() from public,anon,authenticated;
revoke all on function public.learnboard_set_path_schools(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.learnboard_set_path_schools(uuid,uuid,uuid[]) to service_role;
revoke all on function public.learnboard_customize_path(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.learnboard_customize_path(uuid,uuid,uuid,text) to service_role;
revoke all on function public.validate_assignment_school() from public,anon,authenticated;
revoke all on function public.validate_learning_board_group_school() from public,anon,authenticated;
revoke all on function public.learnboard_keep_assignment_history() from public,anon,authenticated;
revoke all on function public.learnboard_path_identity_guard() from public,anon,authenticated;
revoke all on function public.learnboard_path_sequence_guard() from public,anon,authenticated;
revoke all on function public.learnboard_save_path_games(uuid,uuid[],timestamp with time zone) from public,anon,authenticated;
grant execute on function public.learnboard_save_path_games(uuid,uuid[],timestamp with time zone) to authenticated,service_role;
revoke all on function public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.learnboard_save_assignment(uuid,text,uuid,uuid,uuid,uuid,jsonb) to service_role;
revoke all on function public.learnboard_resolve_class_assignment(uuid) from public,anon,authenticated;
grant execute on function public.learnboard_resolve_class_assignment(uuid) to authenticated,service_role;
revoke all on function public.learnboard_student_assignment(uuid) from public,anon,authenticated;
grant execute on function public.learnboard_student_assignment(uuid) to service_role;
revoke all on function public.learnboard_start_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.learnboard_start_attempt(uuid,uuid) to authenticated,service_role;
revoke all on function public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.learnboard_commit_runtime(uuid,uuid,uuid,jsonb,numeric,text,text,integer,boolean) to service_role;
revoke all on function public.learnboard_assign_students(uuid,uuid,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.learnboard_assign_students(uuid,uuid,uuid[],jsonb) to service_role;

-- Reviewed legacy group policies recursively queried groups/group_members;
-- old is_admin SELECT policies also granted School Admin cross-school reads.
-- Replace only group/member SELECT policies with explicit tenant boundaries.
create function public.learnboard_view_group(p_group uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles p join groups g on g.id=p_group where p.id=auth.uid() and p.is_active
   and (p.role='super_admin' or (p.school_id=g.school_id and exists(select 1 from schools where id=p.school_id and is_active)
     and (p.role='admin' or (p.role='student' and exists(select 1 from group_members m where m.group_id=g.id and m.user_id=p.id))))));
$$;
create function public.learnboard_view_membership(p_group uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles p join groups g on g.id=p_group where p.id=auth.uid() and p.is_active
   and (p.role='super_admin' or (p.school_id=g.school_id and exists(select 1 from schools where id=p.school_id and is_active)
     and (p.role='admin' or (p.role='student' and p_user=p.id)))));
$$;
create function public.learnboard_view_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles actor join profiles target on target.id=p_profile
  where actor.id=auth.uid() and actor.is_active and (actor.id=target.id or actor.role='super_admin'
    or (actor.role='admin' and actor.school_id=target.school_id and exists(select 1 from schools where id=actor.school_id and is_active))));
$$;
drop policy "Admins can view group members" on public.group_members;
drop policy "School admins can view own school group members" on public.group_members;
drop policy "Students can view own group memberships" on public.group_members;
drop policy "Super admins can view all group members" on public.group_members;
drop policy "Admins can view groups" on public.groups;
drop policy "School admins can view own school groups" on public.groups;
drop policy "Students can view their groups" on public.groups;
drop policy "Super admins can view all groups" on public.groups;
create policy learnboard_group_read on public.groups for select to authenticated using(learnboard_view_group(id));
create policy learnboard_membership_read on public.group_members for select to authenticated using(learnboard_view_membership(group_id,user_id));
create policy learnboard_profile_read_boundary on public.profiles as restrictive for select to authenticated using(learnboard_view_profile(id));
revoke all on function public.learnboard_view_group(uuid),public.learnboard_view_membership(uuid,uuid),public.learnboard_view_profile(uuid) from public,anon,authenticated;
grant execute on function public.learnboard_view_group(uuid),public.learnboard_view_membership(uuid,uuid),public.learnboard_view_profile(uuid) to authenticated,service_role;
revoke insert,update,delete on public.groups,public.group_members,public.profiles from public,anon,authenticated;

commit;
