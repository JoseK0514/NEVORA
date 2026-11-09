# Time off permissions and draft recovery verification

Implemented only in the local Employee mobile prototype, preserving the approved Owner-derived teal design and existing shared controls. HTML SHA-256: `30055aa74aaf445b6f8ed793db86206eb3651d868c81fae84722314b2059673d`.

[Open Requests](index.html?page=requests) · [Recovered draft](timeoff-draft.png) · [Partial-day draft](timeoff-partial-draft.png) · [Deliberate discard](timeoff-discard.png) · [Read recovery](timeoff-unavailable.png) · [Known failed send](timeoff-send-failed.png) · [Enlarged review actions](timeoff-review-text200.png).

## Result

- Current own employee/workplace/sample-session, workplace module, read freshness and mutation proof are distinct. Disabled Time off removes its action/history/attention/notice projections. Availability stays independently usable. Own readable history remains available when mutation proof expires; Check again cannot grant missing proof, identity or an off/unknown module.
- Retained sheets read current context. Review, send and cancellation recheck current scope and payload/status. A receipt requires a matching committed sample result; submitted means Pending, not Approved. Employees have no management approval or coworker controls.
- Full/partial-day fields, hidden mode values, note and stable UUID survive close/Escape/in-app navigation in own root memory. Keep editing preserves them; confirmed discard, confirmed local send and sign-out clear them. Refresh resets sample memory. No private browser persistence was added.
- A known pre-send failure retains the original draft/UUID for deliberate retry. Read recovery restores the form and requires a new review. Real unknown transport outcomes, durable idempotency/concurrency and server authorization remain application integration work.

## Checks actually run

**469 grouped browser checks per engine PASS** in Chromium/WebKit/Firefox:439 prior groups plus30 Time off groups. **26 pure Time off model groups PASS**, with previous model suites also rerun. The two new feature regressions failed on the saved before artifact and pass on this artifact. Independent QA personally executed **96/96 scenarios**,32 per engine; parent validation checked all203 referenced evidence hashes and nonempty files.

Strict TypeScript and esbuild pass. `build.mjs --check` reproduces saved bytes without mutation; saved/served bytes match. Eleven frozen source files match development46e2027. Source has84 modules, largest207 nonblank/noncomment lines:9 modified and3 new responsibility modules, no CSS/token/shared-primitive changes. Six actual fictional PDF downloads were parsed and hash checked again.105 public PNGs have current source/origin/byte records; provenance scan reports0 missing.

Fresh visual review: **disposition: ship** at this scope.47 capture entries contain46 unique originals, individually inspected, including320/390/430/884px Light/Dark and320px200% text segments. The eight-file21st review has0 findings/0 fixes. Search used metadata; no component installation or paid generation. Existing hook suppression after repeated session edits was not treated as a complete current detector verdict. Finish reviewer/documenter used disclosed substitute specialist roles. Existing design metadata drift was preserved.

[Independent QA](timeoff-access-qa.md) · [UI review](timeoff-access-ui-review.md) · [Design record](timeoff-access-design-record.md) · [Source contract and intentional improvements](timeoff-source-contract.md) · [Machine closure](timeoff-access-closure.json) · [Current checks](checks.json).

## Remaining scope

EM-A03 and the local EM-R01 modeling risk are resolved; previous EM-A01/02 closure is carried forward. Only the Time off portion of EM-A05 is addressed. Its Schedule portion and five other full-audit findings remain open. The historical full audit is retained at its original hash. This is not full desktop parity, production authorization, physical-device or assistive-technology certification.

No real employee request, notification, API/database/auth/provider action or production data change occurred. Source application stayed read-only. This projectless prototype has no Git branch/commit, PR or deployment. No further user approval is required for this local slice.
