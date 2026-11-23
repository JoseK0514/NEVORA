---
name: nevora-design-os
description: >
  NEVORA's shared design operating system for Codex and Claude. Use for any NEVORA layout, typography, colour,
  component, copy or motion decision, and whenever Jose presents a draft (screenshot, mock, spec, route, diff or copy)
  for review, to run the Impeccable audit first. Covers Apple HIG floors, Direction B tokens and kit components, the
  writing standard, and GSAP motion.
---

# NEVORA design operating system (Codex entry point)

Claude and Codex share one copy of this standard. The source files live in `.claude/skills/nevora-design-os/`; read
them from there and don't copy them here, so both agents keep the same rules.

1. Read `.claude/skills/nevora-design-os/SKILL.md` for precedence and the build steps.
2. Then read the reference the task needs:
   - Apple HIG floors for layout, targets, type scaling, colour accessibility and motion:
     `.claude/skills/nevora-design-os/references/apple-hig.md`
   - Palette, type roles, Inter + JetBrains Mono, spacing, components:
     `.claude/skills/nevora-design-os/references/design-system.md`
   - Writing: `docs/design/voice.md` for product copy (English and Spanish), plus
     `.claude/skills/nevora-design-os/references/voice.md` for the cliché ban and for specs, docs and reports
   - The Impeccable audit (hierarchy, spacing, accessibility, states): `.claude/skills/nevora-design-os/references/audit.md`
   - GSAP motion and reduced motion: `.claude/skills/nevora-design-os/references/motion-gsap.md`
   - Density rules and how design choices are decided: `.claude/skills/nevora-design-os/references/density.md`

Precedence: Jose's instruction in the conversation, then `DESIGN.MD` and `docs/design/voice.md`, then
`src/app/b-tokens.css`, then this standard, then generic design guidance. It doesn't authorise brand, font, icon or
component-library changes, and it doesn't replace the executive operating model or the independent UI and QA
oversight skills in `AGENTS.md`.
