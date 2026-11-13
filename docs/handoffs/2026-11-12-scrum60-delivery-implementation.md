# SCRUM-60 workforce notification delivery

Jose requested implementation, tests and development integration in this chat.
He then directed this chat to work independently without contacting other chats.
No further chat contact will occur. This detached worktree starts at freshly
fetched development `f6baaaa6d988f34fb1c3388d0e1fe4c410bcbfd5`.

## Scope and controls

The existing notification pipeline, allowlists, encrypted subscriptions, private
payloads, consent/revocation, retries and UI contract are retained. Claude owns UI;
Codex owns backend/hosting. Development is the operating/acceptance release, held
to production standards; real main/production requires separate authorization.

Source inspection and new RED tests reproduced an account-mail liveness gap:
connection/greeting/socket inactivity timeouts do not bound an entire slowly
progressing SMTP send. Three new deadline/EN/ES verification assertions failed
against the untouched baseline. The focused existing baseline passed 565 tests.
Add a 15-second total send wait, preserve UNKNOWN on timeout and late acceptance,
and never infer a definite failure or automatically resend from that timeout.

## Implementation and verification plan

1. Retain deterministic RED and real loopback slow-SMTP reproductions.
2. Add only the shared SMTP total-wait deadline and timer cleanup.
3. Run focused notification/account-mail checks, real loopback SMTP, owned
   PostgreSQL notification/operations checks, full default suite, types, lint,
   production build and source inventory. Tests use fictional data and local
   transports; no provider delivery is implied.
4. Record exact code/evidence and perform a non-forced development integration
   only after relevant checks and a fresh source/ancestry readback. Preserve any
   concurrent development changes. Main/production is outside this task.
5. Keep SCRUM-60 open for any remaining actual approved inbox/browser delivery
   receipts. The pre-existing sole hosted execution packet remains separate,
   held/unstarted, and is not duplicated or activated by this code change.

## Required evidence boundary

Provider accepted, inbox observed, browser displayed and human read are separate
states. Browser permission and ordinary sign-in are human actions. No additional
email/push, customer data, credentials, paid activation, hosted worker/schedule or
finite-window extension is authorized by these local tests. A deadline bounds
caller waiting; it does not prove physical cancellation of SMTP delivery.

Nodemailer documents socketTimeout as an idle limit:
https://nodemailer.com/smtp#connection-options . Source-bound tests and final
results will be recorded below before integration.

## Implemented code and source

Code checkpoint: `46ad1f9108288d1154a7501f31eae743f4c4bcae`.
Only `src/lib/auth/mail-transport.server.ts` changes runtime behavior. A per-send
15-second Promise deadline now bounds the entire SMTP wait. The deadline emits
the generic `smtp_deadline_exceeded` uncertainty, which existing invitation and
verification adapters retain as UNKNOWN. Late acceptance does not overwrite the
returned uncertainty or cause another send. Timers are cleared after settlement.
Existing TLS, recipient allowlist, field validation and feature gates are intact.
No schema, API contract, dependency, flags, UI or provider configuration changed.

Two regression files cover the deadline, late acceptance/no resend, timer cleanup,
EN/ES verification classification and an actual slowly progressing loopback SMTP
conversation. On the original code, four assertions failed, including real SMTP
acceptance after roughly 17 seconds. After repair, all five new tests pass.

All six checked-in guide PDFs and their manifest were regenerated against this
committed application source, using the pinned headless Chromium builder offline.
Application hash: `4f7adfd75bdb3fc6f8bce9f452fc1f35c1705a957b8979f53e325eb301510ffb`.
This is source qualification, not publication of the application or hosted guides.

## Checks actually run

| Check | Result |
|---|---|
| Existing focused baseline | 565 passed |
| RED deadline/slow-SMTP regressions | 4 failed, 1 passed as intended on original code |
| Repaired focused notification/account-mail/routes/monitor selection | 590 passed |
| Canonical owned PostgreSQL notification suite | 80 passed |
| Owned PostgreSQL workforce-operations suite | 27 passed |
| Final full `npm test` | 12,771 passed; 895 skipped; 858 files passed, 33 skipped |
| TypeScript | passed |
| Full ESLint | passed, 0 errors; one existing anonymous-default-export warning in `services/hosted/neon/workforcemonitor.entry.ts` |
| Production build with sanitized release environment | passed |
| Six source-qualified manuals | generated and verified |
| Unchanged browser-evidence file after initial full-run timeout | 52 passed, also passed in final full suite |
| Whitespace check | passed |

Runtime: Node 24.19.0; actual owned PostgreSQL 16.2, matching the supported CI major.
Both successful SQL runners stopped and removed their fresh temporary clusters.
No existing application database or remote credentials were used. The initial SQL
setup attempts selected an incomplete binary directory, then an incompatible
runner/prefix. Both refusals are retained in local logs; the existing canonical
runner resolved them without weakening any custody check.

The first full run had 12,769 passed and two failures: stale source-bound manuals
and `phase-e-browser-evidence > rejects relocated observation-failure` timing out
at its unchanged five-second limit. Manuals were regenerated; the unchanged
evidence file passed in isolation and in the final complete run. The original
failure log is retained. No test assertion, timeout or snapshot was relaxed.

Detailed commands, summaries and log hashes: [qualification.json](scrum60-evidence-20261112/qualification.json).
Committed RED/green transcripts and full summary are beside that file. Full raw
logs remain locally in that same directory under the repository's normal log ignore.

## Review, integration and remaining acceptance

Scoped self-review found no changed authority, recipient, consent, key, retry or
payload policy. It is not an independent audit certification. No further chats or
review agents were contacted after Jose directed this work to stay in this chat.

Jose expressly authorized testing and development integration. Development's
existing ten required status checks remain enforced, including strict current-base
matching. Publish one immutable candidate tag for those checks, then use only a
non-forced fast-forward after they pass and a fresh branch/source readback. The
candidate/main/production and hosted delivery gates are separate; no check may be
bypassed to complete this task. Actual candidate/check/merge receipts belong in
SCRUM-60 and the local post-publication receipt.

The backend code is implemented and locally qualified. Whole SCRUM-60 acceptance
still needs the original explicitly bounded, source-qualified hosted workforce
SMTP/browser-push exercise and actual inbox/device readback, normal human browser
permission/sign-in, closure of delivery triggers and exact disabled-state receipt.
This chat has made zero external email/push attempts and no hosted activation.
The independent findings and existing shared release CI issues are not closed by
this SMTP fix. Main/production stays held.

Engineering: minimal transport fix with real RED/GREEN and SQL evidence.
Security: existing least privilege and outbound gates retained; timeout remains
uncertain and does not prove physical cancellation. Governance: GO WITH CONDITIONS
for development integration after required CI; hosted/production acceptance remains
open. Program delivery: code and source-bound manuals are ready for exact-candidate
CI, with actual live delivery still pending separately.
