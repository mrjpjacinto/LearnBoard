# Local rollout status - 2026-10-11

The application remains local. Public hosting and scheduler activation are deferred at the user's request.

## Completed

- Database proposals 004, 005, 006 and 008 were confirmed applied during this session. REST metadata confirms cleanup queue/detach, multiple-skill save and individual path-student removal functions. Metadata alone does not verify current function bodies, policies or constraints.
- The user confirmed multiple-skill save and refresh worked.
- Assignment forms now use Cancelled instead of the unsupported Archived assignment status. Existing lifecycle statuses remain editable.
- Shared UI controls, mobile spacing, modal backdrops, table scrolling, calendar controls and minute entry were improved.
- No-resume player and launch-file reopening is checked on the server. Claims compare the full saved launch configuration to avoid overwriting concurrent changes. Resume requires current assignment and attempt permissions.
- Notifications use text-dependent display times, from 2 to 15 seconds.

## Automated verification

Production build and TypeScript passed. Targeted lint passed. Full lint has 21 warnings and no errors. The local production release suite passed 103 tests, with zero failures and zero skipped tests. This includes real Chrome sandbox and responsive login checks, local anonymous/origin checks, isolated database checks and mocked launch concurrency checks. It does not establish authenticated role acceptance or actual concurrent PostgreSQL launch behavior.

## Remaining named checks

1. Student Schedule Verification: opening/expiration, one chance, resume on/off, refresh, closing the browser and saved progress with a designated student account. Older attempts without a launch marker receive their first tracked open after this change.
2. Two-School Access Verification: authenticated ownership checks across administrative workflows and student content.
3. Package Replacement Verification: replacement, failure recovery and retention of attempt-pinned content. No cleanup job is run by these checks automatically.
4. Recovery Verification: confirm a current backup after the applied migrations and restore to an isolated destination.
5. Authenticated UI Review: desktop/mobile role pages, keyboard navigation and calendar clipping inside dialogs.
6. Live Catalog Verification: inspect current functions, grants, policies and history constraints against the reviewed catalog.

Hosted monitoring and CRON_SECRET scheduler activation remain deferred. Do not rerun the completed migrations. Proposal 007 is superseded by 008; proposal 003 Master Paths is separate scope.