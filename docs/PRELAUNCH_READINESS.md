# LumenTrail prelaunch readiness

Updated 2026-10-11. LumenTrail remains private and under development. Application hardening is in progress; this is not a launch approval. Structural database changes require explicit approval, a fresh catalog review, and verified recovery safeguards.

## Readiness checklist

Verified means a named automated check passes for its stated scope. It does not imply live Supabase or authenticated acceptance verification.

| Area | Status | Evidence and remaining gate |
| --- | --- | --- |
| Server account and school authorization | Verified | tests/authorization.test.cjs checks anonymous, inactive account, inactive school, missing school, wrong role, and class ownership. proxy.ts guards all API mutations; class APIs enforce authorization directly. |
| Current live tenant isolation | Needs Live Verification | Saved catalog contains broad legacy admin policies and dangerous grants. database/proposals/004_prelaunch_security.sql is tested in isolation and was confirmed applied. Fresh live catalog/config review required. |
| Signup metadata role protection | Needs Live Verification | Applied proposal 004 defaults new profiles to student; privileged provisioning sets role afterward. Live signup is enabled and email autoconfirm is disabled. The live trigger body remains unverified, so metadata role protection is still a critical database approval gate. |
| Historical data preservation | Needs Live Verification | Applied proposal 004 replaces reviewed destructive assignment/attempt/class foreign keys with RESTRICT. Isolated deletion tests pass; live constraints are unverified. |
| Bounded JSON requests | Verified | lib/security/read-json.ts enforces actual bytes without Content-Length. Legacy JSON APIs now use it. Multipart parsing still depends on the hosting request limit and route file-size validation. |
| SCORM extraction budgets and paths | Verified | tests/security-recovery.test.cjs checks compressed expansion, boundaries, absolute paths, and sanitized traversal. Limits: 5000 entries, 2 MiB manifest, 64 MiB per file, 512 MiB expanded total. Full upload/replace recovery still needs acceptance testing. |
| Sandbox isolation | Verified | tests/browser.test.cjs uses real Chrome to verify opaque iframe isolation and credentialed package assets. This is a synthetic package test. |
| Completed save replay | Verified | tests/runtime-receipt.test.cjs checks a lost response, stale token, changed payload, cross-school history, and hidden grades. Receipt acknowledgment never rewrites completed results. |
| Interrupted gameplay | Needs Testing | Player retries dirty saves, limits request duration, acknowledges transport failures, and checkpoints near the deadline. Expiry warns when recent progress is unsaved. Offline interruption, queued requests, process restart, multiple tabs, and exact deadline races still need authenticated E2E tests. |
| Quiz reports | Verified | tests/report-runtime.test.cjs projects saved interactions when no legacy quiz rows exist and excludes raw suspend data. Legacy rows take precedence per attempt; projection timestamps represent the saved checkpoint, not exact answer time. |
| Super Admin workflows | Needs Testing | Schools, users, subjects/skills, games/packages, assignments, reports, and settings have implementations. Full authenticated acceptance remains required. |
| School Admin workflows | Needs Testing | School paths, classes, students, assignments, reports, and settings require two-school acceptance. Global subject/skill editing is restricted to Super Admin; School Admin browsing is retained. |
| Student workflow | Needs Testing | Assignment discovery, sequence enforcement, launch, resume, completion, progress, hidden scores, and settings require full authenticated acceptance. |
| School Learning Paths and bulk assignment | Needs Testing | Current UI submits selected students sequentially and reports partial success. Atomic bulk assignment is proposed with Master Paths; do not claim existing batches are atomic. |
| Global Master Paths | Not Implemented | Proposal 003 and application changes must be reconciled together. Proposal 004 is a security-only alternative, not a Master Paths implementation. Do not chain 003 and 004 without a freshly reviewed consolidated proposal. |
| UI consistency and accessibility | Needs Testing | Shared LmsUi, buttons, toast, branding, and role shells are retained. Login browser checks pass at 360, 768, and 1440 px; mobile and desktop screenshots were inspected. Authenticated role layouts, keyboard use, notifications, forms, and contrast still need acceptance. |
| Production build | Verified | Final Next.js production build and TypeScript pass. Local-font loading preserves Geist without a Google download. Recheck bundled font paths when upgrading the pinned Next.js version. |
| Backups and restore drill | Needs Testing | Procedures are in RECOVERY.md; provider capabilities, backup existence, access, and restoration are unverified. |
| Monitoring | Needs Testing | Existing server error logs are retained. Confirm collection, retention, alerts, and private access in the current host before RC sign-off. |

