# Phase C C8 — Employee live state and My Time

Date: 2026-10-05
Base: `74368569c99804d0c28f3e6baeacaab5f3045877`
Canonical branch: `phase-c/real-time-clock-live-operations`

## Scope and local acceptance

**C8 is implemented and locally verified for continued development. Phase C overall remains in progress. Production is not authorized.**

Employee Home now reads its current Off Clock / Clocked In / On Break state from persisted Clocker records. It no longer supplies a hard-coded clock state or 8 AM–4 PM schedule. Today displays the actual published shifts supplied to the Home page, including multiple shifts and their locations, or an explicit no-published-shift message. Actual clock state remains independent of scheduled presence.

My Time replaces the readiness placeholder with three existing-style surfaces: Current Status, Today, and Recent Entries. Employees and Leads see only their own recorded clock-ins, clock-outs and breaks, including stored historical break names. Entry details use keyboard-operable disclosures. Current entries remain visible across midnight, employee location changes and device revocation; no daily reset or automatic clock-out is inferred.

Today totals use the configured business timezone, clip overnight intervals to the business day, and aggregate precise elapsed intervals before display conversion. **Recorded time includes breaks; recorded break time is shown separately. These are not payroll hours.** No paid/unpaid classification, deduction, rounding policy, legal attendance rule, earnings calculation or correction/approval workflow is added. Existing scheduled-hours/estimated-earnings UI is unchanged. Persisted timestamps are never rewritten by this feature.

All Today entries remain available. Earlier history is explicitly the 20 most recent completed entries before Today, with a truthful displayed count of all such earlier entries. This is a bounded recent-history view, not an all-history report or a retention/deletion policy.

## Security and lifecycle

The private API derives identity from the actual HttpOnly portal cookie; it accepts no employee selector and rejects query-string selection. Current Employee/Lead authority is checked at both route and SQL boundaries. Owner/Manager access is rejected on this existing employee-only route; no new manager impersonation capability was introduced.

The read pins workspace, actor and session authority, observes actual rows and database time in one snapshot, then rechecks current session authority after the potentially blocked SELECT. Expired or revoked sessions, role changes and inactive employees cannot return a successful private snapshot. Missing schema, transport failures and inconsistent time/break history are explicitly unavailable rather than a false empty/Off Clock result.

Responses are private/no-store with Cookie variation. Only display fields are serialized; no PINs, session proofs, device credentials or raw SQL diagnostics are returned. The shared private-snapshot controller preserves C7's exported Manager contract while reusing its tested sequence/abort, timeout and bounded-lifetime rules. It polls active online pages every 30 seconds; response lifetime is at most 45 seconds and is shortened by remaining session time and network round trip. Stalled requests clear data after ten seconds. Hidden/offline/page-leaving states clear private history, and re-entry requires a fresh response. No time records are written to browser local/session storage.

C8 performs no time-entry, break, schedule, notification or payroll mutations. Registered-tablet punch writing remains in the existing canonical Clocker service.

## UI and verification

The approved Apple-style Employee shell, typography, tokens, navigation and two-surface Home composition are preserved. My Time uses three neutral surfaces, compact status labels, 44px minimum controls, wrapping long content and native disclosures; no new theme or navigation layout was introduced.

| Fresh verification | Result |
| --- | --- |
| Complete unit suite | 1,731 passed / 158 files |
| New C8 unit cases included above | 75 |
| Clocker PostgreSQL/security/integration suite | 363 passed / 21 files |
| New self-service reader cases included above | 21 |
| Foundation PostgreSQL | 269 passed |
| Original authorization replay on the Phase C schema | 46 passed; repeated coverage, not additional unique tests |
| Generation / shift-change / notification PostgreSQL | 176 / 163 / 77 passed |
| Native C8 browser flow | 58 passed, Chromium and WebKit |
| Supplemental layout/keyboard/response-lifetime checks | 14 passed, Chromium and WebKit |
| Manager live-monitor / existing tablet-punch browser regression | 50 / 70 passed |
| Authenticated application regression | 23 Chromium + 23 WebKit passed |
| Configuration checks | 14 passed |
| Production-dependency audit | 0 reported vulnerabilities |
| TypeScript, lint, local production build | PASS |

