# NEVORA premium UI plan (Nov 11, 2026)

## Context

Development (Codex's backend delivery, 101 commits) is merged into `claude-codex-collab-nevora`
(f3c4a889; type check clean, 2,751 tests pass). A full inspection then found two kinds of work:

- **21 backend capabilities the screens don't use yet** (Codex delivered them; the UI still shows the old behaviour).
- **About 170 visual findings** from seven reviews (Owner 39, Manager 17, Employee and Lead 34, tablets 19,
  signed-out pages 37, design system 24), plus the Clocker and missed-pages review, still running.

Jose's goal: a UI that is premium, organized, clean and enjoyable, that anyone can understand, on every
profile. He approved implementing all findings, plus three decisions: Employee ID + PIN on the kiosk with
the tablet keyboard for the ID; the real lockout time shown as a clock time, naming who is paused; and
"Not clocked in" / "Clocked in late" / "Missed" as the attendance words.

The reviews agree on one thing: most findings are symptoms of a few system gaps (five button families,
three row patterns, nine state patterns, 46 text sizes, no shared desktop frame). So the plan fixes the
**system first**, then the screens, so each screen fix is small and stays consistent.

Evidence and findings: `/tmp/claude-0/-home-user-NEVORA/ba230c46-874b-534f-947b-ce83af13944a/scratchpad/inspect2/`
(`review-*.json`, `review-*.md`, `backend-gaps.md`, screenshots per role). Step 0 saves them in the repo.

## How the skills are used

Installed here: `tastemaker`, `better-typography`, `better-colors`, `better-layout`, `better-ui`,
`better-writing`, `better-interface`, `better-accessibility`, `ui-ux-pro-max`. The other names Jose listed
(emil-design-eng, minimalist-ui, high-end-visual-design, spacing-system, icon-system, motion-system,
loading-states, peak-end-rule, critique-*, mobile-native, …) are not installed in this workspace; their
principles are applied directly, under the skill that owns the same ground.

| Skill (and the listed principles it covers) | Where it governs | What it decides |
|---|---|---|
| **better-typography** (typography-scale) | Phase 1 type roles; every phase | 8 type roles, tabular numbers, text-wrap, no half-step neighbours |
| **better-layout** (spacing-system, critique-composition) | Phase 1 spacing; Phase 2 frame; Phases 3–6 | 4-based spacing, one desktop frame, shared edges, tablet rules |
| **better-colors** (color-system) | Phase 1 tokens | 10 neutrals, 4 status ramps, measured contrast (fix the 6 failing pairs) |
| **better-ui** (icon-system, motion-system, animation-principles, micro-interaction-spec) | Phase 1 radius/elevation/icons/motion; Phase 7 | concentric radius, shadows, bold icons, press .96 / 150ms / enter 300ms, reduced motion |
| **better-writing** (ux-writing) | Phases 3–6 copy | row titles that state the fact, one vocabulary, error = what happened + next step, EN/ES |
| **better-accessibility** | every phase gate | 44–48px targets, focus, names, reduced motion, contrast |
| **better-interface** (design-system-enforcer) | review gate after each phase | one combined check across the six better-* skills |
| **tastemaker** (high-end-visual-design, aesthetic-usability, critique-visual-hierarchy, critique-information-density, minimalist-ui) | Phase 2 patterns; final gate | one primary action per screen, hierarchy, density, "does it have taste" verdict |
| **ui-ux-pro-max** (mobile-native, loading-states, peak-end-rule, interfaces-that-feel) | Phases 4–7 | phone feel, state design, success moments |
| **/engineering:debug** | only if a phase finds a real defect | reproduce, isolate, fix (e.g. the Notifications "didn't load" timing) |

Every build agent is told which skills to load for its phase and must cite the rule behind each change.

## Phases

Each phase: build in an isolated worktree, save as a patch, apply with `git apply --3way`, verify, commit,
push. Phases 3–6 run in parallel only where their files don't overlap (same method as the review batches).

### Step 0. Save the inspection in the repo
`docs/product/review-2026-11-11/`: README, one merged `findings.json` (de-duplicated, with ids OW/MG/EM/TB/PB/CK/XP/SY/BE),
the review notes, `backend-gaps.md`, and `status.json` to track each finding to done. Record the three decisions.

### Phase 1. Foundation: one design system (SY findings)
Tokens in `src/app/b-tokens.css`, rules in `src/app/app/b-foundation.css` (inside `@layer nv-b`, per the B8 rule),
kit in `src/components/owner-b/b-kit.tsx`. No screen redesign here; the look tightens everywhere at once.

- **Type:** 8 roles (display 30/36, figure 24/30, title 20/26, title-sm 17/22, body 15.5/22, body-sm 14.5/20,
  meta 13.5/18, caption 12.5/16); fold 13px/15px and the 19/21px line-heights; tabular numbers on all figures.
- **Spacing:** 2/4/8/12/16/20/24/32/40/48/64; 14/18/22 kept only as the three named insets.
- **Colour:** token table; 396 token-equal literals become tokens; 17 near-identical greys fold; fix the failing
  contrast pairs (row chevron, amber solid, grey on tints, white .86 on glass, coral dot).
- **Radius and elevation:** pill 999, card 22, field 14, small 10; three elevations plus one for the band; one shadow colour.
- **Icons:** bold everywhere (291 legacy icons draw thin). One wrapper so `dist/ssr` icons take the weight; sizes 16/18/20/22; circles 28/36/40/48.
- **Buttons:** one set (primary, secondary/tinted, quiet, danger, text, white and glass on the band; 48/40/32 with 44px hit areas).
  Bring `c-btn`, `q-btn`, `q-bs`, `nv-btn` and the auth buttons onto it (`nv-btn` is still a square rectangle).
- **Rows:** one row (64px with a sub-line, 56px without; 36px lead slot; title, one sub-line, fixed trailing zone, chevron).
- **States:** `BState` and `BLoadingScreen` for every empty, loading, error, offline and closed state; retire `c-empty`, `q-empty`,
  `EmptyState`, `wc-skeleton` under Direction B.
- **Motion tokens:** 150ms press/hover/exit, 300ms enter, ease-out; gate the press scale behind reduced motion (`b-foundation.css:180`).
- **One formatter set:** extend `src/lib/duration-format.ts` with time range, date range and relative time; every screen reads them
  (fixes "447 h vs 446.5 h" and the six duration formats).

Gate: pixel diff of every role before/after; every change must trace to a token decision. Update `DESIGN.MD`.

### Phase 2. Shared patterns
- **One primary action per screen:** list rows use the tinted pill and a text button (Approve/Decline, Pick up, Review);
  filled teal is kept for the page's one action.
- **One desktop and tablet frame:** three band heights, one title position, one right edge for band actions, one content width
  rule (list pages with a right rail, forms capped at 560px, reading at 812px). Fixes the eleven band heights and dead areas.
- **Tablet rail:** a label under each icon (80px rail), filled current icon, one badge style.
- **Offline, error, loading:** designed once (no banner splitting the band, no repeated "Try again", real skeletons).
- **Vocabulary:** Waiting; Not clocked in / Clocked in late / Missed; Needs review; counts that agree across Home, Timecards and Things to do.

### Phase 3. Owner and Manager screens (OW, MG, XP findings)
Home (row titles state the fact; counts agree; overdue payroll on the phone via `payrollStatus`), Things to do, Schedule
(coverage as one line; squeezed tablet grid), Timecards (Codex's extra note folded into one line; "You" chip and own card out
of a Manager's count), Payroll (one Prepare; desktop matches the phone), Requests, Team and a person's page (Today / This week
from `readOperationalEmployeeHours`), Notifications, Settings sub-pages, Manager closed pages (state card + "your part is…"
with a next step), swap rows naming the other person (`counterpartName`), policy shown once (`policy`), Owner tag in hours (`role`),
Remind buttons on Availability and Updates (`src/lib/manager-reminders/README.md`).

### Phase 4. Employee and Lead screens (EM findings)
Home (required to-dos first; hero figures on one line), Schedule (one primary; confirmed time from `acknowledgedAt`),
Pay (a "Statement ready" chip and a real button), Notifications (titles that say what happened, using the server `subject`),
Pick up and swap (tab counts from `exchangeCounts`), Time, Requests, Availability (unclip the desktop header, my regression),
desktop widths and holes, Lead rows ("You lead all N" once).

### Phase 5. Signed-out pages (PB findings)
New-account journey (title "Set up your account", show whose account, prefill the ID after setting a password, a success mark);
password reset (a real "check your email" at every width, wrong-password message with a next step, QR and copy link for assisted
recovery); session-ended note with return; Spanish for Support and Account deletion, language switch on the policies;
**home page option A**: sign-in as the front door (proof points, "New here? Set up your account", Employee ID help, Spanish by browser).

### Phase 6. Clocker (CK findings and the approved decisions)
Employee ID + PIN step (ID field with the tablet keyboard and auto-capitals, then the number pad; `{action:"verify",employeeId,pin}`),
lockout with the real time and scope (`limitScope`, `retryAfterSeconds`: "Your PIN is paused" vs "This tablet is paused",
"Try again at 10:58 PM"), stable error codes (`clockerErrorText`), drop the extra status request, "N more saved" from `otherCount`,
receipt as the peak moment. Files: `src/components/clocker-pin-gate.tsx`, `clocker-setup.tsx`, `clocker-punch-panel.tsx`,
`clocker-copy.ts`, `clocker.module.css`. Update the Clocker notes in `DESIGN.MD` (the "no countdown" line is now wrong).

### Phase 7. Motion and finishing moments
Sheet and popover enter/exit, row press feedback, one success pattern for clock-in, request sent, week confirmed, timecard approved
and payroll approved; skeleton shimmer; all behind reduced motion.

### Phase 8. Final verification and preview
Re-capture every role, the Clocker and the signed-out pages at 390 / 900 / 1440 (+ 844×390); tastemaker and better-interface
verdict per surface; update `status.json`; deploy a preview for Jose (preview only).

## Rules that stay fixed
- Brand: Inter, teal #0B6E69, the teal band, canvas #F2F5F4, white 22px cards, pills, Phosphor bold, light only, the Clocker glow.
- Server reads, handlers, authorization and contracts are Codex's; the UI only consumes them. Anything that needs a new server
  field goes to a short Codex list (so far: net pay on the Pay card, notification outcome titles beyond `subject`, a name list for the kiosk if ever wanted).
- Fictional data only; no production deploy, no real email or SMS.
- CSS follows the B8 layering rule; breakpoints only from `src/lib/b-viewport.ts`.

## Verification (every phase)
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`, eslint on changed files,
  `npx vitest run --dir src src/components src/app src/lib/navigation` (2,751 pass today).
- Screenshots with `tools/ui-scan/desk.sh` on fictional data (Owner rich, Manager, Employee, Lead, public EN/ES,
  Clocker with `NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1`), before and after, saved per phase; correct routes
  (`/app/employees`, `/app/my-time`).
- Phase 1 additionally: pixel diff and a re-count of sizes, spacings, colours, radii and shadows against the targets.
- Each finding is marked fixed in `status.json` only after it is seen in a screenshot or covered by a test.

## Decisions still open (defaults in brackets)
- Home page: [A, sign-in as the front door].
- Net pay amount leading the Employee Pay card [not now; chip and button only, amount needs Codex].
- Should Managers get a notification when a request arrives [yes, matches "Things to do"; needs Codex].
- Fold 14px and 16px text into the 14.5 / 15.5 roles, and move the insets to 16/16/24 [no; keep DESIGN.MD's approved values].
