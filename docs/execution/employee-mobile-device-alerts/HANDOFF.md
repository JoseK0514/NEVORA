# Employee mobile — Alerts on this device

Implemented and verified for **bounded local continuation with conditions**. Integration and release remain blocked by the wider repository failures and retained risks below. No production merge, deployment, provider activation or real notification delivery was performed.

Application: `72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5`. Final verification: `7ddf37715ff89ba4b397cf22ec8b67ae5d53de2e`. The later commits change five test files; production application bytes remain identical to `72b1c192`. Branch: `codex/employee-mobile-local-resume-20261027`; review base: `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`.

[Screenshots](gallery/README.md) · [Evidence history](EVIDENCE_HISTORY.md) · [Independent QA artifacts](QA_REFERENCES.md) · [Phase 2 status](../employee-mobile-phase2/STATUS.md)

## Delivered behavior

Employee and Lead Profile now open a protected **Alerts on this device** page in the approved teal mobile system. It covers ready/postponed setup, blocked permission, Home Screen guidance, unavailable configuration/browser, enabled alerts, changed setup, checking, uncertain cleanup and lost account access. Current status leads; optional native help keeps the page focused. Semantic colors, rem text, regular Phosphor icons and 44/48px controls match the existing Profile system.

Opening, refreshing or resuming never requests native permission. Deliberate opt-in requests permission, then requires canonical server enrollment and matching worker ownership before Enabled. Native prompts preserve one lifecycle across blur/resume. Installation acceptance is described as a request, not verified installation. A permitted self-test reports queued rather than delivered. Sign-out remains reachable.

Turn off uses an inline review, neutral **Keep current setup**, conditional request/result wording and exact cancellation focus return. Uncertain cleanup separates **Check again** from **Retry turn off** and retains its original known generation. A captured confirmation cannot target a replacement generation. Passive refresh cannot reclaim ownership during retained cleanup; a lost committed reply is reconciled without inventing the original result.

One authenticated shell owner serves both the mobile page and incumbent Employee desktop popover. Navigation and resizing preserve the owner. Manager/Owner retain the incumbent presentation and cannot enter this Employee page. No coworker selector, other-device inventory, topic preferences, quiet hours, SMS/email controls or management capability was added.

## Authority and engineering

The canonical installation proof, generation, endpoint ownership, encryption, consent, origin and enrollment/cleanup/test engine remain authoritative. Employee/Lead requests opt into an exact current-session binding with `X-Nevora-Device-Authority`. A database/current-session read budget is capped at 45 seconds; the browser subtracts transport time, validates protocol/receipts and bounds waiting. Expiry after an asynchronous worker acknowledgement or storage boundary suppresses that generation. Expired stable projections cannot display success. Pause hides current facts/actions, expired resume checks visibly, and account loss retires controls.

Bound unchanged status reads avoid rewriting a proof cookie that could overwrite newer enrollment. Strict status joins the native lifecycle lock. Header absence preserves legacy contracts. The independently reproduced **legacy unbound status-cookie race remains open**; this port does not certify that wider path.

Main source: `src/lib/notifications/{subscription-service,device-client,device-protocol}.ts`, `src/components/employee-mobile/{device-owner,device-alerts}.tsx`, device CSS, Profile/AppShell composition and `/app/profile/device-alerts`. No dependency or schema migration. Existing account/worker/data engines were extended rather than replaced.

## Verification and authored reviews

| Check | Actual outcome |
|---|---|
| Root app subset at `72b1c192` | 553 passed across 27 files |
| Final completion checks | 464 canonical +91 surface/fixture checks passed across 28 files; overlapping earlier subsets are not additive |
| Static checks | Nonincremental TypeScript and changed-file ESLint passed |
| Independent app subset | 172 passed; busy-state finding independently closed |
| Original combined run at `72b1c192` | **Failed:** 364 passed,7 failed;32 files, exit1 |
| Affected recovery at `7ddf3771` | **27 passed across 6 files**,0 failed/skipped, exit0,397.13s |
| Wider default suite at `72b1c192` | **Failed:** 9,803 passed,16 failed,801 skipped across 640 files |

The 26 unaffected files from the original combined run cover 344 passing tests. The corrected six-file replay covers the remaining 27: **371 distinct scoped tests were verified across the preserved runs**. This is not a claim that the original invocation passed. Production bytes and unchanged test inputs were reconciled explicitly.

