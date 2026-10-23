# Independent UI report to Jose — Owner AI combined candidate

**UI recommendation: GO WITH CONDITIONS for the locally observed UI at `2830a1484b6f28c5a5f4baed20c9a5cbebcf9f46`.** One reproducible target-size issue remains open. This recommendation does not approve hosted release, activation, model reasoning quality, or production, and does not extend automatically to a later fix commit.

I applied `.codex/skills/nevora-independent-ui-oversight/SKILL.md`, read AGENTS, executive operating model, DESIGN.MD current direction, clean-manager v3 spec and approved Home reference, integration plan, prior workflow/release handoffs and raw engineering reports. Prior implementation summaries were treated as claims. No application, repository test, index or HEAD edits; no agents spawned. Evidence harness copies live only in the assigned external UI directory.

## ISSUE UI-1 — WebKit language selector misses the approved 44px target (medium)

At 320px and 390px, `Review language` renders 25px high; at 1440px it renders 23px. The approved clean-manager contract requires 44px targets. Real DOM rectangles were measured in the actual browser and corroborate the visibly compact native selector in the Spanish mobile screenshots. Chromium's 25 visible advisor controls all meet 44px at each width; WebKit's other 24 do. This is a specific project-contract failure, not a claim that every small native control independently violates WCAG.

Evidence: `ui/supplemental/webkit-measurements-320.json`, `webkit-measurements-390.json`, `webkit-measurements-1440.json`; `ui/browser/webkit-period-390.png`; `ui/supplemental-audit.json`. Implementation location inspected: `src/components/owner-advisor/advisor.css` shared date/select/textarea rule. Condition: make the selector a reliable 44px target and request independent reproduction in both engines at 320/390/1440. Management explanation is not closure.

## VERIFIED — workflow and consent behavior

The retained actual browser runner passed 100.37s / 28 scenario groups, and the independent external supplemental run passed 71.03s / 30 groups on the same clean candidate. These are 2 Vitest tests containing scenario groups, not 58 independent test cases. Business workflows use real owned PostgreSQL and Next, with fictional identities and no provider. Exact replacement review shows person/day/time/location/position/lead, draft effect, and remaining requirements. Draft confirmation creates one shift, retains DRAFT and changes no notifications. Published confirmation starts unchecked; invalid submission creates no shift and keeps the exact accessible label usable. Space then Save creates the canonical publication revision. I independently inspected the draft and invalid-consent screenshots in both engines. The historical consent-label HIGH finding is reproduced as resolved for this exact desktop flow.

Track/defer/reload/restore, changed-evidence reappearance, canonical setup resolution, priority persistence and both stages of revision conflict passed. Unsaved text survives refresh and Save remains blocked until the newer saved value is reviewed. Owner access is absent for actual Manager/Employee discovery and direct-page attempts in both engines; their browser-context API probes return 403. These are browser workflow observations, not a substitute for the separate SQL/security audit.

## VERIFIED — content, responsive behavior and state presentation within tested scope

Both actual English and Spanish period results explain that payroll readiness is unverified and missing recorded time does not establish absence. The source's disabled/incomplete payroll state remains visible. English result has `lang=en`; Spanish uses its own result region and translated exception explanations. Clear links point back to canonical Timecards/Payroll. Provider-disconnected and empty-history states are honest, with Ask disabled.

Advisor/result pages have no horizontal overflow at 320/390/1440 in Chromium and WebKit. Keyboard fields advance question→priorities and briefing actions advance Later→Not relevant. macOS WebKit uses native Alt+Tab for its button focus preference; no system setting changed. Focus viewport screenshots show the priorities outline. Synthetic blur/focus events retire private content and require a fresh read; this verifies the browser handler, not OS backgrounding on a physical device. The fixture busy state exposes Cancel; 429 and cancellation show explicit limit/unknown-result feedback with no automatic POST retry. Hostile fixture answer text stays text and its approved citation is a local link. These answer/error/cancel responses were intercepted UI fixtures, not real inference.

## RISK — information density and localization polish

With only two attention issues and three people, the Spanish result page is about 5,675–5,698px tall at 390px and 6,395–6,396px at 320px. Repeated observation/source lines and per-person missing-data explanations push the result and next action far down the page. This is a usability follow-up against the clean contract's “Less text”; the Home-specific 1,300px target is not being incorrectly imposed on this new page. Consider folding supporting detail while preserving the unverified-payroll warning and exact decision facts. No task-completion failure was observed.

The Spanish result still displays raw `DRAFT` within otherwise Spanish content. This is a low-priority localization follow-up; the important exception and financial-readiness warnings are translated correctly. Evidence: `ui/browser/webkit-period-390.png` and `chromium-period-320.png`.

## VERIFIED — custody and diagnostic limits

Both runs independently match all 1,865 captured source SHA256 hashes to candidate 2830a148. Both ownership receipts record closed=true, sourceVerified=true, mirrorVerified=true, and release of owned node_modules/.next only after verification. Original checkout was clean at both closures. PostgreSQL runner logs confirm owned-cluster stop. Both reports are complete, providerConfigured=false, external=[], errors=[]. Inspected all 12 traces across the two runs and their action/error records; no failed traced actions or uncaught page exceptions. Browser diagnostics retain navigation/refresh/teardown cancellations and the deliberately injected 429 console message. Therefore “zero uncaught runtime exceptions” is supported; “zero console/network errors” would be misleading. No external browser request was observed; no live provider or outbound delivery was configured.

## Unresolved scope and next gate

UI-1 requires an independent follow-up after a fix. Mobile widths were exercised on advisor/results, while exact replacement/consent save was exercised at 1440px; physical-device touch/OS focus, full screen-reader/axe/contrast certification, larger attendance populations, actual payroll-enabled results and model-generated answers are not certified by these runs. Source-inventory, hosted acceptance, security findings and release authorization are outside this local UI verdict. Parent reported a separate citation-count defect after freeze; I did not independently reproduce it and do not close it here.

Raw complete scenario matrix: `ui/owner-ai-integration-ui-manual-qa.md`. Source/closure receipts: `ui/baseline-audit.json`, `ui/supplemental-audit.json`. Trace/diagnostic audit: `ui/artifact-inspection.json`. Every PASS in the matrix points to a non-empty artifact. Original and supplemental evidence remain separate and preserved.
