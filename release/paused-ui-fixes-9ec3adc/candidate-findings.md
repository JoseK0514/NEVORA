# Candidate findings on 9ec3adc

## ST-RC-HOME-01 — P1: Home ready summary moves first-screen content

Exact source: `9ec3adcf486bf4d18d6b9c8d5ed9af9e876d332b` (Home implementation is byte-identical to b9567ab). Chromium, fictional AUDIT-E, fresh navigation to `/app`, 320×844, natural 100% text. The prior unchanged-checker run on b9567ab retains eight failing Employee/Lead Home cells; these are not waived for load.

With `/api/employee/home` held, all requested Inter font faces are loaded before measurement. Loading summary “Checking your shifts…” is 24px tall; releasing only that harmless read produces ready summary “Next shift tomorrow at 8:00 AM.” at 48px. The band grows 272→296px. The review link/note y200→224 and Next shift pass y268→292 both move 24px. Eyebrow remains 20px in both states and title remains 36px; the timezone greeting difference is not the cause.

PerformanceObserver records total CLS 0.0231071. Its dominant entry is 0.0225399 with the content/pass/icon/review area shifting exactly 24px. The smaller clock-badge width entry contributes 0.0005671. This is visible movement of the primary shift and review content during an ordinary initial read, repeated for all eight Employee/Lead fixtures in the bounded checker, hence P1.

A causal control changes only the live browser style `.premium-employee-home .nv-masthead__summary { min-height: 2lh }` before releasing the same Home read. The summary is 48px before and after; band remains 296px, review y224 and pass y292 remain fixed. Total CLS falls to 0.0005671 (only the independent clock-badge entry). This control is diagnostic, not an app patch or final acceptance.

Source cause: `src/components/employee-home-reviewed.tsx:282` switches short loading summary to a naturally wrapping ready summary; line296 passes the bare string to PageBand without a same-shape sizing reservation. `src/app/app/portal-premium.css:218` supplies the narrow summary width. Existing eyebrow and extra reservations do not reserve summary lines.

Evidence: [raw observer and exact element geometry](home-causal/evidence.json), [held before](home-causal/AUDIT-E-held-home-before.png), [held ready](home-causal/AUDIT-E-held-home-after.png), [reservation before](home-causal/AUDIT-E-reserved-home-before.png), [reservation ready](home-causal/AUDIT-E-reserved-home-after.png). Script: `scripts/home-causal.mjs`. Old incomplete route-release attempts are retained under `home-causal/initial-release-wait/` and in the progress log; only the recorded `homeState: ready` release rows support the finding.

Recommended repair: an aria-hidden, nonprivate same-grid sizing text that naturally reserves the bounded ready-summary shape at each width/text scale, with the actual summary remaining the only accessible text. Verify responsive sizing on both engines at 320/390/landscape and 100/200% text, plus the fresh unchanged checker.