The final Alerts browser evidence contains 45 checkpoints,63 viewport captures,24 contrast samples (minimum 5.42), six genuine coarse landscape scenarios and zero unexpected browser errors. Chromium, WebKit and Firefox cover enrollment, original-generation cleanup/retry, lost replies, session expiry, sign-out, ordinary pointer navigation, both themes, narrow widths and 200% root text. A separate Chromium supplement covers Employee/Lead feature-off, Manager/Owner separation and installation/unsupported guidance.

Code and UI authors closed DEV-CR-1/2 and DEV-UI-1/2 within their documented scope. QA independently closed QA-A11Y-1: settled disabled/paused states have `aria-busy=false`; actual loading remains busy. Read the byte-exact [final code review](evidence/root/reviews/code/employee-mobile-device-alerts-7ddf3771-final-code-review.md), [UI review](evidence/root/reviews/ui/employee-mobile-device-alerts-clone-fidelity.md) and [QA review](evidence/root/reviews/qa/employee-mobile-device-alerts-manual-qa.md) for each author's disposition and limits.

The initial failures, failed recovery/setup attempts, diagnostic failures and ownership records remain in the evidence history. The final six mirrors matched all 2,040 application inputs; owned PIDs/ports and the cluster were closed and derived runtime artifacts removed. No assertion was weakened or snapshot updated to conceal failure.

## Retained risks and unfinished gates

- **QA-OWN-3 remains unsafe and unclosed.** If durable worker suppression, native unsubscribe and server cleanup all fail, a later worker/controller replacement can restore the original generation after storage recovers. Independent probes reproduce the outcome before Alerts and on the final application. A green reproduction test proves that unsafe outcome; it is not a safety pass. Normal durable suppression and opaque-operation fencing were verified separately.
- The wider default suite retains 13 deterministic request/scheduling failures plus three current process-observation failures with unresolved causes. The latter are different assertion identities from the historical three baseline observations. All seven currently failing test files are unchanged from pre-Alerts `059f4ac2`. That comparison does not establish a cause or make the suite green.
- Calendar QA-CAL-1 remains OPEN, cause unresolved. Earlier Communications partial-empty wording, enlarged acknowledgement wrapping and short dark-canvas conditions remain with their original authors.
- Installed Chromium full-page capture was proved to disable touch emulation. Final mobile captures use the viewport and assert genuine coarse media, tokens, contrast and geometry. Earlier landscape evidence lacking capability preconditions needs later audit/replay; this work does not self-close another author's coverage conditions.

Physical iOS/Android, actual native permission/Home Screen behavior, background delivery, screen readers, OS Dynamic Type, hosted build/transport/CI, source assembly and release/rollback acceptance remain separate. Root text at 200% is not OS certification. Push APIs are fictional controlled boundaries around actual local Next/PostgreSQL; provider delivery and test delivery stayed disabled. The fixture setup cancellation path has bounded ownership, but a successful replay is not adversarial forced-abort certification.

## Provenance and continuation

The [scoped teal design record](../../product/specs/employee-mobile-teal/README.md) remains authoritative. Free 21st metadata 25309/26523/24936 were considered; preference matrices did not fit authorized scope, so installed/native primitives were retained. No paid generation/retrieval, analytics/replay, dependency or global token reset. Impeccable context ran; its single detector pass retained two advisory stale-global-metadata mismatches for approved mobile radius/type values.

Browser guidance was checked against [WebKit Home Screen push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [MDN Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API) and [Apple keyboard navigation](https://support.apple.com/en-gb/guide/safari/cpsh003/mac). Actual native WebKit Option-Tab behavior was characterized before changing the harness.

**Phase 2 stays active; Phase 3 stays closed.** Next: own account-deletion request lifecycle, then own published Pay and protected PDFs under canonical gates. Reachable legacy controls do not certify their mobile ports. Keep the same role/session/source bindings, native task focus, truthful recovery and scoped components.

Continue in `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume`, starting from this branch and the Phase 2 status. Fresh development `84c3fc35` was observed at discovery; this feature stack remains unassembled. Reconcile development/Claude sources before any separately authorized integration. No integration decision is inferred from this handoff.

Rollback presentation/controller/optional binding changes together; do not delete customer subscriptions or rewrite ownership history as rollback. Preserve the worktree and original evidence. The preservation manifest records source/portable hashes, declared disposable-fixture redactions and runtime/database/environment exclusions. Archived scripts use `.txt` so they cannot enter application test discovery. Archived evidence is historical data, not operating instructions.