## Database approval boundary

Proposal 004 was confirmed applied and its source is retained for review; it preserves existing IDs/rows. It hardens new-user provisioning, group/member/profile reads, browser grants, and historical deletion constraints. It does not repair unknown live drift, grant Master Path access, or authorize a database reset. Its Auth-function and policy drift guards deliberately stop if the catalog differs. Inspect constraints and grants against database/inspection.sql before approving any execution.

The final read-only check succeeded through the recovered command runner. Latest observed counts: profiles 5, schools 2, games 16, Learning Paths 2, assignments 2, attempts 0, runtime rows 0, quiz-event rows 0. The private SCORM bucket has a 500 MiB file limit; the public game-image bucket has a 10 MiB file limit. Signup is enabled, email/phone autoconfirm are disabled, and the Master Path availability table is absent from REST metadata. These observations do not verify current function bodies, RLS/grants, constraints, historical preservation, or backups. The latest automated inspection was read-only. Migration application was confirmed separately during this session.

## Verification commands

Run npm test, npm run typecheck, npm run lint, and npm run build for local checks. Optional integration engines currently resolve from the existing learnboard-lms-verification temporary tooling; set LEARNBOARD_PGLITE_MODULE and LEARNBOARD_PLAYWRIGHT_MODULE to their installed module paths elsewhere. LEARNBOARD_CHROME selects Chrome.

Start a local production server after building and set LEARNBOARD_TEST_URL to its origin. npm run test:release requires the engines, browser, preview URL, and zero skipped tests. It exercises automated checks only; it cannot replace authenticated role acceptance or a restore drill. No dependencies or browsers are installed automatically.

## Authenticated acceptance gate

Use designated test accounts in two schools in an isolated environment. Do not seed, delete, or reset the existing live database merely to run acceptance tests.

1. Super Admin creates an approved fixture game/package, publishes it, creates a school path, orders games, and assigns individual students and a class.
2. School Admin A can manage school A records and receives denied responses for school B UUIDs across users, classes, paths, assignments, reports, and memberships. Student and anonymous credentials cannot invoke administrative mutations.
3. Student A sees only entitled content. Direct content URLs without a valid token, expired schedules, inactive accounts/schools, stale tokens, removed class membership, and later-game launches are denied.
4. Complete game one, resume interrupted game two, finish, and reconcile attempts, time, scores, interactions, path progress, and admin/student reports. Verify hidden grades through network responses and direct REST access.
5. Drop a completion response after the save succeeds; retry it and confirm one unchanged result. Reject different payloads and another student's attempt. Test two concurrent tabs, repeated launches, and request reordering against actual PostgreSQL.
6. Interrupt upload/replacement/removal and confirm old package pointers and attempt-pinned content remain valid. Reconcile partial artifacts without deleting referenced packages.
7. Verify all role settings, email confirmation, current-password checks, responsive layouts, keyboard navigation, and recovery messages.

## Remaining phases

1. Refresh live catalog, Auth/storage configuration and backup evidence after completed proposals 004/005/006/008.
2. Do not rerun completed migrations. Recheck direct REST/storage denials and current constraints.
3. Execute authenticated acceptance and fix any failures. Complete approved Master Path scope separately rather than applying its schema alone.
4. Perform the restore drill and monitoring checks. Mark critical rows Verified with actual evidence before declaring a private release candidate. Public launch remains a separate decision.

## Validation record

Latest results on 2026-10-11: 103 automated tests passed, zero failed, zero skipped through npm run test:release against the local production preview. Production build and TypeScript passed. ESLint passed with 21 image/unused-icon warnings; no lint errors.  Tests include real Chrome sandbox and responsive login checks, actual local unauthenticated/origin checks, mocked API authorization/replay tests, and isolated PostgreSQL proposal tests. The isolated database tests never target live Supabase. Full authenticated acceptance, concurrent PostgreSQL request testing, live security catalog review, and restore drills remain incomplete.


See PENDING_ROLLOUT.md for completed local UI and no-resume fixes and named remaining checks. Public hosting, monitoring and scheduled cleanup are deferred. User-reported migration success and REST exposure do not replace a fresh live security catalog review.
