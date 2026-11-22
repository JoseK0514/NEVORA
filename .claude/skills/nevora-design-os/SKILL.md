---
name: nevora-design-os
description: NEVORA's design operating system. Load for any NEVORA layout, typography, colour, component, copy or motion decision, and automatically whenever Jose presents a draft (a screenshot, mock, spec, route, diff or copy) for review, to run the Impeccable audit. Applies Apple HIG as the rulebook for targets, type scaling and colour accessibility, the Direction B tokens and kit as the design system, the NEVORA voice standard, and GSAP as the default for choreographed motion.
---

# NEVORA design operating system

Shared by Claude and Codex. Codex reaches the same files through `.codex/skills/nevora-design-os/SKILL.md` and
`AGENTS.md`; edit the reference files here, once, so both agents keep working from the same rules.

Six standing rules. Each has a reference file; read the one the task needs.

| # | Standard | Reference |
|---|---|---|
| 1 | Apple Human Interface Guidelines are the rulebook for layout, tap targets, type scaling and colour accessibility | `references/apple-hig.md` |
| 2 | The design system: brand palette, type scale and font pairing, component library | `references/design-system.md` |
| 3 | Voice: plain, professional, no AI clichés, modelled on Google's developer documentation style guide | `references/voice.md` |
| 4 | The Impeccable audit runs on every draft Jose presents | `references/audit.md` |
| 5 | Motion: GSAP for choreographed motion, CSS tokens for state feedback | `references/motion-gsap.md` |
| 6 | Density (each fact once, two-line rows, three band figures, one main action per card) and how design choices are decided | `references/density.md` |

## Precedence

When two sources disagree, the higher one wins:

1. Jose's explicit instruction in the current conversation.
2. `DESIGN.MD` ("Current direction" first, then the dated refinement for that route) and `.21st/DESIGN.md`; for product
   copy, `docs/design/voice.md`.
3. The live tokens in `src/app/b-tokens.css` (they carry decisions newer than some DESIGN.MD prose, for example the
   10px button radius picked on Nov 21, 2026).
4. This skill's references, Apple HIG included.
5. Generic design skills and outside trends.

Apple HIG sets the floors: minimum target, minimum legible size, contrast, Dynamic Type behaviour and reduced motion.
NEVORA may exceed a floor (its 44px and 48px targets already do) but never go below one. HIG does not override the
NEVORA brand: no SF Pro swap, no iOS system blue, no stock iOS chrome.

This skill does not authorise a new palette, new fonts, a new icon family or a component-library swap. To change the
brand, Jose decides at a checkpoint (see `docs/product/README.md`), and DESIGN.MD is updated first.

## When Jose presents a draft

Run the audit in `references/audit.md` before anything else, without being asked. Report findings first, ranked by
severity, then offer fixes. Don't rewrite the draft unless Jose asks for changes.

## When building

1. Follow `.claude/skills/nevora-ui-readiness/SKILL.md` for setup, scope and browser evidence (Codex reads it as a
   plain file).
2. Reuse a kit component before writing a new one (`references/design-system.md` lists them).
3. Use tokens, never raw hex, px sizes or durations that already have a token.
4. Write product copy to `docs/design/voice.md`, everything else to `references/voice.md`. Payroll and legal copy
   stays exactly as approved.
5. Animate to `references/motion-gsap.md`, with a reduced-motion path for every animation.
6. Apply the density rules in `references/density.md`; take real design choices to Jose as 2–3 rendered options.
7. Run the audit on your own result before reporting it.

## Page done gate (Jose, Nov 22, 2026)

No page goes to Jose until all four hold. The page queue (https://claude.ai/artifact/5eoN27Lf33fN2zckaE8Y1y, mirrored in
the Reviewed column of `docs/product/page-inventory.md`) marks a page Finished only when Jose says so.

1. **Direction B for real.** Built from the existing Direction B screens and kit (`owner-b`, `employee-b`, `b-kit`, the
   Corp layers they restyle). When a role gets "the same screen as another role", reuse that screen's component with the
   role's data; never a look-alike assembled from generic parts.
2. **Jose's component picks** (`docs/design/component-picks.md`).
3. **Every line earns its place.** Each fact once; no line that is always true; no explanation of how the screen works;
   the place a person is working in is always visible, with a filter when they have more than one.
4. **Checked, with evidence.** 320, 390, 768, 1440 and 200% text, keyboard, axe, before and after, and the Impeccable
   audit in `references/audit.md`, reported in its format.
