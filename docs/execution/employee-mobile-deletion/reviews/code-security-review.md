# Employee mobile account deletion: code and security review

- **Reviewer role:** Independent senior code and security reviewer. I report findings only and changed no application or test file.
- **Revision reviewed:** `3df9513d12c1a870f0d7b8c4258860839ec4ad87` (HEAD of `claude/employee-mobile-phase2-20261027`), diffed against base `003bbe2c`.
- **Working tree note:** When this was written, the working tree had uncommitted edits by other agents to `src/components/employee-mobile/deletion.{tsx,css,test.tsx}` and to payroll and notification files. Those edits were not reviewed. All line numbers refer to HEAD.
- **Scope:** `src/lib/account-deletion/requests.server.ts` (+ test), `src/app/app/account/delete/{actions.ts,actions.test.ts,page.tsx}`, `src/lib/auth/session.ts` (`readSessionMutationProof`), `src/components/account-deletion-form.tsx`, `src/components/employee-mobile/deletion.{tsx,css,test.tsx}`, `src/components/employee-mobile/profile.tsx`, `src/test/integration/employee-mobile-deletion{,-sql}.integration.ts`, `src/test/integration/owned-next-app.ts`.
- **Read for context:** AGENTS.md, `docs/compliance/account-deletion-runbook.md`, migrations 0034 and 0035 (`auth_passkey_authority_loss`), `src/app/login/actions.ts`, `login-limits.server.ts`, `login-limits.ts` (`passwordLoginAllowed`), `session-issuance.ts`, the passkey `commitLogin`, `POLICY_FACTS`, `push-deliveries.ts` eligibility, the Neon HTTP driver error construction (`@neondatabase/serverless` 1.1.0) and React DOM 19.3.0 `updateInput`.
- **Run:** `npx vitest run src/lib/account-deletion src/app/app/account/delete src/components/employee-mobile/deletion.test.tsx src/app/legal-pages.test.tsx src/app/login/actions.test.ts`. Result: 5 files and 66 tests passed. I did not run the integration suites, which need PostgreSQL and browsers.

## What holds up

- **Authority.** A request can only be created along the session path, using `proof.employee.id`. The hidden `account` field is compared with the session and never replaces it (`changed`). Without a session, the action can only read through `checkDeletionRequest`. The client-supplied `retry` flag and `previous` state change wording only (`failed`↔`uncertain`, `duplicate`↔`received`). They never change which account is acted on or whether a write happens.
- **Receipts.** Every `received` or `duplicate` comes from a committed row: the pre-read, the batch's final SELECT (Neon HTTP returns only after COMMIT), the post-error re-read, or the no-session check.
- **Lock order.** Password sign-in guards, passkey `commitLogin` and acceptance all take the `employees` row lock first. Acceptance then touches passkeys, challenges, sessions and calendar. No lock cycle is possible. The limiter runs in its own earlier transaction and always inserts the per-ID scope before the address scope.
- **Sign-in race.** A concurrent sign-in that verified before acceptance is refused at issuance. 0035's trigger bumps `employees.updated_at`, and the third guard statement takes a fresh snapshot after the lock wait. Push delivery requires a live session, so deleting sessions stops new claims.

## Findings

### DEL-CR-1: the new no-session password check skips sign-in's second limiter, which includes a global cap

- **Severity:** material
- **Where:** `src/app/app/account/delete/actions.ts:34-39`, `src/lib/account-deletion/requests.server.ts:99-105`, compared with `src/app/login/actions.ts:34-38` and `src/lib/auth/login-limits.ts:30-33`
- **Failure scenario:** With `NEXT_PUBLIC_NEVORA_PASSKEYS=on`, password sign-in must pass two limiters:
  - `admitLoginAttempt`: 10 per ID and 60 per address every 15 minutes.
  - `passwordLoginAllowed` → `consumeLoginAttempt`: a **global** 300 per 15 minutes plus 10 per ID, and it denies on storage failure.

  The deletion action calls only the first limiter, on a path anyone can reach without a cookie. A distributed attacker spraying one password across many Employee IDs is held to 300 guesses per 15 minutes in total at `/login`. Through this Server Action the limit is 60 × (number of source addresses), and the global cap never applies. Each guess still yields a clean oracle: `wrong_password` against `signed_out` or a receipt. This bypasses a deployed control, so "counted like sign-in" (actions.ts:22) is not true.
