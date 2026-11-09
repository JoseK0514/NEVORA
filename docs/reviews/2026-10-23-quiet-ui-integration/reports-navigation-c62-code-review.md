# Reports navigation coordination review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES
blockers: Address commitment can release a newer attempt without generation/attempt proof (H1).

Scope: exact3a90919b→c62a68c7 nine-file patch and combined Quiet shell at56d1684bc6f2216d2811aae67334eefb14987efd. Repository /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler. Jose authorized this nonvisual behavior fix; no style/main/production/database changes authorized by review. No source edits or heavy suite run; one pure coordinator reproduction run with Node's native TypeScript support. Only this report artifact written.

## CRITICAL
None identified.

## HIGH
### H1 — Address commitment bypasses the new-attempt guard
File /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/lib/navigation-coordinator.ts:29.
Caller /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/components/app-navigation.tsx:13.
`committed(address)` finishes whichever attempt is currently active whenever address differs from that attempt's source. It carries no attempt identity/generation and does not distinguish an earlier destination commitment from the currently accepted destination. Unlike observe(attempt,pending), it therefore bypasses stale-completion protection.

Direct reproduction executed against combined source:
```
const n=createNavigationCoordinator();
n.begin('/source','/first','link');
const second=n.begin('/source','/second','link');
n.committed('/first');
// observed: expectedSecondGeneration=2, pending=false, current=null
```
Trigger/impact: a previously accepted address commit observed after another destination is accepted releases the newer navigation. ScopedReadFrame settlement subscribers can then resume conflicting source recovery/refresh while that newer destination remains pending. This violates the explicit requirement that old completion cannot release a newer attempt. Existing test covers stale Link status, not stale address commit. The pure coordinator failure is reproduced; an actual overlapping Next/WebKit navigation sequence was not reproduced in this pass, so this is not attribution of a historical browser failure.
Required: bind commit settlement to current navigation provenance, or otherwise make superseded commitments unable to release the new intent. Retain legitimate redirect/history completion rather than simply comparing only exact destination. Add the stale-address-commit regression plus an overlapping actual-navigation check before claiming generation safety.

## MEDIUM / LOW
No additional standalone blockers established in this scope. Coverage remains narrow: no mounted frame/coordinator unit integration added; the frame test mocks useAppNavigation to null. New coordinator unit tests are meaningful for their cases but miss H1. The browser test's two arms validate one destination, not competing generations, cancelled history, rapid repeat actions, or modifier/focus combinations.

## Controls supported by inspection
- ScopedReadFrame still retires body and clears authority recovery on blur/storage/offline/expiry. The fresh-authority cutoff, retiredThrough, matching authority and strict newer observation checks remain unchanged. Suppression is at router.replace/refresh; authority reads and retirement continue.
- Recovery resumes through a fresh recover() after settlement, rather than replaying a stale response. Explicit Refresh current view discards pending intent and invokes recover(), establishing a new barrier. This is supported by source, not a new browser execution here.
- Proactive refresh is deferred while pending; expiry still recovers/retire. No new extended privacy lifetime or cached private-body fallback.
- NavigationLink uses the original NextLink and observes onNavigate without preventDefault of its own. Inspected installed next/dist/client/app-dir/link.js: Next excludes modifier/non-self/download and external navigation before invoking onNavigate, then performs its normal navigate. Existing supplied onNavigate prevention is forwarded. No router.push replacement, synthetic second click, or scroll/focus override introduced by the wrapper.
- Combined AppShell retains Quiet markup and adds context/wrapped shell links only; no stylesheet diff. Links outside AppShell are not globally instrumented; do not claim all application navigation paths are covered.

## Retained actual prototype evidence inspected
Opened /Users/josek0514/.codex/owner-ai-integration-evidence-20261023/engineering/reports-native-link-spike/runtime/report.json.
Parsed errors=[] and scopedNavigation:
- WebKit recover=false: passed, actual destination hold1507ms, sourceRequests0.
- WebKit recover=true: passed, actual destination hold1508ms, sourceRequests0, privateRetiredBeforeRelease=true.
The original helper still performs its single click/15-second acceptance; new test adds separate source setups with1500ms held Reports RSC and synthetic storage recovery. These are evidence for the declared controlled mechanism, not full combined runtime or historical-cause proof. No fresh screenshots/runtime replay performed here.

## Test / skill check and remaining gates
Previously loaded remove-ai-slops/programming perspectives applied. Coordinator tests observe state transitions and notification counts rather than prose or deletion-only strings. No new unnecessary application normalization or untyped escape hatch identified in this bounded patch. The important gap is omitted competing-commit behavior H1, not stylistic test requirements.
Exact diff whitespace check passed; no broad suite or cloud launch. Native Node reproduction printed the invalid pending=false/current=null result above. Parent's focused run was in progress; no pass claimed for it. Historical Attention failure and combined release gates remain separate. Approval of this review requires H1 resolution; no additional user permission needed for review itself. ULW plan absent; fallback report path used; no notepad provided.
