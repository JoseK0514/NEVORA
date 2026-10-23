# Independent UI closure — cb115c2a

**UI recommendation: GO WITH CONDITIONS, scoped to the locally observed confirmation UI. The preparing-layout blocker is independently CLOSED on cb115c2a1b07f92d918c7323894a4b3e0b0c623c.** Historical cloud QA-AT01/QA-AT02 cause and broader release acceptance are separate and are not closed by this report.

## Independent execution and evidence

I ran12bounded cells: Chromium and WebKit,320/390/1440CSS-pixel widths,100%/200% root text size. Actual EmployeeMySchedule rendered server-side with fictional props; the actual confirmation hydrated inside its existing action container. The complete root/app/schedule stylesheet cascade and relevant shell attributes were included. CSS-module mapping preserves app substring selectors. The router/action are declared fictional boundaries. No Next server, PostgreSQL, real user data, or provider was invoked in this fixture.

All12functional cells passed. A separate geometry evaluator passed all12; I personally inspected preparing/ready/keyboard screenshots at narrow large-text, ordinary mobile and desktop sizes. The same evaluator rejects6of8retained c048complete-cascade cells, preserving a discriminating red result. This red evaluation uses captured real geometry; it is not a new historical browser run.

**VERIFIED — readiness and interaction.** With real React scheduler delivery held, preparing status is visible while command fields and control are absent. Releasing delivery produces an armed listener and original intent without autofocus or command submission. Native Tab in Chromium and macOS Alt+Tab in WebKit reach a visible focus outline; Enter invokes the fictional action once. Explicit unavailable response keeps the original operation and retry UI. Armed pagehide removes authority. The fixture records no page, console or hydration errors and0external browser requests.

**VERIFIED — visual correction.** Copy/action rectangles and their text stay within the card and viewport with no intersection. All12cells measure exactly0px card-height change and0px movement of following document content between preparing and ready. Actual button height is44px in all profiles. Both engines produce the following card heights:

| width |100% text |200% text |
|---:|---:|---:|
|320|133px|290px|
|390|133px|250px|
|1440|78px|210px|

At320/200%, copy/action allocations are252px rather than the previous zero-width copy. The preparing message wraps to two readable lines and the button appears inside the reserved slot without moving the card. At1440/100%, copy and action remain side-by-side; large text wraps the sections when needed. The status uses quiet neutral text, does not impersonate an active confirmation, creates no focus stop, and requires no extra spinner or motion.

The unchanged c048 report remains NO-GO in `reviews/ui-attention-c048d26b-acceptance.md`. That candidate's final complete-cascade evidence showed20px mobile layout shift plus overlap/clipping. Earlier incomplete-cascade41px/scrollWidth360measurements are preserved with their limits and are superseded, not silently rewritten. The cb115fixture also removes the earlier fixture-only hydration wrapper so the new production direct-child width rule is assessed faithfully.

## Conditions and limits

- This is actual-component/actual-parent SSR UI verification, not a new full Next/PostgreSQL run. QA's14-cell c048full-app run and its screenshots were inspected as contextual evidence; they do not certify cb115or a later merged source.
-200% means root font-size simulation16→32px with actual rem-based styles, not OS text settings, physical devices, screen readers or browser zoom. No system preferences changed.
- Parent effects outside the confirmation are not hydrated; shell navigation is scaffolded. Captures outside the review card are context, not acceptance of every schedule feature.
- The lifecycle gate prevents pre-ready form interaction. It does not establish the cause of the historical cloud event, replay every pre-subscription event, remove serialized RSC props, or replace authorization. Existing independent lifecycle/hidden/rearm evidence belongs to its named QA reports.
- Revalidate the affected visual scope if a later base merge changes the cascade or tokens. This closure is pinned to cb115.

## Durable handoff and runtime closure

`ui-readiness-cb115c2a/README.md` contains exact executed commands and reusable inputs. Preserved sources: `parent-ui-control.mjs`, `native-controls.js`, historical `baseline-confirmation.tsx`, and `geometry-acceptance.mjs`. Raw artifacts: `ui-report.json`, `geometry-acceptance.json`, full/card screenshots, `run.log`, `custody.json`, and `readiness-manual-qa.md`.

Both commands exited0. Every browser/context and loopback server closed; source custody checked unchanged at runtime closure. No source, test, index or HEAD edit was made by this reviewer. All UI runtimes are CLOSED; no further runtime is pending from this acceptance pass.