- **Recommended fix:**
  - After `admitLoginAttempt`, call `passwordLoginAllowed(account)` on both paths, mapping `false` to `busy` (or to `uncertain` when `retried`).
  - Better, extract one `admitPasswordCheck(id, address)` helper that both `login` and this action call, so they cannot drift apart again.
  - Add an integration test with the flag on that proves the global counter moves.

### DEL-CR-2: `rejectedByDatabase` treats every 5-character code as a rollback, including codes that mean the outcome is unknown

- **Severity:** material
- **Where:** `src/lib/account-deletion/requests.server.ts:32-34` and `:91`, `src/app/app/account/delete/actions.ts:57`
- **Failure scenario:** `/^[0-9A-Z]{5}$/` matches all of these:
  - `40003` statement_completion_unknown and `08007` transaction_resolution_unknown, whose definitions say the commit outcome is unknown.
  - Class `08` connection exceptions and `57P01`/`57P02`/`57P03` operator shutdown codes. These can be reported in place of COMMIT's reply when a Neon compute restarts or scales mid-batch.
  - Any code the proxy synthesizes. The Neon driver copies `code` from any HTTP 400 JSON body.

  If any of these arrive after the commit record was flushed, a first attempt returns `failed`. The screen then says "Nothing was saved and you're still signed in". In fact the request exists and every session is already gone, which is the exact false "nothing happened" the requirements forbid. Outside the Neon wrapper the regex also matches Node's own 5-letter `EPIPE`, `EPERM` and `EBUSY`. The unit test only shows that `40001` counts as rejected and that `ECONNRESET`, `fetch failed` and a numeric code do not. It would not catch this.
- **Recommended fix:**
  - Classify as "rolled back" only from an allowlist of errors raised by a statement before COMMIT: classes `22`, `23`, `42` and `P0`, plus `40001`, `40P01`, `55P03` and `25P02`.
  - Treat everything else, explicitly including `08***`, `57P**`, `40003`, `53***`, `58***` and `XX***`, as unknown. Unknown errors go through the existing re-read and then `uncertain`.
  - Add unit cases for `08006`, `57P01`, `40003` and `EPIPE`.

### DEL-CR-3: a duplicate found before the transaction skips session revocation, yet the screen says "signed out everywhere"

- **Severity:** minor (code existed before this change; the new receipt copy now makes the claim on phones)
- **Where:** `src/lib/account-deletion/requests.server.ts:63-64`, with `src/components/employee-mobile/deletion.tsx:55` and `src/components/account-deletion-form.tsx:81`
- **Failure scenario:** If a live session ever coexists with an open request, a confirmation returns `duplicate` from the pre-read and never runs `DELETE FROM employee_sessions`. Ways this can happen:
  - The sign-in race in DEL-CR-4 on a database without 0035.
  - A support status edit outside the runbook.
  - Any future session issuer that skips the `updated_at` guard.

  The receipt then claims "You've been signed out on every device… device alerts have stopped" while that session, and the push subscriptions tied to it, keep working.
- **Recommended fix:** Remove the early return, or keep it only as a hint. Always run the accepting batch: `ON CONFLICT DO NOTHING` already resolves the duplicate, and the batch then deletes sessions and revokes feeds every time.

### DEL-CR-4: blocking a concurrent sign-in depends on a 0035 trigger, and the accepting transaction does not recheck the session or credential it verified

