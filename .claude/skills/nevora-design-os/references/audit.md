# The Impeccable audit

Run this automatically whenever Jose presents a draft: a screenshot, mock, spec, route, component, diff or copy. Also
run it on your own UI work before reporting it. It is a review: don't edit files unless Jose asks.

## Inputs

1. Identify the surface: route, role (Owner, Manager, Lead, Employee, Clocker, public), viewport and state shown.
2. Read the matching DESIGN.MD section (Current direction, then the dated refinement for that route).
3. For a live route, render it (see `.claude/skills/nevora-ui-readiness/SKILL.md`): 320, 390, 768 and 1440px widths, as
   applicable. For a
   static image, audit what is visible and list what can't be judged from an image (focus order, motion, screen
   reader output).

## The four lenses

### 1. Hierarchy

- One clear focal point per screen; the band title and key figures read first.
- One teal primary action per screen; secondary actions are surface or ghost buttons.
- Type steps follow the eight roles; no ad-hoc sizes; weight and size, not colour alone, separate levels.
- Grouping matches meaning: related items share a card; unrelated items don't.
- Scanning order matches the task order. The most frequent action is the easiest to reach (thumb zone on phones).

### 2. Spacing and alignment

- Every gap is on the spacing scale (2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
- Insets: 14 phone gutter, 18 card and row, 22 wide card. Edges align across cards.
- Space inside a group is smaller than space between groups.
- Nothing overflows, clips or wraps badly at 320px, at 200% text size, or with long names and large numbers.
- Radius, elevation and icon sizes use the tokens for their role.

### 3. Accessibility (Apple HIG floors plus WCAG 2.2 AA)

- Text contrast 4.5:1 (3:1 for 18.66px bold / 24px regular and up). Non-text UI and field edges 3:1. Check on the real
  background: white, canvas, tints, glass on the band.
- Hit targets 44×44 minimum, 48 on touch tablets and footer actions; 8px between adjacent targets.
- Text scales with the reader's setting (rem roles); layout survives 200%.
- Colour is never the only cue: status has words; links are distinguishable without colour.
- Visible focus ring (2px teal, 2px offset; white on the band) on every interactive element; logical tab order; focus
  lands sensibly after dialogs, sheets and route changes.
- Names and roles: icon buttons have labels; form fields have visible labels and linked errors; live updates announce.
- Motion respects `prefers-reduced-motion`; nothing flashes more than 3 times a second.

### 4. States

Every data surface needs all of these, designed, not left to defaults:

- **Empty:** says why it's empty and gives the next step (`docs/design/voice.md`, "Empty states"). First-run empty differs from filtered empty
  ("No results for 'Ana'. Clear the search").
- **Loading:** skeleton shaped like the content (`BLoadingScreen`, shimmer after 300ms), no layout jump on arrival.
- **Error:** what happened, what to do, a retry that keeps the person's input; offline keeps what loaded (`BOffline`).
- **Success:** confirms the result in place (`BDoneMark`, toast) and says what happens next where relevant.
- **Partial and edge:** one item, many items, long text, zero values, permission-limited view, disabled with a reason.

Copy is checked against `docs/design/voice.md` (product strings, English and Spanish, including its "Before you ship a
string" checklist) and the cliché ban in `voice.md`, in every lens.

This audit is the working design review either agent runs on a draft. It doesn't replace the independent UI
certification in `.codex/skills/nevora-independent-ui-oversight/`, which reports to Jose separately.

## Report format

```
Impeccable audit: <surface> (<role>, <viewport(s)>, <state>)
Checked: <what was rendered or viewed, and how>

Blocking
1. [Accessibility] <location>: <issue>. <why it matters>. Fix: <specific change with token or component>.

Should fix
2. [Spacing] ...

Polish
3. [Hierarchy] ...

States: Empty ✓/✗ · Loading ✓/✗ · Error ✓/✗ · Success ✓/✗ · Edge ✓/✗
Not checked: <items, with reason>
```

Severity: **Blocking** fails an HIG or WCAG floor, breaks a flow, or contradicts DESIGN.MD. **Should fix** is a clear
inconsistency or missing state. **Polish** is refinement. If nothing is wrong in a lens, say so in one line.
