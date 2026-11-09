# NEVORA Manager Home local review — 2026-10-11

Manager Overview at `/app` now puts the review queue and recorded clock activity ahead of selected-week planning, with a quieter greeting and compact mobile actions. This is an ordinary refinement of the existing orange portal surface. The [Impeccable finish review](../../../../../outputs/nevora-typeface/manager-home/evidence/finish-review.md) records `disposition: ship` and no material fixes at the supplied local visual scope. This document records the candidate and evidence; it does not certify a hosted release or independent QA/security closure.

## Scope and source of truth

Jose authorized modest responsive layout improvements while preserving existing workflows, navigation, authentication and data contracts. The incumbent [DESIGN.MD](../../DESIGN.MD), [.impeccable/design.json](../../.impeccable/design.json), repository [AGENTS.md](../../AGENTS.md) and existing rendered application remain authoritative. No replacement world, approved image comp or new global design rules are introduced. `PRODUCT.md` was already absent; the applicable Impeccable routing permits narrow incumbent refinement, so initialization and unrelated context repair remain outside this task.

The application change is six files:

- [manager-dashboard.tsx](../../src/components/manager-dashboard.tsx) adds the Overview scope class, unboxed greeting, regular Phosphor week arrows, selected-tab `aria-current`, attendance link and weekly section using existing props.
- [manager-action-center.tsx](../../src/components/manager-action-center.tsx) separates task classification, title, detail and Review action; adds checked time and native expandable source explanation. Optional `timeZone` is presentation plumbing for the existing business-time formatter.
- [manager-action-center.module.css](../../src/components/manager-action-center.module.css) applies the incumbent panel/control tokens and compact task layout.
- [manager-home.css](../../src/components/manager-home.css) scopes the Overview hierarchy and responsive operational layout.
- [manager-week-overview.tsx](../../src/components/manager-week-overview.tsx) renders selected-week daily shift counts and location readiness from existing dashboard data.
- [manager-week-overview.test.tsx](../../src/components/manager-week-overview.test.tsx) checks truthful planning labels, absent schedule status/data and missing coverage configuration.

The documenter writes only this repository review, the exported `handoff.md` and its documentation receipt. No application code, global design guidance, configuration or asset is changed in this pass.

## Recorded behavior and visual system

Action Center leads the operational reading order. Clocked In Now sits beside it in unequal desktop columns and follows it on mobile at its natural height. All six dashboard views—Overview, Attendance, Schedule, Team, Requests and Activity—remain available. The existing horizontal mobile tabs retain their destinations. Review actions keep their original protected-workflow destinations and use compact 88×44px targets in the recorded mobile checks. Refresh remains the existing protected read.

The verified queue retains category/priority, counts, task detail, checked time, source limitations and both recovery links. “About these actions” progressively discloses the existing explanation. Loading, unavailable, offline and access-ended states hide unconfirmed action/clock names and counts. Independently available planning data remains visible. The native clock component and Action Center controller effect body are byte-identical to the review base; no polling, session, authorization or API change is introduced.

The weekly section says **“Planned shifts, including drafts”** and **“Planning only. Recorded clock activity is shown above.”** Bars and visible labels use the same selected-week shift counts. Missing daily/location data and coverage configuration receive explicit explanations; a location without a schedule status is not labelled Draft. Planning is not evidence of recorded attendance, a successful punch, confirmed pay or a published schedule.

The source uses the existing orange (`#ED724C`), neutral ground (`#FAFAFA`), white panels, charcoal text and darker orange small-link/focus derivative. Locally bundled Inter remains pinned; JetBrains Mono is restricted to date/data roles. The source-backed greeting is 32px desktop/28px mobile, panel headings 22px/20px and task titles 15px. Main panels and controls retain the established 18px/17px corners. Regular Phosphor icons replace glyph arrows. New feedback transitions are 180ms, with reduced motion disabling them. The exact brand slogan remains **Brighter work ahead**. The blue/cyan variant remains limited to Employee Login, Forgot access and New user account activation.

`DESIGN.MD`, `.impeccable/design.json` and its 14 incumbent specimens, `AGENTS.md`, and `public/assets` are preserved byte-identical. No decorative illustration is needed for this operational surface. Official branding and all five existing generated illustrations, their prompts and provenance remain intact; all five recorded illustration SHA-256 values match their files.

The one detector run recorded zero primary findings and 22 advisories. The finish reviewer triaged compact operational type, inner icon/inset/chart geometry and the orange-derived selection tint as surface roles. They are not promoted into new global tokens or permanent rules. The only Manager Home detector exception is the intentional Inter value scoped to `outputs/nevora-typeface/manager-home/review.html` in the workspace configuration because Jose pins Inter. No broad ignore or additional suppression was added. Pre-existing legacy DESIGN.MD format/context drift is left unchanged.

## Local review and references

