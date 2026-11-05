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

## Review fix (November 2 cloud review of PR #38)

The spaced capital employer line uppercased the name after the glyph check, so a name the check accepts could fail to render. For example, "µ Services" becomes Greek "Μ", which WinAnsi can't encode. The line now uppercases one character at a time and keeps any character whose capital the font can't draw. It shows only text the check already accepted and never replaces source text. A regression renders every printable character the check accepts. Normal statements are byte-identical to before.

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

## Company summary v2 (2026-11-05)

Jose approved the company summary mock (https://claude.ai/artifact/X8UmYq1BX8X9AAf5Wt1xi5), and it's now built.

- `src/lib/payroll/native/company-summary-document.ts` renders it. `generatePdfs` in `src/lib/payroll/documents.ts` uses it for native runs that recorded pay statement template v2 and records `NEVORA_NATIVE_COMPANY_SUMMARY_V2` in the summary's stored metadata.
- Native runs that recorded v1, and every imported run, still get the plain summary. On the fixture run, the bytes match `f5fa463b` exactly: SHA-256 `66e6c4d9…` for both a native v1 run and an imported run.
- No payroll data, calculation, migration or manifest change. The manifest already binds whatever summary bytes and metadata the worker writes.
- The v2 pay statement helpers it shares (`WORDS_V2` dates, `V2` colours, `dollars`, `wrap`, `advance`, `approvalStamp`) are now exported from `paystub-document.ts`. The pay statement's bytes are unchanged. The PDF text reader for tests moved to `src/lib/payroll/native/pdf-text.test-support.ts`.

Checks run:
- New `company-summary-document.test.ts` has 7 tests, all passing:
  - which runs get v2;
  - unchanged plain bytes for v1 and imported runs;
  - English content and order with the 44pt hero;
  - Spanish with a corrected replacement and zero contributions;
  - 40 employees with a 160-character name, a 124-character ID, a $9,999,999,999.99 amount and a company name with "µ", across pages;
  - progress and a failed lease callback;
  - glyph rejection by path.

  Every rendering is checked for text inside the margins, at 7pt or larger, with no overlap.
- Typecheck and lint pass. All payroll unit suites pass: 40 files, 845 tests.
- Native payroll integration on owned local PostgreSQL 16 passes 44 of 44.
- I rendered English, Spanish, replacement, 34-employee (3 pages) and stress samples to PNG and looked at each one.

Not done here: hosted CI, printing on paper, readers other than poppler.

## Open

- **Legal or payroll copy review.** The plain-language explanations and the disclaimers are new wording on pay documents, including the summary's "This summary documents approved payroll. It doesn't confirm payment." and "They're paid on top of wages and don't come out of anyone's pay." On the statement: "Taken from your pay and sent to the government for you", "Amounts you authorized to be taken from your pay", "Your employer pays these on top of your wages. They don't come out of your pay.", "This statement documents approved payroll. It doesn't confirm payment." The Spanish uses "patrono".
- **App font.** Embedding NEVORA's app font instead of Helvetica would need a change to the pinned-font rule, so it's a separate decision.
- Deployment remains subject to Jose's authorization. No migration is needed.