Final browser checks total **238**. The native flow uses real login/cookies, Owner PIN/device setup and actual registered-tablet Clock In, Start Break, End Break and Clock Out requests, then verifies the employee's displayed records and persisted timestamps. It exercises empty, loading, unavailable, malformed/stalled response, recovery, revoked sessions, role denial, offline and restored-page states. My Time and Home were checked at seven widths from 320 to 1440px. Supplemental checks cover maximum-length names/location/break labels, two actual published Today shifts, 20-of-23 history disclosure, measured active-text contrast, actual Tab/Enter navigation and last-row clearance above mobile navigation.

Pre-edit Home/My Time screenshots and final rendered screenshots were inspected. Browser tests use owned local Next development runtimes and disposable PostgreSQL with a substituted local database transport; external providers are disabled. Historical layout rows are explicitly fictional fixtures, separate from native-punch evidence. No physical-device, screen-reader, hosted Neon or customer-scale performance certification is claimed.

## Review findings and preservation

Author self-review, not independent Codex certification. The complete changed-file set, shared controller extraction, SQL/route authorization, lifetime and data-shape validation, actual-time calculations, UI wiring and protected scope were reviewed. No unresolved blocking finding remains in the reviewed C8 scope.

The four screen-wiring regressions failed before implementation and passed after the existing component was connected. Final review found that one database test's title mentioned revoked devices without performing revocation; the test was strengthened to call the actual device-revocation repository, and the complete 363-case Clocker suite passed again. No original authorization or rollback assertion was removed.

Browser-harness corrections are retained transparently: wait for confirmed tablet enrollment before navigation; convert computed CSS color() values through the browser rather than parsing normalized channels as byte RGB; use nonoverlapping sequential historical fixtures; scope repeated break labels to their owning entry; and exercise actual in-page keyboard navigation rather than tabbing out of the document and triggering the required privacy refetch. Those corrections did not change product security, focus behavior or palette, and did not lower assertion thresholds or filter application errors. Earlier failed runs remain preserved.

Only inspected Next-generated `next-env.d.ts` and `tsconfig.json` changes were restored to their accepted baseline bytes. Final source checks and the full unit/TypeScript/lint replay passed after restoration. Runtime/schema source remained stable through verification; the later revocation change was test-only and explicitly rerun.

Evidence and supplemental scripts:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-c8-employee-time/`

Permanent native workflow: `scripts/phase-c-employee-time-ui-qa.mjs`.
Permanent database suite: `src/test/integration/clocker-employee-time.integration.ts`.
The external `layout-review.mjs` and its final `final-layout-keyboard` evidence preserve the extra keyboard/contrast/lifetime checks.

## Release boundary and next step

C8 changes no numbered migration, C1–C6 schema draft, authentication primitive, canonical punch writer, dependency version, production database transport or accepted CI workflow. No push, hosted database modification, deployment, real-provider activation or live-punch activation occurred. This remains the single-workspace pilot architecture; it is not multi-tenant certification.

**FR-AUTH-001 remains OPEN and required before production.** Codex must independently review the final integrated release SHA and retest C8 self-service authorization after blocked reads, actual-time/overnight calculations, read-only invariants, private response validation and caching, shared controller lifecycle and real hosted transport. Earlier branch-specific or local tests do not close the gate.

Next: C9/C10 — the remaining Phase C Clocker UI acceptance and complete integration/hardening review, followed by the separately controlled final release. Existing connected tablet work should be verified against that scope, not reimplemented. Phase D timecard corrections and approvals remain out of C8.
