# NEVORA Phase C — C2 Employee Clocker PIN checkpoint

Date: 2026-10-05
Branch: phase-c/real-time-clock-live-operations
Starting checkpoint: c6c2d4a8f19efb0b55a61ef245b3c36d1757433b
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status
C2 is implemented and locally verified. Phase C remains IN PROGRESS.
No clock-in, break, or clock-out writer was activated. No worked time is recorded by PIN verification.
This is a development checkpoint, not a release candidate or physical-tablet certification.

## Delivered
- Separate four-digit Clocker PINs, including leading zeroes, with workspace-wide uniqueness.
- Server-only keyed lookup, separate domain-separated verification prehash, random salt and fixed-cost asynchronous scrypt.
- No default PIN, plaintext persistence, PIN logging, browser storage, or PIN returned in a response.
- Owner/Manager PIN setup/reset under current employee-management authority; Managers cannot reset Owner PINs.
- Current session and target activity checked at the database boundary, plus stale-version protection.
- Reset advances the PIN version and invalidates tablet identity without modifying portal passwords or time records.
- Append-only PIN-change audit entries without PIN/hash values.
- PostgreSQL-reserved attempt budgets before expensive verification, including workspace and per-device limits.
- Short-lived device-bound identity cookies; the client receives only first name and expiration after verification.
- Final-write identity guards prepared for C3, rechecking current device, employee, PIN, eligibility, and expiration.
- Dedicated management page at /app/employees/[employeeId]/clocker-pin and a link from authorized employee profiles.
- Apple-style shared-tablet PIN keypad; Done, Escape, idle timeout, hidden-page and restored-page privacy reset.
- Uncertain verification outcomes block further entry until a successful privacy reset; PINs are never replayed automatically.
- Missing PIN configuration keeps C1 setup available without pretending timekeeping is connected.

## Verification actually run
| Check | Result |
| --- | --- |
| Baseline unit suite | 138 files / 1,415 passed |
| Final full unit suite | 139 files / 1,427 passed |
| Combined C1+C2 Clocker integration/security/crypto suite | 6 files / 117 passed |
| C2 portion of that suite | PIN lifecycle 34; crypto 11; transport 13 |
| Existing foundation PostgreSQL regression | 2 files / 75 passed |
| C2 Chromium + WebKit browser checks | 46 passed; 0 errors; 12 screenshots |
| Existing C1 Chromium + WebKit browser regression | 62 passed; 0 errors; 16 screenshots |
| TypeScript | PASS, including after removing build-generated configuration drift |
| ESLint | PASS |
| Local production Next build without DATABASE_URL | PASS |

The foundation suite retains its existing 0001–0010 fixture chain. The new C2 suite applies the C1 and C2 drafts to owned databases. The other historical PostgreSQL suites were not all rerun against the new drafts during C2.
The browser suite tests real Owner actions, real tablet cookies, real PostgreSQL, real and accelerated idle timers, and restored-page lifecycle events. Those event tests are not a claim that physical Safari BFCache behavior was certified.
Widths: 320, 375, 390, 430, 768, 1024, 1440. Tablet layouts: 1024×768, 768×1024, 320×740. Long unbroken employee names were exercised at 320px.

## Guardrail findings fixed
1. An in-flight PIN verification could survive a privacy reset with no prior identity cookie. The device-locked reset now cancels the current attempt nonce before clearing identity.
2. A lost committed verification response allowed immediate PIN resubmission. Unknown results now require an explicit successful privacy reset before entry resumes.
3. A restored-page lifecycle event retained the previous employee greeting. Pagehide clears local identity; persisted pageshow requires server reset.
4. Long unbroken employee names overflowed narrow tablet layouts. The greeting wraps without truncation or reduced text size.
5. Initial privacy reset synchronization was refactored to asynchronous effect completion and serialized clearing, satisfying React lint without suppressions.

The browser harness waits for privacy-reset completion before asserting zero database sessions; merely hiding the employee greeting is not sufficient proof of completed server cleanup.

## Configuration and security limits
- New draft: db/phase-c/clocker-pins.sql, after clocker-devices.sql. No numbered migration reserved and no historical migration edited.
- NEVORA_CLOCKER_PIN_KEY must be a persistent secret 32-byte value encoded as 64 hex characters, separate per environment. It must never be exposed through NEXT_PUBLIC variables.
- The first PIN setup pins the key identity for the workspace. Accidental key replacement fails closed. Key rotation/recovery needs a reviewed reset/migration procedure.
- Existing NEVORA_CLOCKER_ORIGIN protections apply; production requires its canonical HTTPS origin.
- Four-digit PINs remain low-entropy credentials and do not prevent impersonation by someone who knows or is given another employee's PIN. They are not portal-password replacements.
- Current failure/in-flight caps: 5/device and 20/workspace per five minutes; total verification budgets: 60/device and 240/workspace per minute. Successful verification releases only its own failure reservation. Pilot evidence must confirm throughput and appropriate tuning.
- Browser identity clears after 30 seconds; server authorization expires after 60 seconds. Later punch writes must use the provided current-authority guards inside their own transaction.
- No real notification providers, existing customer databases, Preview databases, production credentials, or production infrastructure were used.

## Evidence
Local command logs: .superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/
C2 browser evidence: /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c2-ui-final
C1 regression evidence: /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c2-c1-regression
Review performed: implementation self-review and targeted guardrails. Independent Codex Phase C review remains pending.

## Next
C3/C4: persisted punch state machine, server timestamps, command-id idempotency, expected entry/break versions, concurrent tablet transitions, rollback, and lost-response reconciliation.
C2 does not implement these timekeeping operations, configurable breaks, schedule-context capture, live dashboards, or My Time.

## Recommendation
GO for continued isolated C3/C4 implementation.
NO-GO for live/customer timekeeping, Phase C release, merging, or production deployment.
Reconcile accepted Phase B hardening before freezing Phase C.

## Primary implementation references
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://nodejs.org/api/crypto.html
- https://www.postgresql.org/docs/current/explicit-locking.html
- https://playwright.dev/docs/clock