- **Severity:** minor
- **Where:** `src/lib/account-deletion/requests.server.ts:72-85`, with `db/migrations/0035_passkeys.sql:59-62` and `src/lib/auth/session-issuance.ts:19-23`
- **Failure scenario:**
  - **Sign-in race.** Acceptance never bumps `employees.updated_at` itself. Only `auth_passkey_deletion_loss` (0035) does. On a database that has 0034 but not 0035 (migration order is not enforced by filename), the following sequence produces a live session for an account with an open request and breaks "can't sign in again":
    1. A sign-in reads its credential and passes `activeDeletionRequest`.
    2. Acceptance commits.
    3. The sign-in's guard passes and the session is inserted.
  - **Stale proof.** The batch also does not assert that `proof.sessionTokenHash` still exists or that the verified credential revision is unchanged. A password reset or sign-out landing between verification and COMMIT doesn't stop acceptance. The impact is low but contradicts `session.ts:66-68`.
- **Recommended fix:**
  - Add `UPDATE employees SET updated_at = clock_timestamp() WHERE id = $1` to the batch.
  - Assert the session row and the credential `password_updated_at` inside the batch.
  - Add an integration test that holds acceptance open while `login` is in `createSession` and expects `session_login_changed`.

### DEL-CR-5: the password is mirrored into the DOM `value` attribute and kept after failure states

- **Severity:** minor
- **Where:** `src/components/account-deletion-form.tsx:38`, `:45`, `:136-137` and `src/components/employee-mobile/deletion.tsx:88`
- **Failure scenario:**
  - **Attribute mirroring.** The input changed from uncontrolled (base) to controlled. React DOM 19.3 `updateInput` calls `setDefaultValue(element, value)` on every change, which writes the password into the `value` **attribute**. It becomes visible to `outerHTML`, DOM-capturing tooling and CSS attribute selectors. The integration harness's `failed()` dumps `body.innerHTML` to evidence. The base form also got React 19's automatic form reset; that reset is now gone.
  - **Retention.** The password is cleared only on receipt, `signed_out`, `changed` and `unavailable`. It stays after `failed`, `busy`, `uncertain` and `wrong_password`, and `shown` is not reset, so anyone at an unattended "Too many tries — wait 15 minutes" screen can reveal it with the eye button. Keeping it through `uncertain` is a defensible choice for the retry. Keeping it through `busy`, and through `wrong_password` when the value is known to be wrong, is not.
- **Recommended fix:**
  - Hold the value in a ref, not state. Restore it after the desktop↔phone remount by assigning `input.value` (the property) in a layout effect, and lift only a "has value" boolean.
  - Clear the value and reset `shown` on `busy` and `wrong_password`.
  - Clear on `pagehide`.

### DEL-CR-6: the no-session check returns more than sign-in does, and the runbook's withdrawal step doesn't say how to verify identity

- **Severity:** advisory
- **Where:** `src/lib/account-deletion/requests.server.ts:99-110` and `docs/compliance/account-deletion-runbook.md` ("Withdrawing")
- **Failure scenario:** After the same counted proof, sign-in reveals only "deleting". This path also returns the reference and the exact `confirmed_at`. That is required for recovery and acceptable. However, the runbook lets support set a request to `withdrawn`, which reopens password sign-in, and names no identity check. If support ever treats "knows the reference" as proof, a password holder can fetch the reference here, withdraw, and sign back in. Separately, `requests.server.ts:6-7` still says "Identity always comes from the server session", which `checkDeletionRequest` now contradicts.
- **Recommended fix:**
  - State in the runbook that the reference identifies a request but never authenticates a person.
  - Define a verification step before withdrawal.
  - Update the file header comment.

### DEL-CR-7: on desktop, the unknown-outcome warning disappears after a mistyped password

- **Severity:** minor
- **Where:** `src/components/account-deletion-form.tsx:149`, compared with `src/components/employee-mobile/deletion.tsx:101`
- **Failure scenario:** After `uncertain`, a wrong password on desktop shows only the field error. The banner saying "Your request may have been saved" is gone, and only the button label "Check my request" hints at it. The phone view keeps the caution through `checking && wrong_password`. The desktop never says something false, but it drops the only explanation of the unresolved state.
- **Recommended fix:** Mirror the phone condition (`checking && state.kind === "wrong_password"`) in the desktop alert.

