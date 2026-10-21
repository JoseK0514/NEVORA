# NEVORA product team: shared rules

Every product-team agent reads this file before working. It holds what the
roles share; each agent's own file adds its role.

## Current direction (October 20, 2026)

- **Employee app, sign-in/activation and the Clocker use Signature**, approved
  by Jose on October 20, 2026. The written source of truth is
  [specs/employee-style/signature/SIGNATURE-SPEC.md](specs/employee-style/signature/SIGNATURE-SPEC.md).
  Shared values live in `src/components/signature/tokens.css` (`--sig-*`).
  Pages read those tokens; they never declare their own palette.
- **Manager and Owner keep clean manager v3** (the Wave A v3 light mockups,
  [specs/clean-manager/spec.md](specs/clean-manager/spec.md)). Moving them to
  the Signature neutrals is a later step.
- **Signature in short:** a deep band (`#0D3634`) with the Λ mark carries the
  page's key fact; a soft-white sheet (`#F7F6F3`) with 28px top corners holds
  white 22px cards. One message per card. No glass. Phosphor regular icons,
  fill only for the active tab. No illustration on Home.
- **Open decisions for Jose** (SIGNATURE-SPEC.md section 17): teal or green
  for "done"; a 300 display-weight floor; system font or Inter everywhere; how
  company branding appears in Signature; ink or teal links; button radius 16
  or 14; band headline weight; press scale and duration; `/reset-access` still
  on the old ivory colours; 11px caps.
- Where an older line below disagrees with this section for those surfaces,
  this section wins. Superseded lines are marked, not deleted.

## What we are building

NEVORA Workforce is a scheduling, time, pay and workforce app for small and
medium businesses. It is sold to many companies, and Puerto Rico is its first
market (local labour rules and full Spanish set it apart).

- **Users:** Owners, managers and leads mostly on desktop; employees mostly on
  phones.
- **Platforms:** iOS and Android app stores, desktop web, mobile web and PWA.
- **Today:** a Next.js (App Router, React, TypeScript) PWA with a service worker
  (`public/fuel-portal-sw.js`). There is no native wrapper yet.
- **Current design:** Signature for the employee app, sign-in/activation and
  the Clocker (SIGNATURE-SPEC.md); clean manager v3 for Manager and Owner.
  `DESIGN.MD` starts with a "Current direction" section; its later sections
  and `.21st/DESIGN.md` are dated history.
  - *Superseded October 20, 2026:* "a Gusto-style teal system, documented in
    `DESIGN.MD` and `.21st/DESIGN.md`". The Gusto tokens remain only as the base
    layer and the B1 brand default.

## Goals

1. **Meet user expectations:** feel as fast, modern and easy as the apps people
   use every day (Instagram, Uber, Airbnb).
2. **Reduce time-to-learn:** use familiar patterns (search placement, bottom
   sheets, swipe actions, standard navigation) so no tutorial is needed.
3. **Win against competitors:** a fresher look and smoother experience than
   older workforce tools.
4. **Adopt better technology** where it helps people: AI assistance, voice,
   offline, passkeys, better displays. It must stay accessible.

## Avoid

- **Trend chasing:** style over substance, such as ultra-light fonts or
  low-contrast colours.
  - Signature uses weight 200 on some large figures today. A 300 floor is a
    decision for Jose (SIGNATURE-SPEC.md, D2); do not add new 200 text.
- **Alienating users:** drastic changes that break muscle memory (the
  "Snapchat redesign" effect).
- **Uniformity:** generic minimalism, stock corporate illustrations, pastel
  gradients that erase the brand.
- **Short-lived fads:** for example hyper-real 3D or heavy gradients.
- **High technical debt:** animation or layout that is costly to build, slow or
  hard to maintain.

## Trust is the overriding rule

This app handles pay and personal data. It must never look experimental,
chaotic or trendy. If a choice could make someone wonder whether the app is
safe, do not make it.

