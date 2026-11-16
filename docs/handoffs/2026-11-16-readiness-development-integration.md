# November 16 readiness — combined development acceptance

Owner: Codex, continuing Jose's request to carry this work through development
acceptance. Claude owns the UI design; no other chat was messaged, interrupted,
or edited. Rondo functionality and SCRUM-199 remain outside scope.

Development is the operating and acceptance release, held to production
standards. No main merge, production deployment, paid activation, real messages
or customer-data testing is authorized by this work.

## Source and release custody

- Fresh remote development/base: `22a9d598eb470cd380ee739d7396f06ecf335ed5`.
- Preserved collaboration source: `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1`.
- Main held at `46d6dc76922bb273379baccd329e0af636d1dcb6`.
- Isolated detached worktree:
  `/Users/josek0514/.codex/worktrees/nevora-readiness-integration-20261116`.
- Original backend implementation:
  `c9de85ecef4f8eb2fb9f109e494bfde892022f65`.
- Original minimal form/history wiring:
  `eeed508eb475707912b998dbab6dcf0d7993cafa`; original delivery checkpoint
  `0a31f46c96221fb7aac8607c083677eca986a729`.
- Linear UI assembly:
  `dad3ce95fca8e7b43431614eb0db6f84054a43d2`. Collaboration history remains
  intact; the source inventory records the linear squash as its replacement.
  Current development's newer backend protections remain present.
- Follow-ups: `3f01ce1286185f70606cf23a37c9a47f8a88c8ca`,
  `55b2728abd0bea9cc00ddb4b4bc86ca5f24052c4`,
  `21662bc509927c11d5765e91ecb1542ac9caaf0c`,
  `78a9a63b3abd988e047c80bfe9f6c24a8abdbd40`,
  `1b6df0b561d7162f6511b9b08622f00f252007da` and `9f23c2f37c376d7974c71f1536eb73666a4fce9e`.
  Full identities remain in Git; the immutable candidate tag identifies the
  final manuals-qualified tree.

The first Actions tag, `candidate/backend-completion/20261116-readiness-combined-01`,
points to `a182687e1a75c76d32a72f0986f5f98424002f3f`.
[CI run 43870717602](https://github.com/JoseK0514/NEVORA/actions/runs/43870717602)
passed validate and all Clocker SQL shards, but failed other required gates.
It was not promoted. The next candidate is
`candidate/backend-completion/20261116-readiness-combined-02`; its required checks
must all pass on its exact SHA before a normal fast-forward to development.
Never infer acceptance or deployment merely from either tag.

## Changes and decisions

SCRUM-204 validates each newly published commitment against current canonical
hard rules under transaction guards and final authority checks. Historical
published snapshots, approved restrictions, preferences policy and atomic
revision/outbox behavior are preserved.

SCRUM-205 carries `expectedReviewVersion` from the original manager review
through the action, writer and retries. Stale material changes are refused
transactionally. Deleted and out-of-scope records share the same private
`ACCESS_DENIED` response. Both existing forms retain submitted values and offer
copy-before-explicit-reload recovery. A Company delete transport failure is an
unknown outcome: further deletion submissions, including programmatic ones,
stop until an explicit current review. This closes a real lost-success/retry
case that otherwise let a fresh missing-row render discard the draft.

SCRUM-206 separates current summary reads from explicit bounded history pages.
The history cursor, stable ordering, completeness and artifact hashes are
preserved. There is no deletion, silent history truncation or raised arbitrary
event ceiling.

SCRUM-207 uses the existing structured logger and response correlation header
for unexpected handled failures. Expected validation, authorization and conflict
refusals remain distinct. No new vendor or sensitive request/provider logging
was added.

Combined-source checks also found incoming offline holds that could retain
private rows without a deadline. They now retain the original finite lease;
an offline hold cannot extend authority. Relevant expiry assertions remain.
SQL fixtures now supply eligible newly published coworkers and the review token
actually captured before each race. Existing UI drivers target the current
visible presentation and protected correction route. Clocker fixture bundles
embed the real local font. These changes preserve the assertions and controls.

## Executed evidence

External evidence root:
`/Users/josek0514/.codex/worktrees/nevora-readiness-integration-evidence-20261116`.
Original independent defect reproductions, SQL coverage and diagnostics tests
are recorded in `2026-11-16-readiness-backend-delivery.md` and its evidence.

| Execution | Actual result |
| --- | --- |
| Candidate 01 validate | 924 files and 13,796 tests passed; 944 existing skips; type/lint/build/manual gates passed on that earlier exact candidate. |
| Candidate 01 Clocker SQL | All four shards and aggregate passed. |
| Company actions/notification producers rerun | 95 PostgreSQL tests passed (`company-sql2.log`). Original review is captured before observers mutate the source/access. |
| Exchange race rerun | 36 PostgreSQL tests passed (`exchange-race2.log`), including acceptance-first stale edit refusal and manual-first ordering. |
| Calendar feed rerun | 19 PostgreSQL tests passed (owned Phase E SQL report); newly published private coworker is eligible. An earlier direct-run attempt refused missing suite custody and was not counted. |
| Original form/history browser scenario | 14 checks passed in Chromium/WebKit on clean `55b2728abd0bea9cc00ddb4b4bc86ca5f24052c4` (`browser-ui3/report.json`): stale/fresh edits/deletes, keyboard/mobile widths, complete 1,001-event traversal, original artifact hash and blur retirement. |
| Two-manager concurrency browser scenario | 38 checks passed with zero unexpected runtime errors on clean `9f23c2f37c376d7974c71f1536eb73666a4fce9e` (`browser-matrix7/report.json`). Company/location Managers, both race orders, reassignment, generated/manual transitions, committed lost replies, original token/draft preservation and offline lease expiry. |
| Diagnostic contracts | 20 Node checks passed (`diagnostic-contracts.log`). The browser uses the existing independently exercised WebKit cancellation mechanism and negative window-error/rejection controls; other errors stay fatal. |

Intermediate failed browser attempts remain evidence, including the real lost
delete recovery failure. One local diagnostic attempt invoked a WebKit-specific
probe on Chromium and was stopped; its owned cluster and processes were closed.
It is not passing evidence. A local full-unit attempt made under concurrent
source edits is also not a valid clean-candidate result; use the exact Actions
validate receipt instead.

## UI contract, Jira and next gate

`2026-11-16-readiness-backend-ui-contract.md` is the exact field/response/recovery
contract. The required functional wiring is implemented. Claude retains final
presentation ownership; there is no remaining unwired protection being claimed
complete here.

Jira comments 10417 (SCRUM-204), 10418 (SCRUM-205), 10419 (SCRUM-206) and 10420
(SCRUM-207) were saved and read back. They distinguish implementation, local
verification, the failed candidate and pending development acceptance. Earlier
implementation/UI receipts remain. The issues were not marked Done and
independent findings were not self-closed.

Engineering position: retain the canonical writer guards and original intent.
Security position: preserve scope/privacy and finite private-data authority.
Delivery/governance position: regenerate all required manuals, qualify the next
exact candidate through every mandatory check, recheck remote/source drift,
then use a normal fast-forward only. No production decision is requested.

Development acceptance is pending until the exact next candidate passes every
required Actions job and the combined release is verified. Record final check,
integration and deployment states in Jira; the immutable tag and Actions run
are the authority for candidate identity. Main/production remain held.

Tracked compact browser receipts and full-report hashes are in
`readiness-development-evidence-20261116/`. Typecheck passed on the final
application source; lint passed with the existing hosted-worker export warning.
The manuals and next Actions candidate still require their own exact receipts.