### DEL-CR-8: test gaps and weak assertions

- **Severity:** minor
- **Where:** the following files and lines.
  - `src/components/employee-mobile/deletion.test.tsx:24`: `/aria-label="Show password"[^>]*>|aria-pressed="false"/` is effectively vacuous. Any `aria-pressed="false"` anywhere satisfies it.
  - `src/lib/account-deletion/requests.server.test.ts` (the `rejectedByDatabase` case): it covers neither outcome-unknown SQLSTATEs nor 5-letter Node codes, so DEL-CR-2 passes.
  - `src/test/integration/employee-mobile-deletion-sql.integration.ts:67-76`: the "concurrent" test can pass entirely through the pre-transaction `existing` read (requests.server.ts:63). It does not prove that the `ON CONFLICT` path or the `FOR UPDATE` serialization was exercised. Gate both calls on a barrier after password verification, or hold the first batch open, and assert that the second one waited.
  - Missing tests:
    - Sign-in racing acceptance (DEL-CR-4).
    - Limiter parity with passkeys on (DEL-CR-1).
    - Desktop (Quiet) rendering of the new `uncertain`, `busy`, `signed_out` and `changed` states. `legal-pages.test.tsx` renders only idle or existing, and the browser suite drives only the phone view and a Manager page load.
  - What does hold: the action unit tests meaningfully pin call order (limiter before password), refusal of another account, and unknown errors never becoming `failed`. The SQL integration test's lost-reply case (commit, then throw) and the browser `route.fetch()` + `abort('connectionreset')` case are genuine reproductions of a lost reply after COMMIT.
- **Recommended fix:** Tighten or replace the assertions above and add the missing cases.

### DEL-CR-9: harness `maxBuffer` change

- **Severity:** advisory, no defect
- **Where:** `src/test/integration/owned-next-app.ts:24-25`
- **Assessment:** Correct. `execFileSync` throws ENOBUFS rather than returning a truncated list, so exact-SHA evidence cannot be silently partial. 64 MiB is ample.

## Verdict

**GO with conditions.** Before release:

1. Fix DEL-CR-1: limiter parity with sign-in.
2. Fix DEL-CR-2: allowlist rollback classification and add the missing unit cases.

Both are small, contained changes. DEL-CR-3, -4, -5 and -7 should land in the same pass or be recorded as accepted risks by Jose. DEL-CR-8's concurrency and desktop-state tests should be added so the fixes are actually proven.

## Closure at cb3c67ee

- **Revision checked:** `cb3c67eed16a4a40ff33a461ac33bc9fdeee45bb`
- **Diff read:** `git diff 3df9513d..cb3c67ee` across the account-deletion server code, the action, the desktop owner, the phone view, both deletion integration tests and the runbook.
- **Unit tests:** I re-ran the same suite at cb3c67ee: 5 files and 66 tests passed. The scope files were clean in the worktree.
- **Integration evidence:** I read run 7's log and `results.json`. The run came from `scratchpad/red-base`, which `git rev-parse` confirms is at cb3c67ee with a clean status. It passed 8 of 8 tests across 2 files (the SQL file and the three-engine browser file). I did not run the integration suites myself.

