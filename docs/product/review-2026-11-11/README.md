# Premium UI inspection and plan (Nov 11–14, 2026)

Start here if you are picking this work up in a new session.

Branch: `claude-codex-collab-nevora`. Development is merged up to `cfea6330` (merge commit `ef2692be`).
Type check is clean, and all 2,860 app and component tests pass.

## What is here

- **`PLAN.md`** is the plan Jose approved: system first, then screens. It has 8 phases and says which design skill governs each.
- **`backend-gaps.md`** lists 28 server contracts Codex delivered. 21 of them are partly wired or not wired into the screens yet.
- **`reviews/`** holds the premium visual reviews, each as `.md` (summary) plus `.json` (findings with `id`, `severity`, `what`, `why`, `fix` and `where`):

  | File | IDs | Findings |
  |---|---|---|
  | `review-owner` | OW | 39 |
  | `review-manager` | MG | 17 |
  | `review-employee` (covers Employee and Lead) | EM | 34 |
  | `review-tablet` | TB | 19 |
  | `review-public` (signed-out pages, both journeys, home-page options) | PB | 37 |
  | `review-system` (design-system measurements and token tables) | SY | 24 |

- **Not saved yet:** the Clocker review and the review of pages the first capture missed (CK and XP findings) were still running. Re-run them from the screenshots, or after Phase 1.

Screenshots are not in the repo. Re-capture them with `tools/ui-scan/desk.sh` on fictional data; see that folder's README. Use the real routes: `/app/employees`, `/app/my-time`, `/app?view=attendance`. For the full kiosk flow, set `NEVORA_SCAN_CLOCKER_FLOW=1 NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1`.

## Jose's decisions (Nov 11)

- Implement all findings, following `PLAN.md`.
- **Clocker sign-in:** Employee ID + PIN. The ID field opens the tablet keyboard with auto-capitals, then the number pad takes the PIN.
- **Clocker lockout:** show the real wait as a clock time ("Try again at 10:58 PM") and name who is paused: "Your PIN is paused", or "This tablet is paused" only when the whole tablet is.
- **Attendance words:** "Not clocked in" (shift started, no punch), "Clocked in late" (arrived after start), "Missed" (shift ended, no punch).
- **Home page:** option A. Sign-in is the front door; no marketing page.
- **Defaults still open:** net pay on the Employee Pay card (needs Codex), and Manager notifications for new requests (needs Codex). The approved insets of 14/18/22 stay.

## New screens from the Nov 14 development merge (not in the reviews; add them to the plan)

These still use the older look:

- **Owner phase:** `/app/billing`; the delegated time correction (`/app/timecards/corrections/new/[employeeId]`); the close-open-entry form in the timecard panel.
- **Signed-out phase:** the public `/pages/plans`, `/pages/nevora-billing`, `/pages/nevora-billing-return` and `/pages/es-*`.
- **Clocker phase:** `/clocker/access/paused`.

New server APIs with no screens yet: conversations and staff tasks.

## From the Nov 15 development merge
- **Owner roster import** (preview, then import a staff list): the backend is done and there is no screen yet. The UI contract is
  `docs/handoffs/2026-11-14-owner-simplicity.md`. Add it to the Owner phase: the import screen with preview and errors, in EN/ES,
  for phone and desktop. Label the headcounts distinctly (active people, availability eligibility, plan capacity), as the handoff asks.
- Codex turned on unused-code checks in the type check, so new screens must not leave unused imports.

## Rules

- **Brand is fixed:** Inter, teal #0B6E69, the teal band, canvas #F2F5F4, white 22px cards, pills, Phosphor bold icons, light only, and the Clocker glow.
- **CSS:** follow DESIGN.MD's B8 layering rule. Any Direction B `!important` goes in `@layer nv-b`. Breakpoints come only from `src/lib/b-viewport.ts`.
- **Server boundary:** reads and contracts belong to Codex. The UI only consumes them.
- **Safety:** use fictional data only. Never deploy to production or send real email or SMS.

## Backups

The uncommitted work in two old helper worktrees from Nov 7 is saved on two branches. Most of it was merged earlier and later revised, so it is kept for reference only:

- `backup/nov7-agent-a7fe58731604e764a`
- `backup/nov7-agent-ab1f746619d69f108`
