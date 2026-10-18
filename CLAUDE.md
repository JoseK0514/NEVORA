# NEVORA UI readiness

This checkout is Jose's UI design and UI testing workspace. Start UI tasks with
the project skill `/nevora-ui-readiness` in `.claude/skills/nevora-ui-readiness/`.

Read `DESIGN.MD` and `.21st/DESIGN.md` before visual work. They contain the current
approved baseline and later refinements for specific routes and viewports.
Generic design skills are supporting references; they do not authorize changing
the established brand, layout, fonts, icon family, or workflow behavior.

Keep work scoped to the requested UI. Preserve existing edits and inspect git
status before changing files. Use an isolated worktree when the checkout is busy.
Keep server behavior and data contracts intact. Test with local fictional data;
do not use production credentials or send real notifications as a test.

Inspect `package.json` before running scripts. `npm run dev` starts Next.js;
`/ui-preview/home` is an existing fictional Home preview with no database or
session dependency. This is a UI preview, not proof of live operational flows.

Use real browser evidence for desktop, mobile, keyboard/focus, reduced motion,
and relevant loading/error/empty/success states. Report checks actually run and
any gaps. Keep production deployment, publishing, and paid generation subject to
Jose's explicit authorization.

UI-only setup notes: `.claude/UI-SETUP.md`.

## Product team agents

Eight role agents live in `.claude/agents/`: `ux-researcher`,
`market-strategist-pm`, `product-designer`, `product-manager`, `ux-designer`,
`ui-designer`, `ui-ux-designer` and `ui-engineer`. They share
`docs/product/TEAM-RULES.md` (goals, trust rule, constants, safety, and the
trend-and-trust scorecard) and write their outputs under `docs/product/`.

A cycle runs discovery, then direction, then design, then build, then review,
with Jose's checkpoints after direction, specs and build (see
`docs/product/README.md`). Research and design agents don't change app code.
The UI engineer works in a worktree and never commits.
