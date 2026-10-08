# NEVORA D1.3 — Manager Attendance Intelligence UI

Date: October 6, 2026
Status: implementation and management preflight verified; independent review pending.

## Identity

- Authoritative development baseline: `0516b7dcbb07a10d926cc5c53f3b650343cad9bd`
- Branch: `phase-d/d1-3-attendance-ui-20261006`
- Scope: Manager/Owner UI layer over the accepted D1.1 attendance projection and D1.2 authorized reader.
- No development, main, hosted production, or customer-data integration is included in this implementation checkpoint.

## Implemented scope

D1.3 adds an `Attendance` Manager dashboard view. It consumes the existing protected
`GET /api/manager/attendance` endpoint without employee, location, date, or other
caller-controlled scope selectors.

The surface:

- presents verified recorded-time signals using factual D1.1 terminology;
- maps authorized employee/location IDs to current Manager-readable labels without
  exposing raw identifiers;
- distinguishes ready, healthy-empty, limited-comparison, loading, unavailable,
  access-denied, and paused states;
- clears protected names/counts when data is unavailable, authorization is denied,
  the page is hidden, or the device is offline;
- polls only while active, with one request in flight and no local/session storage;
- preserves the D1.2 `validForMs` freshness boundary and subtracts transport latency;
- treats ordinary source-freshness expiry as `read_failed`, not as an invented
  sign-in failure;
- uses explicit copy stating that policy lateness, overtime, and correction workflows
  are not evaluated by this view.

The UI follows the approved NEVORA Apple-style contract and is responsive from
320px through 1440px. Status meaning is expressed in text as well as color.

## Deliberate exclusions

This slice does not add or change:

- D1.2 source SQL, reader authority, API shape, schema, migrations, or data custody;
- payroll, compensation, overtime, lateness policy, or correction workflow policy;
- publication-history database immutability;
- dependencies, lockfile, CI configuration, Vercel production, Neon production,
  `main`, or `development`.

## Verification

Final implementation-side evidence before freeze:

- focused attendance/client/shared-lifecycle regression: 54/54 PASS;
- full unit suite: 1,898/1,898 PASS across 178 files;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- production-only dependency audit: zero reported vulnerabilities;
- owned Clocker PostgreSQL: 394/394 PASS across 23 files;
- owned release PostgreSQL: 737/737 PASS:
  - foundation 275;
  - Phase B authority 46;
  - generation 176;
  - exchanges 163;
  - notifications 77;
- D1.3 Chromium/WebKit browser matrix: 34/34 checks PASS, zero errors;
- widths checked in both engines: 320, 375, 390, 430, 768, 1024, 1440;
- browser checks include real Owner/Manager protected reads, Employee denial,
  long-content geometry, touch targets, mobile-nav clearance, keyboard focus,
  empty/unavailable distinction, source-freshness expiry, access denial, and
  offline lifecycle behavior.

Owned PostgreSQL runners used disposable loopback PostgreSQL and stopped their
clusters. Browser populated-state fixtures are explicitly fixture evidence; real
Owner/Manager/Employee endpoint authorization is checked separately in the owned app.

Evidence root:
`/Users/josek0514/Documents/NEVORA-Audits/D13-attendance-ui-20261006`

## Management preflight positions

- Product: bounded D1.3 scope met; no policy semantics were invented.
- Engineering: smallest UI/client integration over accepted D1.2; no backend rewrite.
- Security: authority remains server-derived; browser selects only the UI view;
  protected data is cleared on denial/unavailability/pause.
- UI: responsive hierarchy, state clarity, long-name handling, keyboard focus,
  touch targets, and mobile clearance passed automated review.
- QA: focused, full-unit, browser, Clocker PostgreSQL, and release PostgreSQL
  implementation gates passed.
- Governance: suitable for candidate freeze and independent review; this document
  is not independent certification.

## Open release gates

FR-AUTH-001, database-level publication immutability/custody, hosted Vercel/Neon
parity, rollback/recovery evidence, existing Independent UI findings,
physical-device and screen-reader acceptance, branch enforcement, and all other
unproven production gates remain OPEN.

Production remains NO-GO.

## Next gate

Freeze the exact D1.3 candidate SHA without further source edits, certify that
exact SHA, and submit it to a reviewer who did not implement this candidate.
No independent finding is closed by this implementation record.
