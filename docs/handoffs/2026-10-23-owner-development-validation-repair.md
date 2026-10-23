# Owner development validation repair

Status: local repair checks passed; fresh mandatory cloud acceptance is pending. Jose approved development integration and retaining six existing remote branches, including Claude-UI-Fix. Production and additional hosted AI changes remain separate.

## Actual integration and failure

[PR25](https://github.com/JoseK0514/NEVORA/pull/25) merged into development as `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`, tree `82966af028a35c97392d62fee9ea970599b46942`, parents `e37d08e3` and `420ba8ae`. Its premerge workflow40019293625 passed all12 jobs and its source/artifact audit. Actual development-push [40024512981](https://github.com/JoseK0514/NEVORA/actions/runs/40024512981) completed with four primary failures: Home startup ownership, Communications Preview→Publish, Owner browser errors within Attendance, and the full development-dependency audit. Six other primary jobs passed; both aggregates failed. The premerge pass does not establish postmerge acceptance.

Original checkout remains at development8d4a. Repairs use the isolated local checkout `/Users/josek0514/.codex/worktrees/owner-ai-supervision-20261023/Fuel Scheduler`. Tested code is clean `14b46c7e2f39621b5cba2af3534eb2d155ec289e`, tree `f64bd91506ed563fdd68a14d6fc9113e7c37a3cd`. Subsequent documentation copies do not change the tested code. Publish descendants through the existing `codex/owner-ai-release-testing-20261023` head by normal fast-forward. PR25 is merged, so a new development PR is required. Preserve all six remotes; no seventh branch, retirement, force push or main change.

## Changes and evidence

Home failed before any application cell or Next startup. Native process metadata retained the same PID, parent, group and birth; exact source-derived command hashes identify a transient Node browser-driver→`git rev-parse HEAD` fork/exec. Persisted regression `b7e40d0d` reproduces two expected identity failures using real FIFO-controlled shell→Node exec; the strict registered-resource negative passes.

Correction `541088a0` leases the supervised root identity from its creation handle. An argv transition is allowed only for a previously observed generic root-group descendant with fresh strict root proof and unchanged member PID, birth, parent, group, ancestry and ownership marker. Registered resources retain strict command identity and cannot promote a changed descendant. Root identity is group proof only; generic root-group members are never individually signalled. Group cleanup rechecks creation proof and original member lifetimes after root exit. Tests include exec, clean/root/forced exit, registration promotion, changed root, lost markers, recycled identity and reparenting; existing negatives remain. Darwin marker simulation is explicit and does not substitute for actual Linux Home coverage.

The full audit newly reported HIGH GHSA-mrhx-c7xc-m3w5 through development-only ESLint tooling. Targeted lock correction `c0f6397f` resolves only Zod4.6.5→4.6.7 within existing peers; the official advisory fixes4.6.6. Package/parent versions and overrides are unchanged. Fresh production and full audits both report zero vulnerabilities. Earlier audit results are time-bound and do not disprove the later advisory.

Diagnostic commit `14b46c7e` preserves missing failure facts without changing product behavior:
- Comms Preview gets a separate bounded event buffer, exact same-origin request categories, normalized status/state only, DOM form-lifetime/focus/lifecycle observations and the actual accessible-role Publish locator. Failure evidence and a bounded employee screenshot are collected before manager/context teardown. Workflow uploads now retain existing failure/check JSON.
- Owner records navigation phase, known request categories, status and window event context. Every original pageerror still enters the fatal errors array. No native-error classifier, fetch wrapper, exception exclusion, action retry or deadline expansion was added.
- Original Comms actions and15s acceptance remain unchanged. The helper's2s observation deadline does not cancel underlying reads;1MB is checked after body allocation and max4 bounds tracked tasks only. DOM form identity is a node-lifetime proxy, not React generation. Final DOM/locator/screenshot are sequential, not an atomic failure snapshot. Existing raw traces are not blanket privacy-certified.

| Check actually run | Result |
| --- | --- |
| Full default suite, exact14b | 9497passed,801existing skips, zero failures;565passed files/27skipped;306.89s, one worker |
| Release engineering | 124passed, zero failures/skips |
| Types / repository lint | Both exit0 |
| Source-bound production build, exact14b | Exit0; clean/source unchanged;5242source hashes and3286build-file receipt hashes |
| Persisted process/browser evidence contracts | 70passed atc0; original RED retained |
| Independent exact14b contracts/process controls | 23node contracts plus23process tests, zero failures/skips;5242tracked hashes unchanged; runner processes closed |
| Static duplicate-label/remount fixture | Chromium/WebKit passed; exact committed helper hash verified; fixture-only, not actual Next acceptance |
| Development source gate | PASS56classified sources/6active remotes after fresh fetch |

Raw execution logs, build receipt, failed workflow JSON/artifacts and independent matrices remain under `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/`. Build/runtime receipts prove recorded custody; downloaded production binary or hosted acceptance is not claimed.

## Independent positions and open findings

[Security](../reviews/2026-10-23-owner-ai-integration/security-c0f6397f-supervision-zod-review.md) approves the bounded root-group/Zod change. [Diagnostic privacy review](../reviews/2026-10-23-owner-ai-integration/security-14b46c7e-diagnostic-privacy.md) is WATCH/APPROVE with the observation/allocation limits above.

[Independent QA publication review](../reviews/2026-10-23-owner-ai-integration/qa-development-14b46c7e-diagnostic-publication.md) gives GO WITH CONDITIONS for diagnostic publication only; [independent local checks](../reviews/2026-10-23-owner-ai-integration/qa-development-14b46c7e-independent-checks.md) satisfy its local conditions. **Release readiness remains NO-GO pending fresh full cloud acceptance and independent dispositions.**

QA-COM01's historical WebKit320 Preview→Publish cause remains unknown. One external instrumented original full14 diagnostic passed without reproducing it; no causal closure follows. [Original diagnostic results](../reviews/2026-10-23-owner-ai-integration/qa-development-8d4a-diagnostic-results.md) remain unchanged.

QA-OWN01's historical native authority GET error during navigation remains unexplained. Two controlled probes also failed; the second retained a stack-frame resource diagnostic plus an actual TypeError and window errors. [Raw independent resource findings](../reviews/2026-10-23-owner-ai-integration/qa-development-8d4a-owner-resource-diagnostic.md) are preserved. No event is classified away.

QA-AT01 remains the explicit unresolved intermittent timing risk from the [prior cloud disposition](../reviews/2026-10-23-owner-ai-integration/qa-attention-420ba8ae-cloud-disposition.md). Prior green evidence supports only its named bounded disposition, not retrospective cause or a new waiver. Any recurrence blocks the new gate. QA-AT02's independently reproduced SSR readiness invariant and the later layout correction retain their prior scoped acceptance; historical timing remains unknown.

Independent reports are copied byte-identically. Operating management may supply evidence but may not rewrite or self-close their findings. If a fresh finding requires a material policy exception or material residual-risk acceptance, Jose remains final authority.

## Next gate and separate boundaries

Require all12 fresh PR jobs with exact source/test-merge identity, original Linux Home/Comms/Owner assertions, complete artifacts, source/build/ownership closure receipts and independent dispositions. On recurrence, inspect retained discriminators and investigate one evidence-backed hypothesis; no blind passing rerun or assertion weakening. After accepted development merge, verify actual parents/tree and require all12 actual development-push jobs and artifact audit again.

Base DEV was separately approved/executed in the Manager/Owner rebuild task, then Jose assigned further changes to Claude. This repair performs no direct hosted schema/env/alias change, new paid inference or production action. Development merges may trigger existing service automation; that is not hosted AI verification. The prior$5pilot remains exhausted20/20 and unmodified. Additional additive AI migrations0036→0037, coordinated hosted activation and a new inference budget remain separate pending decisions. Main baseline is `7ffd013e39a9763a0655aa092b159dea4cbbfb50`.
