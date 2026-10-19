# Rolling integration results — October 19, 2026

All four Claude correction branches and their latest ROUND notes are integrated and pushed to `codex/verify-preview-33`. Current head is **13446e25e509c32c53608d66050d8a2b56a8943e**. [PR #13](https://github.com/JoseK0514/NEVORA/pull/13) remains **OPEN / DRAFT**. No main merge or deployment was performed.

## Integrated inputs

| Chat | Included owner tip | Integration commit |
| --- | --- | --- |
| Wave A | ba313d1d20376c05d7ace16f99b7356a30c44e97 | 411a42cedaf77cbff3aab9bba6ad3afd652c9b94 |
| Wave B | 469bc5a05d4ecc0c153a6304aca9df63e262216b | 9d6530bcf3e7ec8cead4a863031bedb1f12276cc for corrections; 13446e25 for final gate notes |
| Wave C | 1c73beac6fda10659e4d16135daea02f16dd5a94 | 5b938eafd9ae199b0fb3b9340f3edcb9571ebc13 |
| Desktop | 156a5679e8f948933fb8a697b26398603f3be86f | 15a0fcd70d49060bb21738de67f4d8feb9b96d58 |

Every merge was clean. No conflict resolution, source-branch push, extra UI repair, dependency change or schema change was needed. The integration work used separate worktrees; existing local Claude work was preserved.

## Local gates actually run

Each of the four code-merge snapshots passed locked installation, Next type generation, whole-project TypeScript, whole-project lint, the full one-worker Vitest suite, production build and the production development-marker scan. Each full suite reports **7,363 passed / 801 skipped**, 447 passing and 27 skipped files. Existing pending/todo tests remain unexecuted and are not counted as passes. These are four executions of the evolving candidate, not four sets of unique tests. Raw receipts and logs are in [gates](gates/).

Wave A's first full-suite launcher was interrupted with exit 143. Its successful direct retry, production build and marker commands are separate from the preserved original receipt; [attempts](ATTEMPTS.md) explains the composite evidence. No failure was deleted, weakened, or relabelled green.

Final head `13446e25` adds **only two lines in Wave B's ROUND.md** to tested `15a0fcd7`. [Custody receipt](round-notes-custody.json) proves every other one of **2,845 tracked entries**, including all code, tests, build/configuration and lockfile bytes/modes, is identical. Whole-project typecheck and whitespace checks were also rerun on 13446e25. Reused code-gate evidence is explicitly attributed to 15a0fcd7; it is not represented as an exact-head CI result.

## Bounded browser verification

| Source | Executed scope | Result |
| --- | --- | --- |
| 411a42ce | Manager New employee: 320/390/844x390/1440, text 100/200%, Chromium/WebKit, axe | 16/16 checker cells pass |
| 411a42ce | Manager Email and Employee More details: exact accessible names, Optional excluded, keyboard focus | 4/4 browser observations pass |
| 9d6530bc | Scheduling Rules, Owner/Manager, all 8 required widths, all 4 text sizes, Chromium/WebKit | 128/128 checker cells pass |
| 9d6530bc | Scheduling Rules axe supplement: 390/1440, Owner/Manager, both browsers | 8/8 cells pass |
| 9d6530bc | Rules Enter submission, Owner, 390/1440, both browsers; POST held then aborted locally | 4/4 cases pass: focus stays in read-only field, second Enter sends no second request, field becomes editable and focused after failure |
| 13446e25 | Owner Company profile and Inbox: 320/390/1440, text 100/200%, both browsers, axe | 24/24 cells pass |
| 13446e25 | Employee/Lead Home and Schedule: 1440, text 100/200%, both browsers, axe | 16/16 cells pass |
| 13446e25 | Manager Home and Inbox: 1440, text 100/200%, both browsers, axe | 8/8 cells pass |
| 13446e25 | Protected Company profile timezone, Owner, both browsers | “Puerto Rico time” visible; raw IANA text not visible |

These scopes are bounded integration checks, **not full exit rounds and not a five-area zero verdict**. Measurements are separate per source; parent-snapshot results are not silently credited to the final snapshot. [Raw checker JSON, focus observations and logs](browser/) retain the exact scope. Screenshots were inspected locally for the changed labels and pending-field behavior.

The initial two Rules Enter diagnostics targeted the containing list item rather than its input, so no action was sent; they remain setup gaps. The corrected run targets the actual named input. The first final-preview startup failed because a borrowed dependency symlink left Turbopack's filesystem root; a real locked install corrected that environment issue. The failed startup and subsequent successful run remain separate; no application change or weakened assertion was used.

All previews used fresh owned loopback PostgreSQL, fictional data, disabled external delivery, private browser states and browser-held/aborted submissions. No production environment file or credentials were copied. Successful preview teardown receipts are recorded separately from the failed startup. No access.json, password, browser storage or test capability was published.

## Open exit work and owner handoff

The existing cloud inspection work continues; no final-source full exit is certified zero. Preserve the prepared scopes when rebinding them to this integrated head:

- Wave A: 1,792 canonical automated cells, 1,244 judgment samples and all 51 prior IDs, plus the declared form/resize/receipt/sent/role/state groups.
- Wave B: 3,008 automated cells and all 137 prior IDs, plus its declared states and judgments.
- Wave C: 960 automated cells, 1,253 serial checkpoints and all 104 prior IDs.
- Desktop: 11,736 automated cells and all 111 prior IDs, plus the declared desktop/browser/state/manual checks.
- Phase 3 stays with Claude: preserve its 5,280 automated cells and 135-ID crosswalk; do not turn source-only proposals into browser closure.

The existing **IS-P4-11** Inbox return-context path remains unverified here: the generic final fixture had no pending TIME_OFF row for either actor. Four attempted actor/browser paths are recorded as fixture gaps. Static source review also retains the known outgoing-link remainder: Inbox's withFilter still does not append the selected item; Wave A's receiving side now supports it. The proper actor-bound/multirow exit fixture must verify both directions. [Claude handoff](PHASE3_FOR_CLAUDE.md) gives the exact source references and historical ID; no new measured defect or severity was invented.

That handoff also preserves the original PR CI Home/attendance loading failures for coordinator triage. The latest exact-head CI run is [39339520609](https://github.com/JoseK0514/NEVORA/actions/runs/39339520609), **queued/pending at this report**, behind an earlier candidate run. No exact-head CI success or hosted verification is claimed.

## Release boundary

Integration owner: this task. Source fixes remain with the named Claude owners; Phase 3/shared coordinator changes go to Claude. Existing full inspection owners retain their review scope and findings. No independent acceptance was self-issued. Next gate: complete and reconcile exact-source exits and current CI, with open findings routed to the responsible owner. The PR stays draft/open; production approval, main merge and deployment remain separate.
