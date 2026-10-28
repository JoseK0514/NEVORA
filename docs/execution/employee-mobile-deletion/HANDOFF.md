# Employee mobile — own account-deletion request

Implemented and verified for **bounded local continuation with conditions**. No production merge, deployment,
real deletion, or real notification was performed. Branch `claude/employee-mobile-phase2-20261027`, continued
from the published handoff `003bbe2c` (`codex/employee-mobile-local-resume-20261027`).

Final deletion revision: `6931d90de4a59c10b0bc60a23c7a8794b523dcbc`. [Gallery](gallery/) ·
[Code/security review](reviews/code-security-review.md) · [UI/UX review](reviews/ui-ux-review.md) ·
[Phase 2 status](../employee-mobile-phase2/STATUS.md)

## What changed and why

The service recorded a request, ended every session and revoked calendar feeds in one transaction (passkeys are
revoked and session issuance fenced by the 0035 trigger). Four pre-existing defects sat on top of it, and two
independent reviews found more:

| ID | Defect | Fix |
|---|---|---|
| DEL-1 | The password re-check had no attempt limit, so a stolen session could guess the password here | Both paths consume the sign-in limits (`admitLoginAttempt` then `passwordLoginAllowed`) |
| DEL-2 | A storage error after COMMIT said "Nothing was deleted and you're still signed in" | Only statement-level SQLSTATEs (22/23/42/44/P0, 40001, 40P01) mean rolled back; anything else is unknown |
| DEL-3 | A lost reply reached the error boundary; acceptance had ended every session, so the reference was lost | Resending the same form resolves it: with a session it returns the open request; without one a counted password check returns only that account's open request (sign-in already reveals the same fact after the same proof) |
| DEL-4 | Profile's `#profile-account-deletion` return had no matching row | Row id added; Keep my account returns focus to it |
| DEL-5 | A page showing account A could submit for a different signed-in account B | The form carries the account it showed; a mismatch is refused (`changed`) |
| DEL-CR-3 | A duplicate request returned early without ending sessions | The transaction always runs |
| DEL-CR-4 | Sign-in fencing relied only on the 0035 trigger | The accepting transaction bumps `employees.updated_at` itself |
| DEL-CR-5 | A controlled password field mirrored into the DOM | Uncontrolled field; forgotten after every reply (React resets action forms) |

## Experience (Employee/Lead phones; desktop and Manager/Owner keep Quiet)

One client owner holds state across resize and rotation. Review: own account facts, then the actual consequences
(access ends now including passkeys, calendar feeds and device alerts; you can't cancel it in the app; deletion
within the confirmed policy period; your job doesn't change), then the retention schedule as an optional
disclosure, then password and a deliberate confirmation. Outcomes are distinct in icon, title and copy:
`failed` (nothing saved, rolled back), `uncertain` (may have been saved; *Check my request*, which re-sends only if
nothing was saved), `busy`, `unavailable`, `signed_out`, `changed`, and the receipt (reference, received time,
copy, support email, Done). After acceptance the app navigation is hidden so one tap can't lose the reference.

Policy facts are quoted from `POLICY_FACTS` (confirmed October 20, 2026). No self-service cancellation, retention
period or erasure guarantee was invented; erasure remains the runbook's operational workflow.

## Verification (actual results)

| Check | Result |
|---|---|
| Unit: service, action, view, owner, legal pages, login | 66 passed (at `cb3c67ee`; view 9 at `6931d90d`) |
| Real PostgreSQL action/SQL (8 cases) | 8/8 at `6931d90d`; 6/7 of the original cases **fail on `003bbe2c`** ([RED](evidence/sql-red-on-003bbe2c.txt)); the fence case fails without the explicit bump ([RED](evidence/fence-red-without-bump.txt)) |
| Three-engine browser journey | Passed at `6931d90d` ([run 8](evidence/run-8.log)): Chromium 14, WebKit 13, Firefox 12 checks; 110 viewport captures; 198 contrast samples, minimum 5.03:1; 0 page errors, 0 unexpected console errors |
| Static | Nonincremental TypeScript and changed-file ESLint clean |

Failed runs are preserved, not relabelled: run 1 (harness `ENOBUFS`, see below), run 2 (WebKit focus read before
its frame), runs 5–6 (a test defect, then a real regression where React's form reset emptied the password the
page still held). Coarse landscape was verified by media query, not marker: Chromium coarse/1 touch point,
WebKit coarse/0 reported touch points, Firefox not coarse (kept the desktop page, recorded as such).

Harness fix: at `003bbe2c` the tracked-file list (1,187,714 bytes) exceeded Node's default `execFileSync` buffer,
so `createOwnedNextApp` could not start at the published head. `owned-next-app.ts` now allows 64 MiB; an
overflow still throws. `scripts/phase-e-owned.mjs:448` and `scripts/lib/premium-owned-runtime.mts:30` carry the
same latent limit (HARN-1, not changed here).

## Independent review status

- UI/UX: initial **GO with conditions** (DEL-UI-1..6 material); closure at `cb3c67ee`: **GO**, 1–6 closed. New
  minors 19–22 were then fixed at `6931d90d`; their closure is with the reviewer. Open: UI-13 (icon sizing
  consistency), UI-15 (address wraps at 200%, no hyphen), UI-16 (incumbent sign-in page, separate batch), UI-18
  (busy/unavailable/duplicate/changed have unit coverage only).
- Code/security: initial **GO with conditions** (CR-1, CR-2 material); closure at `cb3c67ee`: **GO with
  conditions**. CR-1/2/3/5/7 closed. CR-4 partially closed (now tested without the trigger at `6931d90d`; session
  and credential are not rechecked in the accepting transaction). CR-6 partial (runbook identity step undefined).
  CR-8 partial (desktop new states have no SSR test; the passkeys flag path is unit-mocked only).
  CR-10 wording changed to "you can't cancel it in the app".

## Decisions for Jose

1. Whether the deletion screen should mention that support may be able to withdraw a request before processing
   (the runbook allows it; the app currently says only that it can't be cancelled in the app).
2. The identity check operations use before a withdrawal (runbook now requires one; the method is undefined).

## Not covered

Physical iOS/Android, VoiceOver/TalkBack, OS Dynamic Type (root 200% only), hosted transport, the erasure
workflow itself, email delivery, and release. The deletion is recorded only on fictional local data.