| ID | Status | Basis |
|---|---|---|
| DEL-CR-1 | **Closed** | `actions.ts:36-38` calls `admitLoginAttempt` and then `passwordLoginAllowed` on both password paths, in the same order as `login`. `passwordLoginAllowed` returns false on storage failure, which becomes `busy` ("Nothing was sent"); that is true. Unit tests show the second limiter refusing on both paths and the order `admit → allowed → submit/check`. There is no integration test with the flag on. A shared helper would still stop the two paths drifting apart again, but that is not required. |
| DEL-CR-2 | **Closed** | `requests.server.ts:35-38`: an allowlist of `22`, `23`, `42`, `44` and `P0` classes, plus `40001` and `40P01`. Each of these is raised before COMMIT or aborts at COMMIT (deferred `23` or `P0`, serialization). Unit cases now prove that `08006`, `08007`, `57P01`, `40003`, `53200`, `XX000` and `EPIPE` count as unknown and that the six allowlisted examples count as rejected. |
| DEL-CR-3 | **Closed** | The early return is gone (`:67`), so a duplicate goes through the batch and ends every session. The unit test asserts that the duplicate path contains `DELETE FROM employee_sessions`. The SQL concurrency test can no longer pass through a pre-read. |
| DEL-CR-4 | **Partially closed** | **Closed part:** the batch now bumps `employees.updated_at` explicitly (`:86`), so the sign-in fence no longer depends only on 0035. **Open part 1:** the batch still doesn't assert that `proof.sessionTokenHash` exists or that the verified credential revision is unchanged. **Open part 2:** the bump is never tested on its own. `passkeys.integration.ts:170-176` exercises only the 0035 trigger, through a raw INSERT. **Advisory:** prefer the repository's monotonic idiom `GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')` from `src/lib/data/employees.ts:517` over a bare `clock_timestamp()`. A bare timestamp could leave the text unchanged when `updated_at` is equal to or ahead of the clock. |
| DEL-CR-5 | **Closed** | The input is now uncontrolled. The value lives in a mounted ref and is restored on remount through the `value` property (`bindPassword`), never the attribute. `forget()` runs after every reply, and `shown` resets on any non-idle reply. The browser run asserts that `getAttribute('value')` is null, that the field is empty after `wrong_password` and after `failed`, and that the password is retyped for "Check my request". |
| DEL-CR-6 | **Partially closed** | The header comment is accurate now. The runbook says a reference is not proof and requires confirming the person before withdrawal. However, the identity step itself is still undefined and is marked for Jose or operations to confirm. |
| DEL-CR-7 | **Closed** | `account-deletion-form.tsx:156` now keeps the alert for `checking && wrong_password`, matching the phone view. |
| DEL-CR-8 | **Partially closed** | **Fixed:** the vacuous `aria-pressed` alternation is replaced by explicit assertions, `rejectedByDatabase` coverage is added, and the concurrency test is now meaningful because the pre-read is gone. **Still missing:** a test for the explicit-bump race (see DEL-CR-4), an integration test with the passkeys flag on, and any test of the desktop Quiet `uncertain`, `busy`, `signed_out` and `changed` states. The author says the state is internal to the component; a client-render test or a desktop leg in the browser suite would cover it. |
| DEL-CR-9 | **Closed** | Nothing to fix. |

### DEL-CR-10 (new): the phone review says "NEVORA has no way to cancel it", but the runbook lets support withdraw a request

- **Severity:** minor
- **Where:** `src/components/employee-mobile/deletion.tsx:80` at cb3c67ee ("You can’t undo it in NEVORA … After you confirm, NEVORA has no way to cancel it."), against `docs/compliance/account-deletion-runbook.md:57-62`.
- **Failure scenario:** The consequences shown before confirmation must match the service contract. Today the operator can withdraw a request "before processing starts", and the person can then sign in again. An employee who confirms and immediately regrets it is told that no route exists, while support actually has one. That is the inverse of an invented cancellation right, and it is equally untrue. The unit regex that forbids `cancel your request|withdraw` doesn't catch "no way to cancel it". The desktop copy makes no such claim, so the two presentations now state different contracts.
- **Recommended fix:** Jose decides whether withdrawal is a supported promise.
  - **If it is not offered to people:** change the copy to something accurate, such as "You can’t cancel it in the app", and align the desktop copy.
  - **If it is:** say "To ask about your request, email support", without promising an outcome.

  In either case, keep the runbook and the copy consistent.

### Updated verdict

**GO with conditions.** Both material findings (DEL-CR-1, DEL-CR-2) and DEL-CR-3, -5 and -7 are closed. Before release:

1. Resolve DEL-CR-10's wording with Jose.
2. Either finish the open parts of DEL-CR-4 (session and credential guard in the batch, plus a test of the explicit bump) or have Jose record them as accepted risk.
3. Track the remaining DEL-CR-8 test gaps and DEL-CR-6's operational identity step as named follow-ups.
