# Employee mobile — all work left (as of 2026-10-28)

Phase 2 implementation is complete for both remaining feature ports, but **Phase 2 has not exited**. The exit
needs the items marked *exit* below and Jose's checkpoint. Phase 3 has not started.

## Phase 2 exit

| # | Item | Owner | State |
|---|---|---|---|
| 1 | Deletion reviewers close DEL-UI-19..22 and CR-4/6/8 leftovers | Independent UI / code reviewers | Fixes landed at `6931d90d`; closure pending |
| 2 | Pay reviewer closures | Independent reviewers | Code: closed except accepted minors; UI: closed except PAY-UI-13 recheck (fixed at `944f859a`) and PAY-UI-10 (devices) |
| 3 | QA-OWN-3 closure | Original Alerts QA author | Fix at `663377ba`/`28ee6a75`; RED on `003bbe2c`; residual needs Jose (below) |
| 4 | Communications CR-4, UI-COM-002, UI-COM-003 closure | Original Communications authors | All three fixed (UI-COM-003 at every text size from `bc8a5742`, pixel-verified in 3 engines); a supplementary independent check agrees; advisories S-1..S-5 recorded in `employee-mobile-communications/claude-continuation/supplementary-ui-check.md` |
| 5 | Process-observation tests (`phase-e-process`, `phase-e-root-group-process`, `phase-e-runner`) | Engineering | Pass in a full suite run; fail with their recorded signatures under CPU saturation; `ps` latency ruled out; **cause unresolved** |
| 6 | Calendar QA-CAL-1 Firefox request-monitor anomaly | Engineering + Calendar QA author | **Not started** |
| 7 | Audit and replay earlier landscape evidence captured with full-page Chromium screenshots | Engineering + original authors | **Not started**; batches here use viewport captures and media-verified coarse landscape |
| 8 | Combined checks on one assembled revision and a Jose checkpoint | Root + Jose | At `e65ca90d`: default suite 9,878/0 failed, deletion 9/9, Pay and Communications browser journeys passed; Pay re-passed at `944f859a`. Jose checkpoint pending |
| 9 | Reconcile with `origin/development` and concurrent Codex/Claude branches | Coordinator | Not done here; this branch is unassembled |

## Decisions only Jose can make

1. **QA-OWN-3 residual.** The turn-off is now remembered outside IndexedDB, so a replacement controller no
   longer re-owns the generation. Two residuals remain:
   - if `localStorage` also fails, nothing in the browser can remember the intent;
   - a restarted service worker cannot read `localStorage`, so until NEVORA is next opened it can still show a
     push for a generation whose server cleanup failed.

   Accept, or ask for a server-side mitigation (for example, delivery refusing a generation with a recorded
   failed turn-off).
2. **Deletion copy.** Whether to say that support may be able to withdraw a request before processing (the runbook
   allows it; the app now says only that it can't be cancelled in the app).
3. **Withdrawal identity check.** Which identity proof operations require before withdrawing a deletion request.

## Phase 3 (not started; needs Phase 2 exit)

- Reconcile the 34 workflow groups against current authorized Employee/Lead desktop behavior.
- Direct URLs, cross-page navigation and every outcome state, isolation, revocation, concurrency, session expiry,
  interrupted networks, background/resume and sign-out cleanup across the assembled app.
- **Physical devices and services** (blocked here: no approved devices, accounts or hosted environment):
  iPhone/Android browsers and Home Screen installs, portrait/landscape, OS text size, safe areas, virtual
  keyboards, VoiceOver/TalkBack, real passkeys, calendar subscriptions, push and PDFs. Includes PAY-UI-10:
  whether View from a Home Screen app carries the session.
- Performance budget and measurement on representative devices and connections.
- Production build, CI, staging, document/provider and operational checks; deletion-request handling.
- Release candidate, rollout and monitoring plan, rollback. Production merge and deployment need Jose's explicit
  authorization.

## Engineering follow-ups found here

- HARN-1: `scripts/phase-e-owned.mjs:448` and `scripts/lib/premium-owned-runtime.mts:30` list tracked files with
  Node's default 1 MiB `execFileSync` buffer; the repository already exceeds it (fixed only in `owned-next-app.ts`).
- The incumbent sign-in page's "deleting" message (DEL-UI-16) shows a greeting above the error with no icon or link.
