# Batch06 — Profile surfaces and signed-out identity

This bounded batch addresses Employee inspection items5C.4 and the measured Profile/Back type drift in5C.6, then repairs an Access continuity defect exposed by real navigation. Broader Employee and Release1 acceptance remains open.

## Profile and Passkeys

Baseline1680d735 added computed-style and first-letter geometry evidence to the original native Passkeys journey. It showed Profile work values at15px and contextual Back at17px, a non-hover inset shadow on Add a passkey, and the first letter of Passkeys touching a rounded overflow clipping boundary. Parent-container font sizes were not treated as evidence of visible-label sizes; direct text leaves were inspected. Existing16px introductory/row text needed no change.

RED6e660197 retained the original ceremony, current-identity, permission, lost-reply and session assertions and collected147 failing presentation snapshots across native Chromium/WebKit/Firefox. GREEN416a4a4f changes only four small rules across three scoped stylesheets: work values and Back use the established body tokens; the transparent outer Passkeys group stops clipping its heading; the Add action loses its inherited inset shadow. The inner content surface, native focus outline and hover feedback remain.

The original native journey passed36 incumbent checks with150 viewport captures,90 contrast measurements (minimum5.42085:1) and0 presentation failures. Nine deliberately induced transport/401 diagnostics remain recorded as expected; no unexpected errors. Controlled authenticators exercise actual cryptographic server checks; native OS credential dialogs and physical devices remain unexecuted.

At9fa3abf7 the original Profile7 tests, Calendar1 test and enlarged-text landscape closure1 test passed serially. Closure records936 samples and3 selection controls with0 failures. Profile records42 checks/111 captures/54 contrasts; Calendar39 checks/108 captures/54 contrasts. Full default10,229 passed/0 failed/801 pending, nonincremental TypeScript, full ESLint, startup and source-bound build all exit0 at9fa. These are intermediate-source receipts, not final same-SHA release acceptance.

## Real sign-out regression

Hosted run40949328383 at47839e1d completed18 flow checks but failed the unchanged error gate on seven WebKit native API fetch diagnostics during document replacement. Landscape120 cases/24 rotations and guide396 measurements passed. That failed run is preserved.

The Access fixture previously replaced the document to open Profile. Commit9fa3abf7 follows the actual More tab and own Profile link instead. This preserves the retained root provider and exposed a genuine failure: after sign-out, the login ID field retained MA-chromium. The blank-ID assertion stayed intact; no synthetic clearing, new retry, cookie injection, timeout increase or diagnostic suppression was added.

Cause: AccessJourneyProvider cleared its continuity state in a layout effect, after the newly mounted uncontrolled sign-in field had already taken the old default value. Commit4bb48f35 makes the bounded protected-to-public pathname reset before children render. It resets only draft ID and activation-intro continuity, without remounting the surrounding providers. Public locale/assistance continuity and rotation remain covered by the original tests. Pattern reference: https://react.dev/reference/react/useState#storing-information-from-previous-renders.

Full local Access at4bb48f35 passed3 tests,18 actual flow checks,66 authenticated guide contrasts,396 component-guide contrasts,120 landscape cases and24 field-custody rotations across all three engines. Both real sign-out/account-switch paths leave the ID blank. Raw errors, independent window exceptions and framework diagnostics are all empty. Owned application, fictional SMTP and PostgreSQL closed normally.

## Gate

At4bb48f35 the default suite passed10,229/0 failures/801 pending; nonincremental TypeScript, full ESLint and source-bound build exit0. The first startup attempt correctly failed before creating a database because the coordinator omitted NEVORA_TEST_PG_BIN. The unchanged check, with the approved explicit runtime on the same source, passed1/1 and fully tore down. Both attempts are retained. An actual hosted replay remains required. No rollout flag or production service was enabled. Original-author review closure, Alerts risk decision, logo/business decisions and the remaining plan tasks stay open.
