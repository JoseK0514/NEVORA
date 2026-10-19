# Phase 3.5, Profile: the Owner and Manager Profile

October 19, 2026. Branch `claude/p35-profile-6cdee8` (local commits only, never pushed). Jose approved the design as built, the payroll wording and the alert topic list on October 19.

## What changed

Before this work, `/app/profile` sent Owners and Managers back to Home. They now get their own Profile, laid out like the Phase 3 employee Profile: a flat band, then kit cards. Phones show one column; from 1024px, Your details sits on the left and the other cards on the right.

| Card | Contents | Source |
|---|---|---|
| Your details | Name, Role, Company, Time zone, then Email, Phone and Locations. Owner: "Edit your details" (their Team record). Manager: "Something wrong here? Ask the account owner to update it." | Name, role, company and time zone come from today's session and workspace reads. Email, phone and locations come from the new read (CODEX.md). |
| Pay | My pay, "Your pay statements" | Shown when the payroll feature is on and the company keeps pay statements: the rule My pay's own page and the navigation apply |
| Notifications | "All notifications" (link to the list), "Alerts on this device" (opens the existing device sheet, or a note when the workplace has them off), then "You’re told about": one switch per alert topic | Topics and their on/off state come from the new read; a switch saves through the new save (CODEX.md) |
| Sign out | The existing sign-out form, with "Signing out…" while it runs | Unchanged server action |

Files:
- `src/app/app/profile/page.tsx`: only the role check at the top (plus its import). Owners and Managers get `ManagerProfilePage`; employees and leads keep the Phase 3 page.
- `src/components/manager-profile/manager-profile.tsx`: the server page (band, today's reads).
- `src/components/manager-profile/manager-profile-live.tsx`: the client view and its read and save.
- `src/components/manager-profile/contract.ts`: the contract parser and the approved topic set.
- `src/components/manager-profile/manager-profile.test.tsx`: 15 tests.
- `src/app/app/premium-profile.css`: every style, scoped to `.premium-manager-profile`, plus the placeholder band for this route.
- Cherry-picked `9f7b649` (the coordinator's landscape kit fix); my own landscape workaround was removed.

Every state, and what the reader sees:

| State | Your details | Alert list |
|---|---|---|
| Loading | "Checking…" in the card head; "–" in the three read rows | The approved topic wording drawn as text-shaped grey bars, same size as the ready rows |
| Ready | All values | Switches |
| Paused (window left) or offline | "Updates paused" / "You’re offline"; rows keep the last values' size, hidden, with "–" | A panel over a hidden copy of the rows says why and when they come back |
| Re-reading after a return | Last values stay, "Checking…" | Last switches stay, ignoring presses until the read lands |
| Failed read (including today's 404) | "Couldn’t load" in the read rows; Try again in the head | Panel "Your alert choices couldn’t load." with Try again |
| Session ended | "Sign in to see this"; Sign in in the head; nothing kept | Panel with Sign in |
| Saving a switch | – | "Saving…" in place of the detail; the switch ignores presses, focus stays |
| Save failed | – | "Not saved. Try again." / "Not saved. You’re offline." / "Not saved. Sign in again." in the same space; the switch returns to the stored value; announced once with its topic |

## Set aside for Codex (joint testing)

All in `CODEX.md`:
1. `GET /api/management/profile`, the read (contact, locations, alert choices).
2. `POST /api/management/profile/alerts`, the save, and making notification and push delivery honour it.
3. Recommended: the same read on the server, passed as `initial`, so the page arrives complete. Without it, an email that wraps on a phone adds a line when the read lands.
4. **Load shift from a wrapping email (ST-03 / IS-12, P2, set aside for the merge).** When the read lands on a phone, an email wider than the value column (`owner@northside-qa.example` needs 244px; the column is 222px at 390) adds a line, so the page below moves 22px (CLS about 0.035 at 390–430; 0.0002 at 1440). The fix is Codex's `readManagementProfile` passed as `initial`, so the page arrives complete. It's one change in `manager-profile.tsx` after the merge (CODEX.md, "Optional, recommended"); it can't be wired on this branch, because the function only exists on `codex/premium-backend`. The UI-only alternative, stacking labels above values on phones, would undo the side-by-side rows that WR-3 asked for and that Jose approved, so it wasn't taken.
5. Until the read exists, production shows the failed-read state ("Couldn’t load", Try again) for those rows. The rest of the page works today.

## Not mine, handed over

- Links to this page: added by the Desktop session on its branch (`7f9abac`): More › My account and the desktop account menu.
- Shared shell items `checks.mjs` reports on this route: sidebar group labels at 12px, header actions moving 4px on hydration, no desktop placeholder band. Owned by the coordinator and the Desktop session (listed in PARALLEL.md's coordinator notes).
- The employee Profile's read rhythm clears a finished read on any focus or `pageshow` (`employee-account-panel.tsx`), the bug fixed here as ST-01. It's the coordinator's file.

## Checks

_Filled in at exit._

## Screenshots

`screens/`: Owner and Manager at 390 and 1440, ready, loading and failed read; saving (Owner 1440); save failed and empty (Manager 390); 60 locations with a long email at 200% text (Owner 390).
