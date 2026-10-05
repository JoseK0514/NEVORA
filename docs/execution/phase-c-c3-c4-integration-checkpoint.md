# Phase C3/C4 — protected punch API and connected tablet checkpoint

Date: 2026-10-05
Branch: phase-c/persisted-punch-engine
Starting checkpoint: 3617e4ddcc68d8acf571388b967dd7741b8230cf
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc
Approved plan: docs/superpowers/plans/2026-10-05-nevora-phase-c-punch-integration.md

## Status
The protected HTTP transport and connected tablet flow are implemented and locally verified on this isolated branch. Phase C as a release remains IN PROGRESS. Actual time writes are disabled by default outside the explicitly enabled owned test runtime.
Local parent integration is BLOCKED, not complete: the parent advanced independently during implementation, and its current worktree contains uncommitted C5 changes. No merge, reset, overwrite or stash was attempted there.

## Implemented
- POST /api/clocker/[location]/punch: state, execute and reconcile, exact JSON/body limits, Origin/custom-header checks, server-derived device and PIN authority, safe errors and private/no-store responses.
- Session-bound, non-authorizing screen-context HMAC prevents a stale tab from acting under a different person's newer cookie. Separate opaque recovery subject permits the same employee to reverify and check a pending action without storing names, PINs or credentials.
- Actual clock state controls: Clock In, Start Break, End Break, Clock Out. Clock Out requires confirmation and explicitly explains that it also closes an open break.
- Minimal per-tab recovery record is written and read back before HTTP submission. Double clicks cannot create a second command. A lost response cannot cause a new request ID or optimistic success.
- Explicit receipt reconciliation, exact same-command retry, recovery across reload/re-PIN, and other-employee isolation. An absent receipt alone is not treated as proof that a delayed request cannot still arrive.
- When a fresh state is incompatible with an old command and a subsequent receipt lookup is absent, retire that impossible old intent and require the user to review the new state; never silently retry a different action.
- Saved-receipt validation checks command/action/revision/entry version and transition timestamps. Malformed replies remain uncertain, preserving recovery data.
- Brief confirmed receipt with actual database time in the workspace timezone, then identity reset. Existing Done/Escape/idle/hidden/restored-page clearing is preserved.
- C2 privacy clear uses Fetch keepalive to improve reload/pagehide delivery. This does not guarantee delivery on process termination; server expiry and next-page mandatory clearing remain safeguards.
- New controls preserve NEVORA's neutral/blue visual direction, large targets, visible focus, responsive wrapping and reduced-motion behavior. Explicit tabindex=0 on new controls preserves DOM order in WebKit without changing macOS preferences.

## Verification actually run
| Check | Result |
| --- | --- |
| Final full unit suite | 141 files / 1,463 passed |
| New client/recovery units (included above) | 11 passed |
| Combined Clocker PostgreSQL/integration/crypto | 9 files / 179 passed |
| New protected transport cases (included above) | 30 passed |
| Existing foundation PostgreSQL | 2 files / 75 passed |
| New Chromium + WebKit punch browser journeys | 60 checks, 0 errors, 14 screenshots |
| Existing C1 device browser regression | 62 checks, 0 errors, 16 screenshots |
| Existing C2 PIN browser regression | 46 checks, 0 errors, 12 screenshots |
| TypeScript | PASS, including after removal of build-generated config drift |
| ESLint | PASS |
| Local production Next build, no DATABASE_URL | PASS |

The final unit/type/lint/build and new browser run used unchanged source; all 456 files in the final source manifest still matched afterward. The combined database and prior-browser regressions ran before the final new-button tabindex adjustment; that adjustment does not change the database or the flag-disabled C1/C2 flows. The final new browser run exercised the adjusted controls in both engines.
The foundation suite retains its existing 0001–0010 fixtures; each new punch fixture applies the Phase C drafts. This is not a claim that all historical PostgreSQL suites have been rerun on all draft schemas.

