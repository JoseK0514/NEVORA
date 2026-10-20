# Phase 3.5, Profile: the Owner and Manager Profile

October 19, 2026. Branch `claude/p35-profile-6cdee8` (local commits only, never pushed). Jose approved the design as built, the payroll wording and the alert topic list on October 19.

## What changed

Before this work, `/app/profile` sent Owners and Managers back to Home. They now get their own Profile, laid out like the Phase 3 employee Profile: a flat band, then kit cards. Band summary: "Details, pay and alerts." ("Your details and alerts." without My pay). Phones show one column; from 1024px, Your details sits on the left and the other cards on the right.

| Card | Contents | Source |
|---|---|---|
| Your details | Name, Role, Company, Time zone, then Email, Phone and Locations (Email and Phone stack under their labels on narrow cards). Owner: "Edit your details" (their Team record). Manager: "Something wrong here? Ask the account owner to update it." | Name, role, company and time zone come from today's session and workspace reads. Email, phone and locations come from the new read (CODEX.md). |
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
4. **Load shift from a value too long for its column (ST-03, P2, set aside for the merge).** Email and Phone stack under their labels on narrow cards in every state, so typical addresses don't move the page. A value longer than one line still can't be sized before the read (see "Set aside" under Checks). The fix is Codex's `readManagementProfile` passed as `initial`, one change in `manager-profile.tsx` after the merge (CODEX.md, "Optional, recommended"). Codex has it on its post-merge list.
5. Until the read exists, production shows the failed-read state ("Couldn’t load", Try again) for those rows. The rest of the page works today.

## Not mine, handed over

- Links to this page: added by the Desktop session on its branch (`7f9abac`): More › My account and the desktop account menu.
- Shared shell items `checks.mjs` reports on this route: sidebar group labels at 12px, header actions moving 4px on hydration, no desktop placeholder band. Owned by the coordinator and the Desktop session (listed in PARALLEL.md's coordinator notes).
- The employee Profile's read rhythm clears a finished read on any focus or `pageshow` (`employee-account-panel.tsx`), the bug fixed here as ST-01. It's the coordinator's file.

## Checks

### Inspection rounds

Five read-only inspectors, one per area, under the October 19 matrix (PARALLEL.md, Jose's cuts from round 2). Reports: `inspection/<area>.md`, one section per round.

| Round | Where | Commit | Alignment | Stability | Type, colour, copy | Interaction, states | Widths, roles |
|---|---|---|---|---|---|---|---|
| 1 (full sweep) | Mac | d27d6ce | 4 | 8 | 8 | 12 | 3 |
| 2 (re-check) | Mac | 1f29c3b | 3 | 4 | 1 | 5 | 1 |
| 3 (re-check) | Mac | 7713d75 | 0 | 2 | 0 | 1 | 1 |
| 4 (re-check) | Codex, cloud | 829dfe6 | 0 | 2 | 0 | 0 | 0 |
| Exit 4 (full sweep) | Mac | ee088cf | 0 | 0 | 0 | 1 (IS-16) | 0 |
| Exit 4, IS-16 re-check | Mac | caef395 | – | – | – | 0 | – |

**Status: zero, exit round 4** (October 19). Every area has 0 open P0–P2 on `caef395`.

All findings were fixed except the set-aside below. Jose approved the design, the payroll wording and the alert topics on October 19.

### Automated checks (`checks.mjs`)

Run every round with the fixtures served (`inspection/harness/checks-fixture.mjs`) and without them (today's 404). Remaining flags are all outside this page: the shared shell (sidebar group labels at 12px, the header's hydration nudge), the console 404 for the unbuilt read, and 500s from the overloaded preview before Codex's pooled transport.

### Code checks on the final build

- `npx tsc --noEmit -p .`: passes.
- `npx eslint src`: 1 error, 1 warning, both outside Profile. The error is `src/app/app/exchange/swap/page.tsx:51` (`react-hooks/immutability`), the known one Wave A owns and has fixed on its branch. The warning is the existing `employee-weekly-confirmation.tsx:18`. No Profile file has findings.
- `npx vitest run`: 7,292 passed, 7 failed, 801 skipped. The 7 failures are timeouts under machine load in files Profile doesn't touch (`phase-e-process`, `employee-home-actions`, two tenancy-migration suites). Run on their own (`--maxWorkers=1`), all four files pass, 147 of 147. Codex's cloud run of this branch at be4a232 passed 7,298 with 0 failed.
- Profile's own tests: 16 of 16 (`src/components/manager-profile/manager-profile.test.tsx`).

### Not applicable

- On-screen keyboard (iOS Simulator, Android emulator): the page has no text fields. The switches and links don't raise a keyboard.
- Print and PDF: the page has no Print.
- Dark mode: the app has none.

### Set aside, not open

Load shift when a value too long for its column arrives with the read: the Manager fixture's 34-character address at 320–360 (CLS 0.015–0.030) and `owner-large`'s 95-character address (0.018–0.040 on phones, 0.004 at 1440). Typical data doesn't move: Owner 320–1440 and Manager 390–1440 measure 0.0015 or less. Codex wires `readManagementProfile` as `initial` after merging Profile, so the page arrives complete and this goes to 0.

## Screenshots

`screens/` (final build, `caef395`): Owner and Manager at 390 and 1440, ready, loading and failed read; saving (Owner 1440); save failed and empty (Manager 390); 60 locations with a long email at 200% text (Owner 390).

## After the merge: integration QA fixes (October 19, night)

From the coordinator's layout QA of the integration preview (QAOWNER and AUDIT-M). The branch is now `claude/premium-phase-1` (which includes `codex/verify-preview-33`, with Codex's merge of Profile, the `initial` server read and IS-PROFILE-17).

| Finding | Fix |
|---|---|
| P2, phones: Email and Phone stacked (77px) while every other row sat beside its label (52px) | All rows follow one rule: the value sits beside its label when the card has room, otherwise every row stacks (container query, `16rem + 40px`, in rem, so large text stacks too). Measured: all stacked at 320 and at 200% text, all side by side at 360, 390 and 1440. The stacked contact rows were only there to keep the read from moving the page, and the `initial` server read now does that. |
| P2, 200% text: an empty card meta wrapped into a 40px blank line in the "Your details" head | The meta renders only when there is a state word or an action. The head is 38–44px (clean) or 50px (kit) in the ready state at every width. |
| P3, desktop: detail values 17px beside 13.5px row titles | Labels and values take the kit row classes (`nv-row__meta`, `nv-row__title`), so they follow whichever layer styles rows. With the clean v3 layer: 13.5px values and 13px labels on desktop (equal to the Pay and Notifications rows), 17px and 15px on phones. A lower-specificity kit fallback covers pages without it. |
| Card title 16px from the edge, content 20px | Left to Wave A's shared fix, as asked. |

Checked in my one preview, in both the kit and a simulated clean context (the clean stylesheet and `data-nv-clean` injected in the browser) at 320, 360, 390 and 1440, 100% and 200%.
