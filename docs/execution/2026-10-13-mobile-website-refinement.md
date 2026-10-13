# Remaining mobile website refinement

The user approved extending the mobile Home design across the 41 remaining route patterns at widths up to 760px. Authentication and every Home role remain excluded. The source branch is `codex/nevora-login-refinement-20261012`, based on `985ed0bd`. No push, main merge or production deployment is included.

## Changes

`src/app/mobile-workforce.css` supplies shared mobile tokens, the original NEVORA wordmark with centered Workforce, restrained navigation, grouped task surfaces, larger native inputs and a horizontally scrollable schedule day strip. AppShell enables this presentation only on remaining authenticated routes; public Clocker has a separate scope. Native action popovers become sheets with an explicit close control. No package dependency was added.

Timecards retain totals and issues above optional review details. Payroll population detail is optional only after a settled review; busy, retry and outcome states reveal the existing content. The same child tree remains visible on desktop and print. Typed mobile payroll labels replace internal issue/state codes while desktop retains its existing copy. The invalid copy-receipt guard gains a mobile title and safe return link. Data readers, mutation handlers, API contracts and authorization are unchanged.

## References

Authenticated Mobbin Gusto Home, pay history, paycheck detail, time-off and grouped-field screenshots informed the layout. InsightTimer contributed day-strip organization and Mindtrip contributed date/time sheet organization. IDs and provenance are recorded in `DESIGN.MD` and `.21st/DESIGN.md`.

The authenticated 21st CLI retrieved actual Preferences Card 30553, Calendar 34716 and Sheet 35214 source. Their grouped-row, calendar-state and sheet-exit anatomy was adapted to existing native/project components. The 21st MCP was unavailable in this session. No hosted AI generation or reference screenshot appears in the rendered product.

## Verification and independent gates

Typecheck, changed-file ESLint and the isolated production-mode Next build passed. The focused suite passed 164 tests across 19 files, including two payroll-copy regression tests. Independent behavior review reran the same suite successfully. Timecard and payroll controller prefixes match the base after removing view-only imports; the protected backend diff is empty. The 21st review produced 13 informational notices for explicit shared token declarations.

Final build: `fOw4iFubmc3pmm56hLNXD`. Evidence in the owning Codex chat's `work/mobile-site/` covers 123 owner route/width renders, 52 actual employee/lead renders, 29 interaction states, 25 edge renders and 32 paired Home/authentication views. All 569 images have validated signatures, dimensions, freshness and hashes. The 65 contact sheets include every full-page segment. No recorded document overflow, undersized measured action/input controls, blue-button foreground failures or visible `period_open` remain. All 42 matched desktop geometry cases are unchanged.

Both independent final gates returned PASS / APPROVE with no blocking findings. Earlier findings were corrected and reviewed again: Clocker SVG sizing, primary-action foreground omissions, payroll issue copy and pending Home preservation frames. Evidence-only repairs replaced 101 document-clipped end shots with true scrolled viewport captures and corrected the native keyboard-focus capture. Both reviewers verified the repaired evidence and unchanged rendered source hashes. Reports: `work/mobile-site/qa-behavior-final.md` and `qa-visual-final.md`.

## Preview and handoff

The same preview target is `https://rent-less-momentum-tags.trycloudflare.com`, using loopback port 56316 and the existing tunnel. The approved v6 mirror is `work/mobile-site-runtime-v6`; v5 remains available for rollback. Before replacing a server, verify its exact metadata PID, `next-server` process name and matching loopback listening socket. Preserve the existing private fixture configuration and credentials. Retire temporary port 59729 only after public browser verification.

The current source commit, build identity, runtime PID, public verification state and rollback mirror are recorded in the owning chat's `work/mobile-site-preview-runtime.json`. User-facing results and the final review copies are in that chat's `outputs/`. This runtime metadata is updated after the preview handoff; this source document records the reviewed implementation and handoff procedure.

## Limits

Verification uses the existing marked disposable synthetic fixture. No real messages, credential changes, payroll processing, attendance mutations or customer-data changes were tested. This is a light-only responsive web preview. Native iOS touch, DPR, notch and virtual-keyboard emulation were unavailable. Reduced-motion rules were inspected in source; browser emulation and 200% zoom were not verified. Unsafe outcomes are supported by source and focused tests, not live transaction execution. No production certification is claimed.
