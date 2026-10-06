# NEVORA Phase C — executive release remediation checkpoint

Date: 2026-10-05
Implementation SHA: `10f5fbf7240c192fadad963b7c011f0918c982f9`
Base/frozen guardrail candidate: `a4022df581cfd39eff938f89ebda6c5596d2f487`
Branch: `fix/phase-c-release-remediation`

## Decision

The executive guardrail remediation is implemented locally. This checkpoint closes the **local implementation defects** found by the COO/CIO/QA/UI/Release review, but it does **not** close the external final-release gates.

Production remains **NO-GO**. No push, deployment, hosted database mutation, live punch activation or provider activation is included.

## R1 — canonical Phase C migrations

The five Phase C draft schemas were promoted into the numbered migration chain in dependency order:

- `0011_clocker_devices.sql`
- `0012_clocker_pins.sql`
- `0013_clocker_punches.sql`
- `0014_clocker_breaks.sql`
- `0015_clocker_schedule_context.sql`

Historical migrations `0001–0010` remain unchanged. The promoted SQL bodies are semantically identical to the accepted Phase C drafts; only release comments changed.

The local database helper now defines the canonical current runtime as migrations `0001–0015`. A dedicated release-migration suite proves both:
- fresh installation through 0015;
- upgrade from the exact 0010 state through 0011–0015, preserving pre-existing device/time/break rows and leaving new optional context fields honest rather than backfilled.

No real device, PIN, punch, break type or schedule match is seeded by these migrations. `db/phase-c/` now contains documentation only so tests cannot accidentally use a second schema source.

## R2 — deterministic Employee My Time QA

The WebKit failure from the executive guardrail was traced to the test harness navigating a Lead away from Employee Home before the initial protected time snapshot completed. Product behavior was not changed.

The QA flow now waits for the initial protected `Off Clock` state before navigating to My Time. The owned Next fixture also skips tracked files that are deleted in the working tree, which is required after removing the dead legacy Clocker demo.

Fresh browser verification after the change:
- Employee Home / My Time: **58 checks, 0 errors** across Chromium + WebKit.
- Clocker punch UI: **70 checks, 0 errors**.
- PIN/privacy UI: **46 checks, 0 errors**.
- Device/setup UI: **62 checks, 0 errors**.
- Break settings UI: **44 checks, 0 errors**.
- Manager live operations UI: **50 checks, 0 errors**.
- Protected punch HTTP: **23 checks, 0 errors**.
- Authenticated application regression: **23 Chromium + 23 WebKit**, zero failures.

Total browser/HTTP acceptance in the remediation pass: **399 checks**.

## R3 — expanded release CI

A separate `release-postgres` GitHub Actions job now runs the SQL suites omitted by the earlier CI:
- Foundation;
- Phase B authorization replay on the Phase C schema;
- generation;
- shift-change/exchanges;
- notifications.

The release gate runs for Phase C/release heads, PRs targeting Phase C/release branches, and for `main` / `development` PR destinations and push SHAs. This prevents a green feature SHA from being treated as proof for an unverified merge SHA.

The existing validate and Clocker PostgreSQL jobs remain intact.

## R4 — governance/source of truth

The automation charter now distinguishes its historical pre-Phase-C inventory from the current Phase C implementation. The release-control record establishes the procedural path while GitHub branch-protection/ruleset enforcement is unavailable on the current private-repository plan:

**Frozen SHA → exact CI → isolated Preview → hosted schema/runtime validation → independent Codex review → ChatGPT executive review → Jose production approval.**

No direct `main` or `development` production release is authorized by this checkpoint.

## R5 — dead demo and UI-token cleanup

The unreachable pre-Phase-C local-state Clocker implementation was removed:
- `src/components/clocker-kiosk.tsx`;
- `src/lib/clocker-kiosk.ts`;
- its obsolete unit test and `.clocker-terminal-*` CSS.

The active Clocker route continues to use the registered-device → private PIN → persisted punch path.

Active Clocker modules now consume the approved shared NEVORA palette tokens instead of duplicating the same colors. During review, a mechanical replacement that had corrupted five `white-space` properties was reproduced by a failing regression test and corrected before acceptance. No redesign, geometry change or new color pairing was introduced.

## Additional dependency hardening

During final verification, the production audit newly reported `source-map-js@1.2.1` as high severity. The transitive lock entry was minimally updated to `1.2.2`, with no direct dependency added. The production-only audit then returned **0 vulnerabilities**.

The full audit still reports five high advisories inside the development-only Next/ESLint toolchain. npm's automated remedy is a breaking downgrade to Next-14-era lint tooling, while the installed Next/ESLint pair is the current compatible 16.x family. These remain the already disclosed development-tooling follow-up; they are not shipped runtime dependencies and do not change the production-audit release criterion.

## Fresh local verification before checkpoint documentation

| Gate | Result |
| --- | ---: |
| Unit suite | **1,735 passed / 161 files** |
| Clocker + Phase C migration PostgreSQL | **365 passed / 22 files** |
| Foundation PostgreSQL | **269 passed** |
| Phase B authorization replay | **46 passed** |
| Generation PostgreSQL | **176 passed** |
| Shift-change PostgreSQL | **163 passed** |
| Notification PostgreSQL | **77 passed** |
| Configuration checks | **14 passed** |
| Browser / HTTP acceptance | **399 passed** |
| TypeScript | **PASS** |
| ESLint | **PASS** |
| Local production build | **PASS** |
| Production dependency audit | **0 vulnerabilities** |
| Diff hygiene / historical migration guard | **PASS** |

All PostgreSQL verification used newly owned disposable loopback databases with explicit ownership markers and teardown. Providers were disabled. Browser flows used fictional records and owned local Next runtimes.

## Review findings fixed during remediation

The remediation itself exposed and corrected four additional test/release issues rather than hiding them:
1. invalid CSS property names introduced by mechanical token replacement;
2. owned Next fixture attempted to copy deleted tracked demo files;
3. an old Foundation catalog comparison stopped its upgrade side at migration 0010;
4. the release SQL CI condition originally did not cover fix-branch PRs targeting Phase C or the final main/development merge SHA.

Each issue was traced to its root cause and the relevant regression was made deterministic before the full pass.

## Still-open final-release gates

This local remediation does **not** close `FR-AUTH-001`. Before production:

- publish the exact approved local candidate and obtain exact GitHub CI;
- deploy that exact SHA to the verified Vercel Preview project;
- use an explicitly isolated non-production Neon database;
- apply/verify 0011–0015 through the real hosted migration procedure;
- exercise the actual Neon HTTP transaction path and hosted browser flows;
- verify Vercel team/project and deployment-to-SHA mapping;
- verify backup/rollback readiness and minimum production observability;
- complete physical shared-iPad / remaining accessibility checks where required;
- have Codex independently perform the final adversarial review on the exact integrated SHA and record closure of `FR-AUTH-001`;
- receive Jose's explicit production authorization.

Earlier tiny unexplained Clocker paint differences remain disclosed until physical-device/final independent review; they are not silently reclassified by this remediation.
