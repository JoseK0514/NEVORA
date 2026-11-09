# Employee Schedule verification

Implemented only in Employee mobile’s local prototype, preserving the approved Owner-derived teal design. HTML SHA-256: `cab9d28a3f142c3707faa67fba77a48f63955c65b0d5f9710210550378d9fe5c`.

[Open Schedule](index.html?page=schedule) · [Earlier week](schedule-earlier-week.png) · [Week chooser](schedule-week-picker.png) · [Overnight detail](schedule-overnight.png) · [Published changes](schedule-changes.png) · [Removed assignments](schedule-removed.png) · [Original review recovery](schedule-recovery.png).

## Result

- Navigate valid earlier/future weeks and choose any date’s week. Own published shifts use actual captured times, positions and locations, computed planned durations, split assignments and overnight end dates. Unassigned dates say “No shift published”; they do not promise a day off.
- Failed coherent reads, partly published locations, unpublished weeks and published-empty weeks are distinct. Removal of all historical own assignments still supports a relevant review. Equivalent own facts preserve effective review across newer revisions. Approved callout remains visible and has no shift-change controls.
- Current own Employee/Lead session/workplace/proof guards reads and actions, including retained sheets. Review binds the original operation UUID, owner, revision and material facts. Conflicts require a new current review; command acceptance alone cannot show success. Unknown results require checking the original result before deliberate original replay.
- Unresolved original reviews stay findable across navigation/other weeks. Home and the existing Schedule notice derive current-week status; confirming another week cannot confirm the current one. Existing authorized shift-request forms receive the exact eligible own assignment. Calendar and marketplace read context remain independent.
- Sign-out clears private Schedule state and fences late callbacks. View retirement removes unsubmitted review controls. No private browser persistence or real request/notification/auth/provider action was added. Root-memory unknown-operation retention is a conservative sample improvement; no production lookup endpoint is claimed.

## Verification

**508 grouped browser checks per engine PASS** in Chromium/WebKit/Firefox:469 prior groups plus39 Schedule groups. **42 pure Schedule groups PASS**; previous models rerun. Independent QA personally executed **120/120 scenarios**,40 per engine. Parent validation checked all299 QA artifact hashes/nonempty files and current raw results.

The two new feature regressions failed on the saved30055aa… before artifact and pass here. QA independently found the focused receipt heading46px clipped at320px/200% onadbef520…; the scoped Schedule wrapper resolves it in all engines with unchanged geometry assertions. Shared `ui.tsx` remains unchanged. The earlier assignment-only Friday assertion now inspects actual shift rows because the complete agenda also shows unassigned dates; assignment count/absence checks remain. Initial Pay failures under parallel test load were retained; unchanged assertions passed isolated reruns and the final serialized Pay runs. No Pay source or assertions changed.

Strict TypeScript, esbuild and byte-identical `build.mjs --check` pass; saved/served bytes match. Source has93 modules, largest210 nonblank/noncomment lines:8 modified/9 new Schedule responsibility modules. Shared CSS/tokens, published-shifts, Exchange policy and communications fixtures are unchanged. Four existing system metadata hashes match. Fourteen frozen Schedule source files match development46e2027. Six actual fictional PDF downloads were parsed/hashed again.112 public PNG origins/current hashes are verified; provenance scan reports0 missing.

Fresh UI review: **disposition: ship / APPROVE** at this scope.47 unique capture paths cover320/390/430/884px Light/Dark and320px200% picker/change/recovery/receipt segments. Two equivalent images have identical bytes. Two LOW nonblocking token-alias observations are recorded; no material visual fix is required. The eleven-file21st review reports0 findings/0 fixes. Metadata search reused project components; no installation or paid generation. Finish reviewer/documenter used disclosed substitute roles. Preexisting design metadata drift was preserved.

[UI review](schedule-ui-review.md) · [Independent QA](schedule-qa.md) · [Design comparison](schedule-design-record.md) · [Source contract](schedule-source-contract.md) · [Closure](schedule-closure.json) · [Current checks](checks.json).

## Remaining work and environment

EM-A05/06 are resolved at local prototype scope; EM-A01/02/03 and local EM-R01 are carried closed. EM-A04,07,08,09 remain open. Historical reports retain their own hashes; this is not complete Employee parity, live authorization, production, physical-device or screen-reader certification.

The authoritative application checkout stayed clean, detached at46e2027 and read-only. This projectless prototype has no branch/commit, PR or deployment. Live integration and remaining audit corrections are separate work; no further user approval is required for this local slice.
