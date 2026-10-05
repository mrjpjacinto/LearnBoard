-- SUPERSEDED: review 003_master_paths_complete_lms.sql instead. DO NOT RUN THIS FILE.
-- REVIEW DRAFT ONLY. DO NOT EXECUTE.
-- This is the additive schema portion of ONE consolidated migration plan.
-- It is NOT the complete deployable migration. Existing RPC bodies, RLS,
-- triggers, constraints, and grants must be inspected before completing it.
-- In particular, applying this file alone does not enable Master assignments
-- or enforce score visibility. Application changes are intentionally deferred.
-- Do not run database/proposals/001_complete_lms.sql.
begin;

-- Reuse learning_boards.school_id:
-- NULL = LearnBoard Master; non-NULL = school-owned Learning Path.
-- No existing path is reclassified or reassigned by this draft.
-- Verify school_id already permits NULL before introducing any Master rows.

-- One Master can be available to many schools without duplicating content.
-- Retain withdrawn relationships for audit instead of deleting them.
create table public.learning_board_school_availability (
  board_id uuid not null references public.learning_boards(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  is_available boolean not null default true,
  made_available_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (board_id, school_id)
);

create index learning_board_school_availability_school
  on public.learning_board_school_availability(school_id, board_id)
  where is_available;

-- Keep existing student-visible scoring behavior for historical assignments.
-- A class's current setting overrides its materialized student assignment.
alter table public.assignments
  add column score_visible boolean not null default true;
alter table public.learning_board_group_assignments
  add column score_visible boolean not null default true;

-- Browser access to the new table starts locked down, even before final RLS.
alter table public.learning_board_school_availability enable row level security;
revoke all on public.learning_board_school_availability from public, anon, authenticated;
grant select, insert, update on public.learning_board_school_availability to service_role;

-- No new SELECT policy is added yet: the final policy must be reconciled
-- with the inspected existing policies. Service-role APIs must validate
-- an active Super Admin for distribution writes and school identity for reads.
-- A database trigger/RPC must also reject availability for school-owned paths.

-- Remaining blocks required in the SAME final migration after catalog review:
-- 1. Master-aware SELECT authorization for paths and relationships;
--    restrictive own-school / Super-Admin-only modification policies.
-- 2. Atomic availability update and Customize a Copy RPCs. Copy only the path
--    structure and game relationships. Never copy Games or SCORM packages.
-- 3. Atomic multi-student assignment RPC, validating EVERY student first.
-- 4. Adapt learnboard_save_assignment for Master eligibility at creation,
--    existing-assignment updates, score visibility and server-side validation.
-- 5. Adapt learnboard_resolve_class_assignment, learnboard_student_assignment,
--    learnboard_start_attempt and learnboard_commit_runtime for Master
--    entitlements, current class schedule/visibility, archive/withdrawal rules.
-- 6. Adapt learnboard_save_path_games for Super Admin Master editing, keeping
--    concurrency checks and immutable sequences once any assignment exists.
-- 7. Protect paths/relationships/Games from deleting assignment/history links;
--    enforce cross-school assignment constraints and safe archival behavior.
-- 8. Remove browser reads of raw score-bearing attempts/runtime/quiz events,
--    including inherited column grants, and audit exposed security-definer RPCs.
--    Authorized server DTOs return only permitted scores; Admin reports retain
--    actual results. Runtime SCORM CMI remains available only as required to play.
-- 9. Explicit function EXECUTE grants and fail-closed preflight assertions
--    derived from the actual live function bodies and catalog definitions.
-- This file must not be treated as approval-ready until those blocks exist.

commit;
