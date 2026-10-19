# Desktop scoped candidate verification preparation

External module: `scoped-desktop.mjs`, exporting `registerScopedCases(h)`. Prepared statically while the coordinator's full-CI window is active. Not executed, not a pass and not a full Desktop exit. The coordinator's `verify.mjs` enforces explicit browser release, frozen clean source SHA and matching preview checkpoint.

62 planned cells across Chromium and WebKit:

| Case | Fixtures | Viewports/text | Variants | Cells |
| --- | --- | --- | --- | --- |
| scoped-desktop-recorded-time-refresh | AUDIT-E, AUDIT-LEAD | 390×844/100%, 320×844/200%, 1440×900/100% | My time, Home clock | 24 |
| scoped-desktop-home-refresh | AUDIT-E, AUDIT-LEAD | same | footer and shared redacted fallback callback | 12 |
| scoped-desktop-inbox-opening | AUDIT-M | 320×844/200%, 1440×900/100% | actual natural source opening, held read and failed-read privacy/focus | 4 |
| scoped-desktop-inbox-return-uri | AUDIT-M | same | requests/all filters | 12 |
| scoped-desktop-inbox-item-allowlist | AUDIT-M | 390×844/100% | absent/mismatched/malformed/nonpending/Home-origin item | 10 |

Fixtures must use the existing fictional preview seed: authenticated Employee AUDIT-E, Lead AUDIT-LEAD and Manager AUDIT-M; both self-service fixtures must release a valid ready Home and recorded-time response. No active punch is required because the ready off-clock badge also proves release and clearing. Manager must see pending `audit-timeoff` (already seeded for AUDIT-E by preview-runtime.mjs) and its released ActionItem `TIME_OFF:audit-timeoff`. No additional rows or mutations are required.

Refresh cases use native Enter, hold the actual harmless GET `/api/employee/my-time` or `/api/employee/home`, verify retained focus plus native-enabled/aria-disabled pending behavior, and attempt additional keyboard and direct DOM activation while held. A missing later fix on combinedcd764f6 must produce completed negative assertions after the held request arrives, rather than a timeout waiting for the desired focus/aria-disabled state. One held read is answered503; the later settled render must permit a fresh retry, which alone continues the real GET. The failed read must remove released private status/freshness/entry DOM and offer the visible Try again wording (TC-P3-25). Offline pause must natively disable Refresh, clear private release and refuse programmatic activation. Home's redacted clock fallback and footer must share one guarded Home read. Existing affected pure-view tests separately verify the same-render callback closure; the browser result must not claim to prove React's render timing.

The Mytime variants add a bounded Schedule visit inside the same browser cell to measure actual `.my-week-today` against the rendered `--nv-t-headline` role (TC-P3-28); that finding is not about Mytime's unrelated Today section heading. Both Mytime and Homeclock variants measure ready footer bounds, with status/controls in separate nonoverlapping rows at large phone text (TC-P3-34). No browser cells are added by these extra rendered measurements.

The bounded ST-P4-13 case records ordinary-motion first-ready/settled selected planning-group geometry on wide source, native closed group behavior on narrow source, Chromium natural CLS and explicit unsupported WebKit CLS=null. Text200 is applied/settled before a real source filter render. It then holds the harmless action-center read, measures pending list/pane geometry, scroll, native Enter focus and actual duplicate request count. After moving focus deliberately into retiring private content it answers503 and checks privacy clearing/status focus. Missing fixes yield measured negative assertions; the source is never patched. Wider8opening+4semantic guards, controlled attribution and reduced-motion proof remain in the full Desktop exit.

IS-P4-11 cases check originating link, Review URL, band Inbox href and returned URL with the same normalized filter/item. Where combined source provides `[data-inbox-key]` and the wide detail pane, cases also verify the selected row and matching pane before/after the return; changing selection checks pane focus and Escape where another row exists. A one-row filter records that narrow focus coverage gap. On legacy source, absent newer markup is recorded as a proof limitation, not failed as an unmerged assertion or counted as a selected-row restoration pass. Negative cases only read the already-authorized pending list and exercise the existing item allow-list. They never press Approve/Decline. Full Desktop multirow/pane/privacy/scroll proof remains in its exact-SHA exit plan.

The global verifier guard blocks all business mutations and external requests; these cases do not intentionally send a write. Matched reads are held or answered, and only GET reads use `continue`. Context teardown aborts any remaining hold and the final offline state is not reconnected to start an unobserved request.

Execution remains owned by the coordinator/runtime agent after the frozen final SHA and explicit release. No preview, browser, application edit, lint, typecheck or test was run during this preparation.
