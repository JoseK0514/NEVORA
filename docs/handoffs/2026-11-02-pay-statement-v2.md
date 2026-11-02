# Employee pay statement PDF, template v2 (November 2, 2026)

Jose asked for a pay statement that is "premium and elegant and easy to understand" and approved Option D. The comparison page shows today's statement, Options A to D, the approved mock and the real build: https://claude.ai/artifact/StytrrWLznmmQnHMakfmba. The design record is "Employee pay statement PDF, template v2" in `DESIGN.MD`.

## What changed

- **New template, v2** (`renderStatementV2` in `src/lib/payroll/native/paystub-document.ts`). It opens with take-home pay, then one strip ("You earned – Taxes – Other deductions = Take home") and a thin split bar. Sections have plain names, each with a one-line explanation: "What you earned", "Taxes withheld", "Other deductions", "Paid by your employer". Columns are "This period" and "This year". Amounts read "$542.77", not "USD 542.77". The NEVORA wordmark is in the footer.
- **Each run renders with the template it recorded.**
  - `preparation.ts` and the blocked-run path in `source.server.ts` now record `NEVORA_NATIVE_PAYSTUB_PDF_V2`.
  - `document-mapping.ts` accepts V1 or V2 and passes the run's own version to the renderer.
  - `renderNativeEmployeePaystub` dispatches on it, and `renderStatementV1` is the previous body, unchanged.
  - A run that recorded v1 still produces the same bytes and sha256 as before. I checked this on four fictional statements against `a54f9150`.
  - The contract types (`contracts.ts`, `documents.ts`) and the client run validator (`src/components/payroll/api.ts`) accept both values. There is no database constraint on the field.
- **Wordmark asset:** `paystub-wordmark.ts` embeds `public/images/nevora-wordmark.png`, resized to 300×40 with a 32-colour palette (5.8 KB).
- **No change to payroll data or calculations.** The presentation contract, validation, glyph check, progress and abort checkpoints, and exact arithmetic are shared with v1.

## Differences from the approved mock (deliberate)

- **Long statement, page 1:** the mock printed a long employee ID on top of the period line. The build wraps the ID onto its own line, and the content below moves down 12pt.
- **Corrected replacement:** the mock moved every reference to page 2. The build starts References on page 1 and continues them on page 2.
- English, Spanish, and page 2 of the long statement are pixel-identical to the mock at 110 dpi.

Hardening beyond the mock, invisible on normal statements:
- Every table cell wraps inside its column, and the take-home figure and strip values shrink to fit, so very large amounts never overlap.
- Taxes and deductions sit side by side only when both fit on one page with single-line rows. Otherwise they stack.
- If the footer stamp would need more than two lines, it drops the run reference, which still appears in full under References.

## Verification

- New `paystub-document-v2.test.ts` has 12 tests, all passing:
  - English and Spanish wording;
  - exact amounts and the 44pt bold hero;
  - deterministic bytes;
  - UTC approval time for an offset timestamp;
  - "1 h 40 min" hours and exact fractions;
  - the corrected-replacement chip and references;
  - zero pay;
  - a negative true-up and a 21-digit amount;
  - 75 deductions with 500-character labels, a 182-character company name and a 164-character ID, across several pages with "(continued)" headings and a footer on every page;
  - checkpoints, cancellation and callback failure;
  - glyph rejection.

  Every rendering is checked for text inside the margins, at 7pt or larger, with no overlap.
- `document-mapping.test.ts` adds a test that a v1 run keeps its v1 bytes and metadata, new runs use v2, and an unknown version is refused. Mapping and manifest pass 10 of 10.
- Typecheck and lint (`src/lib/payroll`, `src/components/payroll`) pass. Payroll unit suites: 1,057 passed, 11 failed. All 11 are in `paystub-document.test.ts` and fail identically on unmodified `a54f9150`. They come from this container's Node 22 build with small ICU, which decodes `windows-1252` as Latin-1 in the test helper, so "—" reads back as U+0097. The repo pins Node 24. The new v2 test decodes WinAnsi explicitly, so it doesn't depend on ICU.
- Native payroll integration test (`vitest.native-payroll-integration.config.mts`) on owned local PostgreSQL 16: 44 of 44 passed.

Not done here: printing on paper, PDF readers other than poppler (pdftoppm), screen-reader or tagged-PDF checks (neither template is tagged), and hosted CI.

## Open

- **Legal or payroll copy review.** The plain-language explanations and the disclaimer are new wording on a pay document: "Taken from your pay and sent to the government for you", "Amounts you authorized to be taken from your pay", "Your employer pays these on top of your wages. They don't come out of your pay.", "This statement documents approved payroll. It doesn't confirm payment." The Spanish uses "patrono".
- **App font.** Embedding NEVORA's app font instead of Helvetica would need a change to the pinned-font rule, so it's a separate decision.
- Deployment remains subject to Jose's authorization. No migration is needed.
