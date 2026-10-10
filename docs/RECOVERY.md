# LumenTrail recovery procedures

These procedures require verification against the current hosting and Supabase configuration before release-candidate sign-off. They do not authorize schema execution, deletion, purchases, deployment, or restoration over existing data.

## Backup before approved changes

Identify who owns recovery and can access the existing provider backups. Record the timestamp, retention, encryption/access controls, and whether database roles, grants, policies, functions, triggers, constraints, Auth identities, and storage metadata are covered. Inventory storage object bytes separately, including source ZIPs, extracted package files, images, and package pointers.

Keep a dated inventory of row counts and stable IDs for users, schools, games, paths, assignments, attempts, runtime rows, and quiz events, plus package-to-storage references. Counts alone do not prove preservation; reconcile identifiers and representative history. Keep credentials and student data out of source control and public logs.

Set an acceptable data-loss window and recovery time with the owner. Use existing provider capabilities first; approve any paid upgrade separately. Verify an actual restore point before structural SQL is approved.

## Restore drill

1. Restore into an isolated destination; never overwrite the current database to test recovery.
2. Restore the matching storage objects and package mappings. Verify source and extracted files against the backup inventory.
3. Reconcile Auth UUIDs with profiles, school ownership, memberships, assignments, attempts, runtime rows, quiz events, and foreign keys. Check identifiers and representative scores/history as well as counts.
4. Verify RLS, function EXECUTE permissions, browser grants, private package storage, signup metadata handling, and two-school negative tests.
5. Point an isolated application instance at the restored environment and complete launch, resume, finish, reports, and settings acceptance.
6. Record duration, missing data, access failures, and corrective steps. RC sign-off requires a successful drill and an identified recovery owner.

## Gameplay and save failures

The player keeps the latest snapshot in memory, retries dirty saves, and limits a request to 20 seconds. Transport failures send a negative acknowledgment to the sandbox. A repeated identical completed payload can be acknowledged using its student, token, assignment school, and persisted raw data without rewriting the result.

A save that never reaches the server cannot be recovered after the browser process closes from memory alone. Unload beacons have payload limits and are best effort. A checkpoint five seconds before the deadline reduces loss but is not a guarantee; expired sessions continue to be rejected. The UI explicitly warns when recent progress is unsaved. Test these cases under actual network interruption before marking gameplay Verified.

During an incident, preserve attempt IDs, safe request timestamps, response status, and correlation to the student's school. Do not manually create replacement attempts or edit scores to hide a failed save. Compare persisted runtime and attempt status; acknowledge the existing completed result when it matches. Never log session tokens, passwords, service keys, full runtime payloads, or student answers.

## Package failures

Stop publishing the affected game until package metadata and storage agree. Preserve the previous package and every package referenced by an attempt. Confirm the game pointer, package processing state, launch file, extraction prefix, and attempt-pinned package before cleanup. List and review orphan candidates; delete only confirmed unreferenced artifacts under explicit incident authorization.

Storage and database writes are not a single transaction. Replacement/removal failure and process interruption require reconciliation and acceptance testing even where compensation code exists. Do not reset the game or delete historical attempts as a recovery shortcut.

## Monitoring and incident response

Use the existing host and Supabase logs. Confirm retention and restricted access. Review or alert on repeated 401/403 responses, 429 spikes, save 5xx/timeouts, package processing failures, storage cleanup failures, missing runtime rows, and attempts stuck in progress beyond their configured deadline. The in-memory request limiter resets on process restart and is not a shared multi-instance limit.

On a suspected isolation or authorization incident, restrict affected access through the approved operational controls, preserve logs and the current catalog, identify scope, and obtain approval for live configuration/data changes. Prefer a forward repair over restoring an old database that could erase newer learning history. Application rollback must remain compatible with the approved schema; never blindly replay an older proposal to reverse a change.