## Guardrail evidence
- Transport scaffold: 28 RED failures, followed by 58 focused transport/backend passes; two additional wrong-route/forged-context cases later passed in the combined run.
- Client helper scaffold: 8 RED failures and 1 already-passing defensive case, then 9 GREEN. Two later receipt/status guardrail failures were reproduced and fixed; final 11 GREEN.
- Browser baseline: verified PIN had no Clock In control before integration; RED was a timeout for that missing control.
- Actual journeys: all four transitions; double-click one-request/one-write; cancellation without write; lost committed response and reload; other employee cannot inspect a pending action; same-ID retry after no delivery; stale second tablet; Clock Out during break; expired verification; blocked storage; changed shared identity cookie; outage; long names; exact keyboard focus; measured primary contrast.
- WebKit reload RED exposed a failed pagehide PIN-clear fetch. Request/stack diagnostics identified the real boundary; keepalive fixed it and fresh browser runs passed without filtering the runtime error.
- WebKit keyboard RED and a separate blank-document experiment proved the Mac preference skipped native buttons but honored explicit tabindex=0. Scoped markup correction passed the unchanged exact focus/contrast assertions; no global OS settings changed.
- One browser fixture cleanup was corrected: the second test tablet must complete Done before its context is closed when asserting zero live identity rows. No server-security assertion was removed.

## Environment and limitations
Owned loopback PostgreSQL, fictional employees, real Next development runtime and real cookies/actions/API were used. The harness changes only its scratch DB transport. No Preview, Neon, customer or production database was used; no notifications or external requests were sent by the browser harness.
Browser sizes: 320, 375, 390, 430, 768, 1024, 1440 widths, including tablet 1024x768 and portrait 768x1024 flows. Local WebKit is not physical iPad/Safari certification. Automated keyboard/contrast checks do not constitute a full screen-reader audit.
NEVORA_CLOCKER_PUNCH_ENABLED defaults false. Enabling a hosted instance requires approved schema/configuration and release gates. This checkpoint does not activate it.
Recovery storage is per-tab sessionStorage, not an offline punch queue. A browser close/storage purge can discard its pending reference; do not erase it to bypass an unresolved result. Credential rotation or lost storage can require reviewed operational reconciliation. Four-digit PIN limitations remain as documented in C2.
Generic break timestamps are recorded without invented payroll rules, paid/unpaid policy or automatic deductions. C5 classification and snapshots, C6 schedule context, C7/C8 dashboards/My Time, full cross-phase verification, independent Codex review and accepted Phase B reconciliation remain separate work.

## Parent-branch reconciliation gate
At the read-only closeout check, phase-c/real-time-clock-live-operations was at d589ac7f34be0c4397b053d9c68a91ff448e7819, with uncommitted break-type and punch changes. Its common ancestor with this branch is e00e3aa35b0adab555ec473abe7190f0a1c48d4a, not a fast-forward of the new child work.
Its committed changes include another punch-command/transport/service contract plus punch-types.ts and phase-c-punch-http-qa.mjs. Its uncommitted C5 work touches the same punch functions and adds clocker-breaks.sql. A blind merge would mix competing contracts and risk losing that work.
Do not merge or cherry-pick this entire branch into that dirty checkout. First checkpoint the other work through its owner, compare both contracts and guards, select one canonical engine, then port tested UI/recovery/security improvements with explicit adapters and combined regression. Preserve both lineages until that review is complete.
No work on the parent branch is claimed as implemented or validated by this checkpoint.

## Evidence
Logs and source manifest: .superpowers/sdd/2026-10-05-nevora-phase-c-punch-integration/
New browser report/screenshots: /Users/josek0514/.codex/visualizations/2026/10/05/nevora-punch-ui-verified
Prior-flow reports: /Users/josek0514/.codex/visualizations/2026/10/05/nevora-punch-c1-regression and nevora-punch-c2-regression
Review: implementation self-review and targeted guardrails; independent review remains pending.

## Recommendation
GO for a saved isolated integration checkpoint.
NO-GO for an automatic parent merge, hosted activation, live/customer timekeeping or Phase C release.
Next: reconcile the independently advanced parent before integrating more overlapping Phase C work.

## Primary technical references
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive
- https://github.com/microsoft/playwright/issues/41808
