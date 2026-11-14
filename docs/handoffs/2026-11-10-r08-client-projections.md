# R08 — client data minimization (local)

Integration review found that the outer `ScopedReadFrame.observation` still received the full server read, including original employee catalogs. The initial inner-form tests did not cover that enclosing boundary. Root retained a two-failure RED reproduction, added outer-prop assertions and now projects only authority, observation time and lifetime before every corresponding management-page observation boundary. The same pure projection removes this repeated metadata overfetch on24 pages. It preserves each page's explicitly rendered data and authorization behavior. Actual authenticated schedule HTML/RSC marker checks are included in final combined browser qualification; earlier inner-projection results alone are superseded by that gate.

Baseline: `0317598ae6886bc964bbd6bb5c1bbbd3add46069`. This change is local only;
Jose's CI/push/publication hold remains. No database/schema, native or production
change, actual customer read, delivery or model call occurred.

## Contracts

- Add/edit shift sends explicit `ShiftFormEmployee` choices: ID, first/last name,
  role, active flag and position IDs. Contact fields, eligibility/location lists
  and unrelated inactive employees remain server-side. Edit retains only its
  actually assigned inactive person's minimal context, preserving existing name,
  qualification and non-selectable behavior. A new-shift query prefill cannot add
  an inactive record. Mutation fields and server authorization are unchanged.
- Desktop swap sends `ExchangeShiftDisplay`: display facts and the shift ID,
  without peer Employee IDs, schedule/location IDs, revisions or assignment IDs.
  Missing position names retain the existing human-readable position fallback.
  Source/target shift IDs, assignment episodes and fingerprints remain in the
  separate reviewed command fields. All original source/target comparisons and
  availability checks run before projection. Sent-state components use the same
  display contract; no stylesheet or action protocol changed.
- Own statements explicitly return the canonical document projection, period,
  payday and published correction links. Stored native provenance, coverage and
  future metadata are not spread into the public DTO. Payload data cannot replace
  document identity, URL, published state or final-file SHA. Download byte/hash
  verification and all existing session/publication/coverage SQL remain intact.

## Evidence

Evidence: `/Users/josek0514/.codex/r08-r10-local-20261110/r08-r09/`.

- Baseline focused composition/presentation: 52 passed.
- RED: six expected privacy assertions failed against the original real page
  props/serializer; 24 existing checks passed. No fixture/import failure.
- GREEN: 75 focused checks across nine files passed (included in default below).
- Full TypeScript check: passed.
- Full local default: 818 files passed/32 skipped; 11,948 tests passed/857 skipped.
  Dedicated SQL/browser tests remain distinct from the default skips.
- `git diff --check`: passed.

The page tests inspect the actual returned client-boundary props, not only visible
HTML: Next 16.4.2's bundled Server/Client Components documentation confirms those
props are serialized in the RSC payload. The statement unit test supplies rows at
the executor boundary; it does not certify actual database authorization. The
existing real payroll authorization/download regressions and integrated browser
proof must be included in the owning integration qualification.

CTO/CISO: explicit minimal contracts, essential command references and integrity
SHA preserved; no authority weakening. Product: no new admission or payroll
policy. Governance: local implementation/testing evidence, CONDITION pending
review/integration and applicable hosted/independent gates. No independent finding
is self-closed and the dashboard is not marked complete from this local commit.
