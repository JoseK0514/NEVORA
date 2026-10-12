# Payroll engineering review disposition

Integration owner: Check findings resolution status, chat
01a12fbf-5174-7e22-8d66-3aa154492b71. Scope is the local single-company candidate;
independent finding closure, hosted assurance and release authorization remain
separate.

## Behavioral findings

- P1 M1, enum coercion: repaired in `ed7d2c2`. Validators require primitive
  strings; array/object/number/boolean regressions pass. The P2 reviewer verified
  the correction against that frozen commit.
- P1 M2, historical document metadata: repaired in `ed7d2c2`. SQL filters by the
  selected run IDs. A real 301-run fixture observes no out-of-page document rows
  crossing the executor boundary. The P2 reviewer verified the correction.
- P2 M1, masked schedule transition: repaired in `76610d7`. The three-revision
  regression first reproduced the incorrect MISSING result. All effective
  schedule changes inside the period are now considered. Six focused tests and
  36 real disposable PostgreSQL payroll scenarios passed, including an ambiguous
  period producing zero automatic jobs. The frozen recheck approved this repair
  with no blockers; `.omo/evidence/payroll-transition-recheck.md` retains the verdict.
- UI H1, unconfirmed action recovery: the frozen `68c1887` UI can lock mutations
  after a pre-commit interruption and reload. A global reference can also strand a
  different signed-in actor. The UI owner is implementing same-reference re-entry
  and actor/session isolation, with actual browser regressions. Acceptance remains
  pending.
- UI M1, correction approval: informational `CORRECTION_REASON` entries currently
  disable approval in the frozen UI. The UI owner is separating informational
  notes from blocking failures and testing correction approval/publication.
  Acceptance remains pending.

Review artifacts are retained under `.omo/evidence/payroll-p1-code-review.md`
and `.omo/evidence/payroll-p2-code-review.md`, plus the frozen UI report at
`.omo/evidence/payroll-ui-code-review.md`. Their original REQUEST_CHANGES verdicts
are preserved; this document does not rewrite those reports.

## Bounded maintenance exception: P1 M3

The integration owner records a local maintenance exception for the programming
skills' 250-line module criterion in `service.ts` and `model.ts`. The existing
public service facade, authoritative transaction/source guards and input
validation boundary are retained for this bounded implementation. P2 places new
calendar, historical-read, backlog and notice responsibilities in focused modules.
There is no demonstrated runtime defect caused by the retained size alone.

The reviewer recommended this disposition instead of a count-only rewrite.
Reorganizing the remaining approval/settings command flow during acceptance would
expand the change and require fresh authority/custody regression work without
changing the requested behavior. Future changes that materially extend those
responsibilities should extract coherent domain operations while preserving the
facade and guards. This exception permits no suppressed diagnostics, weakened
tests, authorization shortcut or production-risk waiver.

## Integrated acceptance

UI integration, final browser/build/unit checks and reviewer disposition on the
combined candidate remain pending. Runtime notification delivery stays disabled;
fake dispatch evidence establishes retry/privacy behavior only. Native provider
formats, enrolled bank acceptance and internal statutory calculations require
external authoritative evidence.
