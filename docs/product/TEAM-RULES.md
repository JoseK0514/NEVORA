# NEVORA product team: shared rules

Every product-team agent reads this file before working. It holds what the
roles share; each agent's own file adds its role.

## Current direction (November 8, 2026): Direction B, everywhere

The single source of truth is the "Current direction" section of
[DESIGN.MD](../../DESIGN.MD). This summary must match it; if they ever differ,
DESIGN.MD wins and this file is the one to fix.

- **Every surface uses Direction B:** Owner, Manager, Employee and Lead on
  phones, tablets and desktop; sign-in, recovery, activation, billing, policy
  and error pages; and the Clocker kiosk. Jose approved it on Nov 5, 6 and 8,
  2026. Mocks are in [direction-b](direction-b/README.md).
- **Direction B in short:** a teal band (`#0C726C` to `#08504C`, action teal
  `#0B6E69`) carries the page title and its key figures; white 22px cards sit
  on the `#F2F5F4` canvas and overlap the band's lower edge. Inter throughout.
  Phosphor **bold** icons in tinted circles. Pills for actions and chips. 48px
  targets. Light only.
- **Status colours:** red stops you, amber means wait or check, green is done,
  teal is information. Neutral states are grey.
- **Tokens and kit:** `src/app/b-tokens.css` (`--b-*`) and
  `src/components/owner-b/b-kit.tsx`. New work reads those; it never declares
  its own palette. CSS follows the B8 layering rule in DESIGN.MD.
- **Signature and clean manager v3 are superseded** (October 20, 2026). Their
  tokens remain in the code as a base layer and as history. Do not build new
  screens with `--sig-*` tokens, the system font, the deep `#0D3634` band, the
  `#F7F6F3` sheet or regular-weight icons. The Nov 14, 2026 inspection found
  the billing pages built that way by mistake
  ([review-2026-11-14](review-2026-11-14/README.md), UI-2 and UI-3).
- Where an older line below disagrees with this section, this section wins.
  Superseded lines are marked, not deleted.

## What we are building

NEVORA Workforce is a scheduling, time, pay and workforce app for small and
medium businesses. It is sold to many companies, and Puerto Rico is its first
market (local labour rules and full Spanish set it apart).

- **Users:** Owners, managers and leads mostly on desktop; employees mostly on
  phones.
- **Platforms:** iOS and Android app stores, desktop web, mobile web and PWA.
- **Today:** a Next.js (App Router, React, TypeScript) PWA with a service worker
  (`public/fuel-portal-sw.js`). There is no native wrapper yet.
- **Current design:** Direction B for every surface (see the section above).
  `DESIGN.MD` starts with a "Current direction" section; its later sections
  and `.21st/DESIGN.md` are dated history.
  - *Superseded November 8, 2026:* "Signature for the employee app,
    sign-in/activation and the Clocker (SIGNATURE-SPEC.md); clean manager v3
    for Manager and Owner."
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
- Teal (`#0B6E69`) as the action colour. Status colours follow DESIGN.MD: red
  stops you, amber means wait or check, green is done, teal is information,
  grey is neutral.
  - *Open, Nov 14, 2026:* some Employee screens still show "approved" and
    "confirmed" in teal while Manager screens use green
    (review-2026-11-14, UI-9). Green for done is the documented rule; the
    Employee chips change when Jose confirms it.
  - *Superseded:* the Signature notes that named a deep `#0D3634` primary
    button, a `#A3271A` urgent red and "coral urgent".
- Phosphor for icons, **bold** weight.
  - *Superseded November 8, 2026:* "regular weight; fill only for the active
    tab".
- Inter for type on every surface. The code already renders Inter in the app,
  on sign-in and on the Clocker.
  - *Superseded November 8, 2026:* the October 20 note that the employee app,
    sign-in and Manager/Owner use the platform's system font.
- Targets of at least 44px, WCAG 2.2 AA, a visible focus ring, and reduced
  motion honoured.
- Company branding works only within the B1 contrast rules
  (`src/lib/workspace-presentation/derive.ts`).
  - *History (Signature, October 20, 2026):* the employee app and sign-in
    ignored the derived brand colours; the Clocker let a brand recolour its
    accent. DESIGN.MD's Direction B sections say how branding applies now.
- Payroll and legal copy stay exactly as approved. Jose approved the scope
  wording changes listed in review-2026-11-14 (section 7) on Nov 14, 2026;
  any further change still needs his sign-off, and counsel reads the lines
  about taxes.
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
