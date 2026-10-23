# Independent QA — mandatory cloud navigation failure

**Recommendation: NO-GO for development integration until the driver correction is independently verified and mandatory candidate CI passes.** The existing local Owner service/SQL conclusions are not invalidated by this separate failure, but they cannot substitute for the failed release gate.

**ISSUE QA-CN01 — reproduced:** the Phase D driver at `scripts/phase-d-browser-qa.mjs:104` issues a hard `page.goto` to the Manager's current timecards URL while a real application RSC request is in flight. The hard navigation cancels that request; Next's RSC fallback starts another document navigation to the same URL and cancels the driver's first navigation. This reproduces the exact cloud error without a production-code edit, network failure stub or increased timeout.

## Evidence and custody

Cloud workflow `39995101398`, test-merge `c76bffc08f3114fe63d9f0348773ba2327e7f98f`, failed after 122 check groups. Independently downloaded artifact `12520605441` contains the actual report, failure screenshot, source manifest and ownership closure. Its two errors are the same-URL `page.goto` interruption and a Next `__nextjs_original-stack-frames` access-control/cancellation error. The screenshot shows the protected fresh-check placeholder rather than an application error page. The cloud source tree `1c4fe2c2a7976be53681e167b3f0060124a53c1f` is exactly the tree of local published candidate `99f155f5b6a05b20ee5c3eb59fd2961011aed1da`.

QA ran the unmodified WebKit-only Phase D browser driver first: **100 check groups, errors=[]**, complete owned teardown. This confirms the failure is intermittent; it does not clear the failed cloud gate.

The external bounded overlap diagnostic retains the real harness setup through Lead self-service. It adds read-only request/lifecycle/console events and Playwright traces, then waits for an actual `/app/timecards` RSC request before issuing the original hard `goto`. No network response is replaced or deliberately delayed in this diagnostic. The event sequence is:

| Relative time | Observed event |
| --- | --- |
| 0 ms | Actual same-period RSC request |
| +4 ms | RSC request canceled by hard navigation |
| +5 ms | First document navigation request |
| +6 ms | Next logs `Failed to fetch RSC payload… Falling back to browser navigation` |
| +13 ms | First document navigation canceled |
| +16 ms | Second document navigation to the same URL |
| +153 ms | Second navigation returns HTTP 200 |

The actual `page.goto` rejects with the exact same-URL interruption. The actual Manager trace contains one failed action; its report retains the matching stack-frame pageerror. The diagnostic catches the goto failure only to retain post-failure evidence: the later actual current Manager card appears with Reopened revision history. **The diagnostic's zero process exit and printed completion check are not a green result:** `qaOverlap.goto=rejected` plus `report.errors.length=1` remain an explicit failed old-driver scenario. Cloud has two errors because its outer catch additionally records the goto stack in the errors array.

On macOS WebKit, the Manager page reported `document.hasFocus()=true` and retained its card even while the Lead page was open. Therefore this experiment proves the collision with a real RSC request, but does not establish whether that particular request began from native foreground recovery or the proactive refresh timer. Source inspection supports both: `ScopedReadFrame` can replace the current route after a fresh recovery authority response and proactively refreshes a leased view. Neither trigger needs to be suppressed to fix the driver.

## Discriminating no-goto comparison

A second external bounded diagnostic used the real browser and PostgreSQL with explicit window blur/focus events to exercise the privacy lifecycle. This is synthetic lifecycle stimulation, not OS or physical-device backgrounding certification. It held two real authority requests before release and verified that the retired Manager row was absent, with a screenshot of the fresh-check placeholder.

After releasing those actual requests, without a hard goto or response substitution, it required a **completed HTTP 200 protected timecards response**, `state=ready`, exact requested period `2026-09-21..2026-09-27`, bounded positive validity, unchanged page URL and the actual Manager card. The response/card completed in **267 ms** under the existing **15,000 ms deadline**; actual `validForMs=14984`. The report has **22 bounded check groups, errors=[]**, and all three traces contain zero failed actions. This validates the proposed ordering and privacy condition; it is not an execution of a committed fix or the full suite.

## Recommended smallest correction and regression

Keep the Manager page on its current exact-period route. Foreground it, observe the current protected timecards read, finish its body within the original shared 15-second deadline, assert HTTP 200/ready/exact period/current positive lifetime, and then open/reapprove/finalize the card with the existing assertions. Remove the redundant full navigation at this already-current route. Do not catch and ignore goto errors, reclassify the Next pageerror as harmless, retry the scenario until green, remove assertions, or increase timeouts.

Add a discriminating regression that holds actual current-authority recovery, proves private rows remain absent while held, releases it, and verifies the fresh matching-period response before opening the card. Retain an old-path overlap reproduction demonstrating the failed original sequence. Final verification must rerun the actual corrected Phase D browser workflow on a frozen candidate, independently inspect errors/source/closure artifacts and then satisfy mandatory exact-candidate cloud CI. The application can recover after the induced collision; this evidence supports a driver navigation-order defect rather than a demonstrated SQL, session-authority or timecard-state failure.

## Scope and status

All three local owned runtimes and PostgreSQL clusters are closed. Across cloud, local baseline and both diagnostics, all **1,866 captured source hashes** match; ownership records show closed/sourceVerified/mirrorVerified. QA inspected the cloud and local screenshots and all six diagnostic trace archives. Source/HEAD remained clean at `99f155f5` through teardown. Parent was notified that runtime custody was complete and it could proceed with its implementation work.

QA made no application, script, repository test, index or HEAD edits. Diagnostic harness copies, reports, traces and receipts are only under the assigned external evidence directory. No external provider/model or real delivery was invoked; SMTP in the full baseline was the owned local fictional sink. No cloud rerun was triggered by QA. UI assertions/behavior unrelated to this failure and production readiness are not inferred from this diagnosis.

Raw evidence root: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-nav/`.

Structured matrix: `owner-ai-cloud-navigation-manual-qa.md`; machine-readable companion: `manualQa.json`; source/closure audit: `custody-audit.json`; causal sequence: `overlap-causal-timeline.json`; action audit: `trace-inspection.json`.