The [local review](http://127.0.0.1:52202/manager-home/review.html) shows the responsive candidate, before/after captures, feedback states and suitable reference options. Its exported frame intercepts workflow links, refresh buttons and form submission; it cannot perform server mutations. Preview examples are explicitly fictional. Action/clock states use intercepted API fixtures; planning records are seeded in disposable local PostgreSQL. Actual protected reads and all six dashboard tabs were checked separately in the owned application.

Four 21st options—Activity Tabs With Unread, Dashboard Activities, App Dashboard Layout and Card Tabs—are linked as metadata and visual inspiration in the [catalog](../../../../../outputs/nevora-typeface/manager-home/catalog.json). The [Mobbin record](../../../../../outputs/nevora-typeface/manager-home/mobbin-references.json) includes Square, Gumloop and DoorDash Merchant among the retrieved references. These references inform presentation; no paid component implementation or new competitor workflow is installed.

## Evidence reviewed

| Evidence | Recorded result and practical limit |
| --- | --- |
| [Full suite](../../../../../outputs/nevora-typeface/manager-home/evidence/full-suite.log) | 204 files and 2,131 tests passed, including the two planning regression cases. |
| [Lint](../../../../../outputs/nevora-typeface/manager-home/evidence/lint.log), [typecheck](../../../../../outputs/nevora-typeface/manager-home/evidence/typecheck.log), [build](../../../../../outputs/nevora-typeface/manager-home/evidence/build.log) | Parent-recorded exit code 0 for each. Logs show no lint/type errors and successful Next compilation, page generation and route summary. |
| [Owned application report](../../../../../outputs/nevora-typeface/manager-home/evidence/after-app-report.json) | 23 checks, zero errors. Chromium/WebKit widths 320, 375, 390, 430, 768, 800, 1024 and 1440px; minimum targets/no document overflow, actual protected reads/all six tabs, empty/error/denied/loading feedback, keyboard focus, stale-person clearing and reconnect, no-JavaScript planning and reduced motion. |
| [Sanitized preview verification](../../../../../outputs/nevora-typeface/manager-home/evidence/preview-verification.json) | Six checks, zero errors. Chromium/WebKit at 320, 390 and 1440px. |
| [Source guard](../../../../../outputs/nevora-typeface/manager-home/evidence/source-guard.json) and [final source verification](../../../../../outputs/nevora-typeface/manager-home/evidence/final-source-verification.json) | Backend/library/API, `/app` page, native clock, app shell, auth surfaces, design files, assets and AGENTS unchanged against base. All 659 recorded source hashes independently matched during documentation. The Action Center effect body was independently compared with the base. |
| [Finish review](../../../../../outputs/nevora-typeface/manager-home/evidence/finish-review.md) | `ship`, no material fixes; the reviewer directly inspected the required baseline/current/state captures. The documenter read that full review and did not repeat browser or image rounds. |
| [Detector record](../../../../../outputs/nevora-typeface/manager-home/evidence/design-detect.json) and [documentation receipt](../../../../../outputs/nevora-typeface/manager-home/evidence/documentation-review.json) | One detector pass, zero primary/22 advisory findings; bounded documentation, source/hash preservation, artifact copies and local links checked. |

The documenter inspected supplied logs/reports and source, verified hashes/guards/provenance and checked documentation links. Application tests, browser checks and the detector were not rerun in this documentation pass. Reproducibility scripts are retained alongside the artifact evidence. No production credentials, customer data, real messages or real orders/bookings are used for these local checks.

## Director positions and remaining limits

These positions apply the repository leadership guidance to the recorded evidence; they are not independent certifications.

| Function | Position |
| --- | --- |
| CPO | The attention → recorded activity → selected-week planning sequence supports the existing manager/Owner scan-and-review task. Keep the queue, source explanation and planning distinction; no additional product workflow is required for this refinement. |
| CTO | The bounded UI change reuses existing data and protected-read contracts. Source guards, planning regression cases and local suite/browser evidence support this candidate. Local technical success does not establish hosted readiness. |
| CISO | Unconfirmed-data hiding and the current authority/session boundaries are maintained. Actual protected reads are separately evidenced; no security control exception or independent security closure is claimed. |
| Program & Delivery | Implementation and supplied local checks are complete; documentation binds them to this branch/base. Jose owns the next visual review. Final immutable candidate identity belongs in the external manifest after the parent's local commit. |
| Governance & Risk | GO for this local visual handoff only. Production release impact remains CONDITION: applicable release/independent evidence and separately explicit Jose authorization are still required. No material policy exception or risk acceptance is created by the local disposition. |

Chromium/WebKit viewport emulation does not certify physical devices or screen-reader behavior. Independent UI/QA/security and hosted production verification are outside the supplied evidence. Eight pre-existing Owner payroll-export findings remain open and are not self-closed here. Missing PRODUCT.md and incumbent design-document format drift remain pre-existing context work, rather than side effects to repair during this surface refinement. Any later source change creates a new candidate and requires affected evidence to be checked again.

## Handoff and release state

Owner: **Jose** for visual acceptance and any later production authorization. Branch: `codex/nevora-typeface-visual-refresh-20261010`. Review base: `2bb6a5057945c65db7dbb8620719aa130480493b`. At this documentation snapshot the six-file source candidate is uncommitted; the parent owns the verified local source/documentation commit and the external candidate manifest. This pass creates no commit, push, PR, merge or deployment. Existing development-line and release gates continue to apply.

Next gate: Jose reviews the [local preview](http://127.0.0.1:52202/manager-home/review.html). No additional design decision or policy exception is outstanding for the bounded refinement. Production work requires separately explicit authorization and its normal evidence gates.
