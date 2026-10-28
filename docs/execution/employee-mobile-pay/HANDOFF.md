# Employee mobile — own published Pay and protected PDFs

Implemented and verified for **bounded local continuation with conditions**. No payroll run, amount, provider,
production data or real notification was used. Branch `claude/employee-mobile-phase2-20261027`.

Final Pay revision: see [Phase 2 status](../employee-mobile-phase2/STATUS.md) for the exact head and its runs.
[Gallery](gallery/) · [Code/security review](reviews/code-security-review.md) · [UI/UX review](reviews/ui-ux-review.md)

## What employees get (Employee/Lead phones; desktop and Manager/Owner keep Quiet)

- **Next scheduled payday**, only when the workspace pay schedule supplies it (the same canonical read Home uses),
  worded as a schedule, never a payment, amount, deposit or status. Shown only where statements can follow.
- **Latest statement** first: payday, period, View (opens the PDF on its own, never inline in a Home Screen app)
  and Download (sets `download`). Statements carry no amounts and the page shows none.
- **Linked corrections.** The statements read now names, for each own published statement, the own published
  statement it corrects and the one that corrects it (`corrects`, `correctedBy`; additive, never another person's
  or an unpublished document). A correction is listed first; the replaced original says so, leads with
  *Use the corrected statement*, and keeps its own files outlined and named "replaced statement".
- **Earlier statements** as disclosures; *Your hours* links; the incumbent privacy line.
- **States:** loading, empty, paused/offline (statements released), signed out (Sign in returns to My pay), Pay
  statements turned off mid-session, access revoked (403, no futile retry), and retryable error.
- **Exact destinations.** A statement notification opens `/app/my-pay?statement=<document>`; the allowlist admits
  one lowercase UUID. The page focuses that statement if it is still own and published, otherwise says it isn't
  available without naming it. A browser navigation to a PDF that fails returns an Employee/Lead to My pay with a
  calm reason (`unavailable`, `failed` for an integrity mismatch only, `temporary` otherwise); an ended session goes
  to sign-in returning to My pay. Scripted reads and signed-in management keep the JSON contract.

Every PDF request still rechecks session, module, own membership, publication and the stored SHA-256; responses
are `no-store, private`. The service worker never handles payroll responses.

## Verification (actual results)

| Check | Result |
|---|---|
| Payroll SQL (`configurable-payroll`) | 37/37, including correction linkage on real runs; the unpublished step now runs between document creation and publication |
| Company-access notification authority | 39/39 with the exact statement destination |
| Unit (payroll, routes, destinations, Pay view) | Pass; see Phase 2 status for the combined count at the final head |
| Three-engine browser journey | 31 checks at `848e9cc5` (run 10); later runs at the final head are recorded in Phase 2 status |

Browser runs 1–9 failed and are preserved in [evidence](evidence/). Each failure found something real:
- fixture shapes: one company run per period; immutable documents;
- an expired session shown as a generic error (`AUTHENTICATION_REQUIRED` vs 401);
- URL cleanup lost to React Strict Mode;
- a WebKit `Load failed` from a router round trip;
- WebKit not focusing links on pointer click (the test now uses native Tab/Option-Tab and Enter).

## Independent review status

- UI/UX at `848e9cc5`: **GO with conditions**. Material PAY-UI-1..4 and minors 5–10, 12 were fixed at `ec063e5f`;
  closure is the reviewer's. PAY-UI-10 (Home Screen session and download behavior) needs physical devices.
- Code/security at `848e9cc5`: **GO with conditions**. PAY-CR-1..4 were fixed at `28ee6a75`; closure is the
  reviewer's. PAY-CR-5 (a second identical arrival while mounted is not re-announced) is accepted as minor: PDF
  failures arrive by full navigation.

## Not covered

Physical iOS/Android Home Screen installs (whether View carries the session into the system browser; how Download
lands in Files), native PDF viewers, screen readers, hosted transport, and release.
