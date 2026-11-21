---
name: nevora-design-os
description: NEVORA's design operating system. Load for any NEVORA layout, typography, colour, component, copy or motion decision, and automatically whenever Jose presents a draft (a screenshot, mock, spec, route, diff or copy) for review, to run the Impeccable audit. Applies Apple HIG as the rulebook for targets, type scaling and colour accessibility, the Direction B tokens and kit as the design system, the NEVORA voice standard, and GSAP as the default for choreographed motion.
---

# NEVORA design operating system

Five standing rules. Each has a reference file; read the one the task needs.

| # | Standard | Reference |
|---|---|---|
| 1 | Apple Human Interface Guidelines are the rulebook for layout, tap targets, type scaling and colour accessibility | `references/apple-hig.md` |
| 2 | The design system: brand palette, type scale and font pairing, component library | `references/design-system.md` |
| 3 | Voice: plain, professional, no AI clichés, modelled on Google's developer documentation style guide | `references/voice.md` |
| 4 | The Impeccable audit runs on every draft Jose presents | `references/audit.md` |
| 5 | Motion: GSAP for choreographed motion, CSS tokens for state feedback | `references/motion-gsap.md` |

## Precedence

When two sources disagree, the higher one wins:

1. Jose's explicit instruction in the current conversation.
2. `DESIGN.MD` ("Current direction" first, then the dated refinement for that route) and `.21st/DESIGN.md`.
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

1. Follow `.claude/skills/nevora-ui-readiness/SKILL.md` for setup, scope and browser evidence.
2. Reuse a kit component before writing a new one (`references/design-system.md` lists them).
3. Use tokens, never raw hex, px sizes or durations that already have a token.
4. Write copy to `references/voice.md`. Payroll and legal copy stays exactly as approved.
5. Animate to `references/motion-gsap.md`, with a reduced-motion path for every animation.
6. Run the audit on your own result before reporting it.