## Constants that do not change

- The NEVORA wordmark.
- Teal as the action colour; status labels use the ladder: grey neutral or
  waiting, amber to review, green done, coral urgent.
  - *Signature today (October 20, 2026):* the action teal is `#0B6E69`
    (`--sig-action`) and the primary button fill is deep `#0D3634`. The urgent
    red is `#A3271A`. The employee app currently shows "done/approved" in teal
    (`#0A5753` on `#E2F1ED`), which breaks this ladder; teal or green for done
    is a decision for Jose (SIGNATURE-SPEC.md, D1).
- Phosphor for icons (regular weight; fill only for the active tab).
- Type: *superseded October 20, 2026:* "Inter for type". Today the employee
  app, sign-in and Manager/Owner use the platform's system font; the Clocker
  and PIN setup bundle Inter. One typeface everywhere is a decision for Jose
  (SIGNATURE-SPEC.md, D3). Until then, keep each surface on the font it uses.
- Targets of at least 44px, WCAG 2.2 AA, a visible focus ring, and reduced
  motion honoured.
- Company branding works only within the B1 contrast rules
  (`src/lib/workspace-presentation/derive.ts`).
  - *Signature today:* the employee app and sign-in ignore the derived brand
    colours; the Clocker lets a brand recolour its accent but never the deep
    side. How branding appears in Signature is a decision for Jose
    (SIGNATURE-SPEC.md, D4). The band is never recoloured.
- Payroll and legal copy stay exactly as approved.
- The navigation structure and key action names stay. A move or rename needs a
  stated reason and a migration note (for example, an old location that still
  works).

## Safety

- **Fictional data only.** Never use production credentials or send real
  email, SMS or push notifications.
- **Never** deploy, publish, push or commit. Commits happen only when Jose
  approves, through the main session.
- **21st.dev:** search and get_component only. Never generate.
- **No paid generation** without Jose's approval.
- Keep server behaviour and data contracts intact unless a phase is explicitly
  approved to change them.

## How to work

- **Cite evidence for every claim:** a file and line, a screenshot path, a
  Mobbin link, or a source URL with its date.
- **Write findings, not essays.** Short headings, tables and bullets, in plain
  language.
- **Cover every platform.** Each proposal says how it behaves on iOS, Android,
  desktop web, mobile web and PWA (safe areas, back gesture, keyboard,
  offline).
- **Research and design roles** read the codebase but write only under
  `docs/product/`. The UI Engineer writes code only in an isolated worktree.
- **The fictional preview:** run it the way `CLAUDE.md` and `.claude/UI-SETUP.md`
  describe. Current access details are in `.claude/preview-access.md`; never
  repeat passwords in your output.
- **Skills:** most skills your role lists are personal skills set up as manual
  commands, so the Skill tool may not offer them. If the Skill tool doesn't list
  a skill, read its instructions directly at
  `~/.claude/skills/<name>/SKILL.md` (and any references it points to) and
  follow them. Use any other installed skill that genuinely helps. If a skill
  doesn't exist at all, say so and use the closest local one.
- **Writing:** before you finish a written deliverable, run the
  `anthropic-skills:stop-slop` skill over it so it reads plainly, with no filler
  and no predictable AI phrasing.

## Trend-and-trust scorecard

Every proposal is scored 0 to 2 on each line. It needs at least 12 of 16 to go
ahead, and a 0 on Trust, Accessibility or Usability blocks it.

| Line | Question |
|---|---|
| Usability | Does it make a real task faster or clearer? |
| Familiarity | Does it use a pattern people already know? |
| Trust | Does it look calm, safe and finished? |
| Accessibility | Does it meet contrast, targets, focus, reduced motion and screen readers? |
| Brand distinctiveness | Does it still look like NEVORA, not generic? |
| Durability | Will it still look right in three years? |
| Cost | Can it be built and maintained without high technical debt? |
| Continuity | Do existing users keep their muscle memory? |
