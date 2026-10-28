# Employee mobile — own published Pay and protected PDFs

Implemented and verified for **bounded local continuation with conditions**. No payroll run, amount, provider,
production data or real notification was used. Branch `claude/employee-mobile-phase2-20261027`.

Final Pay revision: `944f859a63d16180d9d48bd2513acd670cb31c77` (browser [run 15](evidence/browser-run-15.log)). Assembled-revision default suite at `e65ca90d`: 9,878 passed, 0 failed.
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
| Three-engine browser journey | Passed at `944f859a` (run 15): Chromium 13, WebKit 12, Firefox 12 checks; 84 captures; 126 contrast samples, minimum 5.03:1; 0 page or console errors. Includes a Download whose access ended navigating back instead of saving a file |

Browser runs 1–9 failed and are preserved in [evidence](evidence/). Each failure found something real:
- fixture shapes: one company run per period; immutable documents;
- an expired session shown as a generic error (`AUTHENTICATION_REQUIRED` vs 401);
- URL cleanup lost to React Strict Mode;
- a WebKit `Load failed` from a router round trip;
- WebKit not focusing links on pointer click (the test now uses native Tab/Option-Tab and Enter).

## Independent review status

- UI/UX: **GO with conditions** at `848e9cc5`; closure at `e65ca90d` closed PAY-UI-1..8 and 12. PAY-UI-13 (unpadded
  loading card) fixed at `944f859a` and recaptured; recheck is the reviewer's. PAY-UI-14 (the shared incumbent
  module-gate page after access ends) is outside this port. PAY-UI-10 needs physical-device proof before release.
- Code/security: **GO with conditions** at `848e9cc5`; closure at `240eb14b` closed PAY-CR-1..4, OWN-CR-2/3,
  TEST-CR-1/3, COM-CR-1/2 (OWN-CR-1 closed as disclosed residual for Jose). New PAY-CR-9 (a `download` attribute
  could save a failed redirect as a file) fixed at `e65ca90d` with a browser case. PAY-CR-5..8 and RACE-CR-1/2
  are accepted as minor.

## Not covered

Physical iOS/Android Home Screen installs (whether View carries the session into the system browser; how Download
lands in Files), native PDF viewers, screen readers, hosted transport, and release.
