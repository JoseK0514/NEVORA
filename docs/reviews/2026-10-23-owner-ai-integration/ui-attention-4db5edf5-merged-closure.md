# Independent merged-source UI acceptance

**UI recommendation: GO WITH CONDITIONS for the locally observed confirmation UI at `4db5edf5ec4eac073cca83d586726656bc7f5f21`. The preparing-layout correction remains accepted after the development merge.** This is independent acceptance of the bounded surface below, not publication approval or closure of historical cloud QA-AT01/QA-AT02 causality.

## Source and cascade assessment

The clean merge has parents cb115c2a and e37d08e3 and tree `73748af78a057413c4b40b341319d43f6d02b980`. The incoming development delta changes 26 files, principally theme colors. The schedule module replaces four existing color expressions for selected rows, today's date and row/disclosure hover with Signature tokens. The corrected review wrapping, responsive action allocation and reserved confirmation slot remain intact. No confirmation component behavior changes in this merge.

The new dark tokens apply under `html[data-theme=dark]` to the employee/Signature scope. Changes in shared employee frame styles, dark sidebar/mobile navigation and Profile calendar rules warrant theme checks; their presence does not establish that those unrelated interactive surfaces pass. Reset access adds the auth Signature stylesheet, outside the schedule route's import graph. This leaf fixture does not certify that route or SPA route-order interactions.

## Independently reproduced evidence

I executed 16 browser cases: Chromium and WebKit, light and dark, each at 320 CSS px with 100% and 200% root text, 390 with 200%, and 1440 with 100%. This bounded selection exercises the original normal-mobile layout shift, both enlarged-mobile overflow cases and desktop side-by-side placement. The earlier 12-profile cb115 report remains attributed to that source.

The fixture renders actual EmployeeMySchedule SSR and hydrates the actual confirmation in its existing action container. It includes the complete root/app/schedule stylesheet import sequence, relevant shell attributes, and module-name mapping that preserves app substring selectors. Theme is present on the served HTML before paint. Router and action are explicitly fictional; only confirmation hydrates. No Next server, database, customer data or provider is used.

**VERIFIED — geometry.** All 16 functional runs and all 16 separate, unchanged geometry evaluations pass. Each case measures exactly **0px** preparation-to-ready card-height change and following-document movement. Copy/action text is contained without overlap or zero-width copy. The actual confirmation target is **44px** high. Card heights in both themes and engines are 133px at 320/100%, 290px at 320/200%, 250px at 390/200%, and 78px at 1440/100%.

**VERIFIED — interaction and states.** With real React scheduler delivery held, preparation is visible while command fields and the button are absent. Releasing delivery arms the lifecycle listener before the form appears, without autofocus or submission. Native Tab in Chromium and Alt+Tab under the existing macOS WebKit preference reach the visible focus ring; Enter invokes the fictional action once. The explicit unavailable response displays retry copy and retains the same operation. Armed pagehide removes authority. No system preference was changed.

**VERIFIED — observed light/dark presentation.** I inspected genuine card screenshots covering narrow enlarged preparation, keyboard focus, unavailable feedback and desktop placement in both themes/engines. Preparation is quiet supporting text; the ready action is visually distinct, and the focus ring remains visible against the card. Captured computed-color contrast observations are: status/error text 6.185:1 light and 10.068:1 dark; button text 13.171:1 light and 12.582:1 dark; 2px focus outline against the card 17.269:1 light and 13.879:1 dark. These are local confirmation measurements, not an app-wide accessibility certification.

**VERIFIED — custody and closure.** Both actual browser commands and both geometry commands exited 0. All 16 cells report no page, console or hydration errors and zero external browser requests. Every context/browser and loopback server closed; exact-source guards passed. Source was clean and unchanged at runtime closure. No repository source, test, index or HEAD edit was made by this reviewer. Parent was promptly notified CLOSED; no UI runtime remains active.

## Conditions and unresolved scope

- This is actual-parent/component SSR verification, not a fresh full Next/PostgreSQL acceptance run on the merge. Shell navigation is scaffolded; parent effects outside confirmation are not hydrated.
- Root text sizing is 16→32px simulation, not a physical device, OS text preference, screen reader or browser-zoom claim.
- Selected-row/today/hover changes elsewhere in the schedule, live sidebar/mobile navigation, Profile, reset access and the other PR28 screens are outside this card acceptance. The fictional fixture has no selected row, and its off-day rule overrides today's date color. Their merge acceptance must rely on separately scoped real-surface evidence; source inspection alone is not PASS.
- Historical cloud failures, authorization, RSC serialization and other lifecycle scenarios retain their own independent reports. A green leaf control does not establish historical transport/hydration causality.
- Source inventory/branch retirement and publication gates remain external blockers. This UI recommendation supplies no waiver, deletion or remote-action authorization.

## Durable evidence

External evidence root: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/ui-readiness-4db5edf5/`.

`README.md` preserves exact commands and scope. `readiness-manual-qa.md` contains the surface/adversarial/artifact matrix. `custody.json` records pinned source and nonempty artifact hashes. Each theme directory retains the actual-parent harness, native controls, historical baseline copy, unchanged geometry evaluator, SSR output, browser action/geometry JSON, logs and full/card screenshots. `contrast-observations.json` records computed-color observations. Original failed c048 and accepted cb115 reports/evidence remain unchanged.
