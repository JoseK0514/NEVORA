---
name: nevora-ui-readiness
description: Design, polish, implement, or test UI in the NEVORA UI readiness checkout. Follow its current DESIGN.MD and route-specific responsive refinements, preserve established behavior, and verify the rendered result.
---

# NEVORA UI design and testing

## Establish the current surface

1. Confirm the repository, branch, git status, requested routes, user roles, and
   target viewports. Preserve all existing work.
2. Read `DESIGN.MD`, `.21st/DESIGN.md`, `.21st/design.json` when present, and the
   affected components and CSS. Later route-specific approved refinements within
   the design documents govern those routes. Do not replace them with an older
   blanket palette or a generic design skill's preferred style.
3. Inspect the actual rendered interface and available approved screenshots or
   local reference assets. Screenshots are evidence, not background page images.
4. Read `package.json` before installing packages or running build/start scripts.
   Do not copy credentials from another checkout.

## Product team

For larger UI work (new features, redesigns, trend or competitor reviews), use
the role agents in `.claude/agents/` and the cycle in `docs/product/README.md`.
Every proposal passes the trend-and-trust scorecard in
`docs/product/TEAM-RULES.md`.

## Use a small relevant selection of skills

Personal skills are under `~/.claude/skills/`; load only those needed now:

- Consistency: `design-system-enforcer`, `premium-ui-layout`,
  `premium-ui-typography`, `ui-ux-pro-max`.
- Interaction and motion: `emil-design-eng`, `make-interfaces-feel-better`,
  `review-animations`, `apple-design`, `premium-ui-interactions`.
- Mobile: `responsive-web-fixer`, `mobile-native`, `mobile-design`.
- Verification: `playwright`, `browser-smoke-test`, `premium-ui-qa`,
  `visual-regression-reviewer`, `accessibility-ui-expert`, `screen-reader-testing`.
- Larger design exploration, only when requested: `impeccable`,
  `frontend-design`, `frontend-design-premium`, `superdesign`.

Some transferred skills are manual commands to keep competing aesthetic
directions from loading automatically. Type their slash command or read the
specific `SKILL.md` when relevant. A local skill is not an authenticated plugin.
21st and Superdesign require their own CLI/service readiness; use their help or
read-only status first. Do not invoke metered generation without budget approval.
Figma, Mobbin search, and image generation are not configured by copying skills.

## Implement within the approved system

Reuse existing components, CSS tokens, local Inter/JetBrains Mono fonts,
Phosphor icons, official NEVORA assets, role-owned navigation, motion, and reduced
motion behavior. Preserve backend contracts, authorization, calculations,
mutation handlers, and private-data clearing. Make the smallest change that
solves the requested visual or interaction problem.

Use `.21st` design context as local evidence. Do not initialize a new theme,
replace the component library, add ornamental media, or rewrite unrelated pages
because a general-purpose skill suggests it.

## Verify with local evidence

The existing `/ui-preview/home` is a fictional-data page without a database or
session dependency. Use it for Home design previews. Other flows need their
actual owned fixtures; do not invent success states for unavailable services.

Capture before/after evidence for the affected surface at 320px and 390px phone
widths, an intermediate breakpoint, and 1440px desktop when applicable. Exercise
keyboard order, visible focus, dialogs/sheets and dismissal, text wrapping,
overflow, 44px targets, contrast, reduced motion, and loading/error/empty/success
states. Use the installed Playwright CLI skill or available native browser tools.
Never claim screen-reader coverage from source inspection alone.

Report what changed, file locations, checks actually run and their results,
remaining gaps, and branch/commit/preview state. Local UI work does not authorize
a production release, real customer-data changes, or real email/SMS tests.
