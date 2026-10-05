# LearnBoard Database

## Current Master Paths proposal — 2026-10-05

The exported live catalog is saved in `reviews/master_paths_catalog.json`.
The consolidated SQL for review is `proposals/003_master_paths_complete_lms.sql`.
It supersedes `003_master_paths_schema_draft.sql`; do not run proposal 001.
No migration has been applied by this agent.

The proposal adds school availability for global Master Paths and score visibility
to individual and class assignments. It updates authorization functions, prevents
history deletion through cascading foreign keys, and removes browser TRUNCATE
access. Existing IDs and records remain intact. Existing assignments continue
after a Master is withdrawn or archived; new assignments are blocked.

`tests/master-migration.test.cjs` passed against an isolated PGlite database built
from the exported catalog. It checks school isolation, copying without duplicating
games/packages, atomic student assignment, schedules, class membership, launch
sequence, resume, score access, and history protection. This is not a live Supabase
or application end-to-end test. Application changes must accompany the migration;
older clients do not support Master Paths or the tightened score permissions.

The sections below describe the earlier owner-account investigation. The user
subsequently confirmed the owner correction worked; those counts are historical.

LearnBoard continues to use the existing Supabase connection. SQL under
`proposals/` requires explicit review and approval before execution. Never reset,
replace, or blindly replay the database to enable new features.

## Investigation on 2026-10-05

Read-only requests using the existing server connection succeeded. The database
contains three active profiles: two students and Paul. Paul's stored role is
`admin`, with `school_id = NULL`. This matches the exact Users-page error branch:
`app/admin/users/page.tsx` skips the roster query for a school administrator with
no school. The displayed zero totals were defaults, not evidence of lost users.
The page now hides totals when loading fails and explains the identity check.

The sidebar receives the stored profile role from `app/admin/layout.tsx`.
`admin` produces the School Admin label and hides Schools; `super_admin` produces
the Super Admin label and includes Schools. These checks, the Users query, and
the Users creation API were not changed by the latest LMS commit. No automatic
promotion based on a name, a null school, or account age is appropriate.

Observed record counts: schools 1, groups 1, group_members 0, games 1, subjects 1,
skills 0, SCORM packages 1, Learning Paths 0, assignments 0, attempts 0, runtime
records 0. Existing users and content are present. Without an earlier backup,
these counts cannot prove that every historical record or storage file survives.
No data, schema, policy, trigger, or storage modification was made in this audit.

## Schema comparison

The current REST schema already exposes `assignments.group_assignment_id`,
`attempts.package_id`, and `attempts.launch_config`. It also exposes the seven
LMS RPCs defined by `001_complete_lms.sql`: save_assignment, save_path_games,
student_assignment, start_attempt, resolve_class_assignment, update_user, and
commit_runtime (all prefixed `learnboard_`). Users-page selected columns are
present. Missing LMS schema is not the source of the screenshot's error.

REST metadata does not establish exact function bodies, indexes, constraints,
triggers, grants, or RLS policies. `inspection.sql` supplies read-only catalog
queries for that review. The old test fixture omits the three newer columns;
it is not an authoritative snapshot of the live database. Do not run proposal
001 again merely because it exists locally: it replaces functions/triggers and
changes table grants and storage policy in addition to adding columns/indexes.

## Proposed owner correction, pending identity verification and approval

While signed in to the intended owner account, open `/api/account/identity`.
Its authenticated `auth_user_id` must equal `profile.id`; use that ID and Auth
email to populate proposal `002_existing_owner_role.sql`. The endpoint reads
only the signed-in user's profile and does not grant administrative access.
The observed Paul row alone is insufficient to verify the current browser's
authenticated identity. Do not fill the proposal based solely on that name.

The required change, once verified, is only:

```sql
update public.profiles
set role = 'super_admin', school_id = null
where id = '<verified authenticated user UUID>';
```

Proposal 002 guards that update with the matching Auth email, an active profile,
and the expected existing `admin`/null-school state. Review existing role
constraints and profile update triggers first using `inspection.sql`; if a role
constraint does not allow `super_admin`, stop and prepare a separate proposal
from its actual definition. No schema change is currently demonstrated as needed.

This changes one existing profile's permissions; it does not create an account,
change its Auth UUID, delete memberships, or alter content/history. Existing RLS
helpers `is_super_admin`, `is_school_admin`, `is_admin`, `current_user_role`, and
`current_school_id` are exposed, but their definitions still require catalog
review. Promotion intentionally grants platform-wide permissions; school admin
filters must remain enforced for `admin` accounts. No RLS changes are proposed.

After approval and correction, reload and verify the Super Admin label, Schools
navigation, all three roster entries, and content access. Games/SCORM and
Subjects retain their existing implementation; their authenticated end-to-end
behavior has not been verified by these read-only database queries.
