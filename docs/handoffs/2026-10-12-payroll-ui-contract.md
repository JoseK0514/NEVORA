# Configurable payroll UI ownership and contract handoff

Date: October 12, 2026. Status: P0 IN PROGRESS; dependent application implementation NOT STARTED.

## Authorization, source and ownership

Jose's implementation authorization was verified in **Review COO-wide gaps and follow-ups**, chat `01a1301a-69c7-72a3-9880-48aa97e80e12`. The directive is `/Users/josek0514/Documents/Codex/2026-10-12/coo-x20/outputs/NEVORA_PAYROLL_IMPLEMENTATION_DIRECTIVE.md`.

This chat owns payroll settings/workflow UI and its UI tests. The integration owner is **Check findings resolution status**, chat `01a12fbf-5174-7e22-8d66-3aa154492b71`, and owns backend/schema/run/document/worker contracts and the combined candidate. Other engineers are working concurrently; their changes must be preserved.

Current UI source: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-26/work/payroll`, branch `codex/nevora-payroll-exports-20261012`, approved implementation `9851ccfd6c43fe6f58e5f92c799c57912475f5c9`, development base `b58496b84b21690f7be22474f7570da2d81af6c3`. Tracked source is clean before this handoff; untracked `.impeccable/` hook metadata is preserved.

Inspected integration input: `/Users/josek0514/Documents/Codex/2026-10-12/coo/work/single-company-six-findings`, through `a00fa63`. It contains policy revisions, complete period population, manifests and handoff receipts, but no provider-amount run/statement contract. Its `/api/company-policies` model is attendance/labor policy; it must not be repurposed as a wage calculator. `/api/period-close` is time-population/export custody with Manager/Owner access; it must not expose private wages, taxes or bank details.

The three inputs remain separate. A combined base and compatible new financial-data contracts have not yet been published to this UI owner. New API-driven UI must begin on a separate worktree after the integration owner publishes them. This handoff is a proposal for that contract, not implemented endpoints or capability claims.

## Preserved UI

Keep `/app/payroll-export`, manager time-review authority, full mapping configuration, revision/source verification, same-command retries and CSV/canonical downloads. Reconcile the approved visual presentation with the integration input's `PayrollPeriodClose` population/manifests/handoff workflow. Do not overwrite the newer period-close recovery logic while bringing in `9851ccf`.

Retain approved DESIGN.MD orange/charcoal controls, locally bundled Inter/JetBrains Mono, Phosphor icons, dark navigation, compact operational spacing, native disclosures and reduced-motion support. Mobile has equal priority: one reading column, 16px inputs, 44px control targets, employee amount cards, visible keyboard focus and no action bar covering the task.

## Screen/operation contract required from integration

Paths below are proposed entry points, pending coordination of route and navigation ownership.

| UI surface | Required authoritative data/operations | Role boundary |
|---|---|---|
| Payroll settings, proposed `/app/settings/payroll` | Current preferences/revision; supported capabilities; allowed schedule/payday values; calculation authority; document identity/language; automation choices; effective-date impact preview; save receipt and immutable history | Owner or explicit payroll-settings authority; Manager role alone insufficient |
| Authorized employee exceptions | Resolved company value, employee override, provenance/revision/effective dates, allowed override operations, future-draft impact and reason | Explicit private-payroll authority; absent override must remain distinct from explicit disabled/unconfigured |
| Payroll work queue, proposed `/app/payroll` | Period/payday/run ID/revision; readiness/waiting/exception states; permitted actions; source authority and revisions; money strings/currency only when authorized | Redacted time-only projection for ordinary Managers, or a separate restricted route |
| Amount import and validation | Versioned neutral/provider schema, file limits, mapping requirements, roster/population revision, parsed line errors, duplicate/unmatched/incomplete populations, exact reconciled authoritative totals, import revision and receipt | Explicit amount-import authority; corrected amounts require corrected import/revision |
| Run review and approval | Exact review token/revision; settings/time/roster/import versions; exceptions and dispositions; separate gross/deductions/employer contributions/net; authorized approval action bound to those inputs | Owner/explicit approval authority; automation cannot impersonate human approval |
| Approved outputs | Independent PDF generation, private statement publication, summary generation, notification and payment-export readiness/failure states; authorized artifact identifiers/download endpoints | Per-artifact server authorization; document publication is not payment confirmation |
| Employee statements, proposed `/app/my-pay` | Current employee's available periods, language, document revision, private authenticated PDF download, availability-notification preference if supported | Server derives employee identity; never accepts an employee-selector as authority |
| Payment preparation details | Masked bank-profile metadata, supported/unconfigured/unsupported channel status, approved run/export revision, exact artifact and count/total reconciliation | Explicit bank-export authority; preparation/submission/authorization/processing remain distinct |

Required shared contract details before implementation:

1. Published combined commit/worktree and owned module/file boundaries, including who owns AppShell/navigation/settings entries.
2. Exported read-model/command parsers/types, endpoint/action methods, actor/CSRF proof, feature gate and capability projection. Server permissions must also reject direct bypass; hiding a button is not authorization.
3. Money encoding and currency/rounding representation. UI formats server-provided exact values; it does not recompute imported net pay or implement tax/benefit rules.
4. Supported rule definitions: deduction versus employer contribution, fixed/percentage, basis, applicability, caps and dates. Unknown configuration cannot display as zero/exempt. Internal calculation stays unavailable until verified capabilities say otherwise.
5. Settings impact-preview and save tokens; inheritance/employee override resolution; roster dispositions including inactive/zero-time members; revision conflict responses.
6. Import schema/sample, acceptance/reconciliation response, field/line errors and bounded upload protocol. Validation and acceptance are distinct steps.
7. Durable operation recovery and terminal conflict/error semantics. Prefer an opaque actor-scoped operation reference for recovery; do not persist private amount files or wage/bank records in browser storage. Never invent a new operation after an unknown outcome.
8. Run states and action prerequisites, exact approval receipt, correction/replacement semantics, artifacts' private MIME/download access, publication/notification separation, bank readiness evidence.
9. Authority expiry/read lifetime and sensitive-data clearing rules; headers/cache policy; request fencing during period/actor changes; fixture support for real owned browser verification.

## Approved interaction direction

Settings begin with a concise company-default summary. Normal workflow fields are visible; percentage/fixed rule details and banking controls use progressive disclosure. Show each value's source and effective date beside it. A save reviews future impact and preserves explicit employee overrides; historical approved runs do not change.

The work queue makes the next action explicit: finish time review, import approved amounts, resolve exceptions, review exact run, then download available outputs. An automatic draft that lacks authoritative amounts says **Waiting for payroll amounts**. Unsupported internal calculation says **Not available**, rather than accepting a percentage as a tax engine.

Import separates upload/mapping, validation results and acceptance. Employee deductions and employer contributions are shown separately. Row errors link to the affected row; unreconciled imports cannot reach approval. Provider net values remain authoritative and are not silently recomputed in the browser.

Approval reviews one exact revision, with totals and material changes before the action. The label is **Approve payroll run** only when the backend confirms permission and prerequisites. Approval, PDF availability, publication, notification, payment-file preparation and bank processing have separate states/actions and receipts.

Employee statements use a compact period list with one authenticated **Download pay statement** action per available statement. No statement body or bank/withholding fields leak into time-review or ordinary Manager views.

## Reference evidence

Official product references were opened and checked again October 12:

- [Gusto benefit setup](https://support.gusto.com/article/100758511100000/add-and-manage-third-party-benefit-deductions): company default employee deductions and employer contributions, later individual adjustments, explicit participants and employer remittance. Adapt visible inheritance and separate responsibilities; do not copy its statutory treatment.
- [Gusto AutoPilot](https://support.gusto.com/article/999755421000000/set-up-and-manage-payroll-on-autopilot-for-admins): prerequisites and restrictions; automatic payroll cannot be combined with payroll approvals. NEVORA instead separates automatic draft preparation from authorized approval, as Jose approved.
- [QuickBooks Workforce](https://quickbooks.intuit.com/learn-support/en-us/help-article/payroll-preferences/set-quickbooks-workforce-account/L7lTybIK7_US_en_US): authenticated employee pay-statement access and availability notifications. Adapt private downloads and notification separation.
- [Square timecards](https://mobbin.com/screens/db67dd90-e64c-4989-b7d3-f6dd06a0d8bb), visually inspected: related period filters and totals precede employee rows. Use that hierarchy with NEVORA's actual supported totals.
- [Gusto documents](https://mobbin.com/screens/f97bf816-0c98-4b01-9ce3-fb1455e2c1b4), visually inspected: document name/type, status/date and contextual view action. The screen is a document list, not a payroll approval reference.

The search also returned contractor-agreement and merchant-payout screens; those were not treated as evidence of a payroll-review design. Existing 7shifts/Wise export and 21st date/table/disclosure references remain in `docs/payroll-exports-redesign.md` and the original research artifact. No paid component retrieval or new service subscription was used.

## Acceptance/dependency ledger

| Item | Owner/status | Evidence needed next |
|---|---|---|
| Approved export redesign | UI owner, LOCALLY VERIFIED at `9851ccf` | Preserve/retest after integration |
| Combined base and new contracts | Integration owner, IN PROGRESS | Actual published SHA, types/API/permission artifact and file ownership |
| Settings/inheritance/impact UI | UI owner, NOT STARTED; depends on contracts | Real save/reload, explicit overrides preserved, conflict and unauthorized cases |
| Import/review/approval UI | UI owner, NOT STARTED; depends on contracts | Exact totals, invalid imports, waiting states, stale approval, durable retries |
| Private statements/output UI | UI owner, NOT STARTED; depends on document contract | Real PDFs open/download; A cannot access B; ordinary Manager cannot fetch finance |
| Browser verification | UI owner with coordinator's fixtures, NOT STARTED for new subsystem | Desktop/mobile/keyboard/loading/error/empty/success, real downloads and source manifest |
| Independent acceptance and production | Independent reviewers/Jose, NOT STARTED | Their published verdict and separate production authorization |

New subsystem tests have not run because it is not implemented. Earlier 2,125-unit/47-browser results belong to the export redesign only. No new endpoint, calculation, private document, notification, payment or deployment is claimed.

## Coordination delivery

The first attempt to send this handoff to the integration owner's chat failed because the local host was unavailable. A second attempt explicitly naming the local host did not return; its delivery outcome is unconfirmed. A compact status request also reported unavailable local/durable hosts. No acknowledgement or published combined base/contracts was observed. The repository handoff and user-facing copy are saved for the coordinator to read directly. Do not treat the message attempts as delivered, or the interface proposal as an accepted backend contract.
