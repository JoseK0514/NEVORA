# Requests and account: report (Nov 23, 2026)

Branch `claude-codex-collab-nevora-requests-account`, based on `claude-codex-collab-nevora` at `2f2387a9`.

## Commits

| Commit | What |
|---|---|
| `b2e5f8a2` | Delete my account, Manager Profile, Help someone sign in and Person access onto Direction B (code and tests) |
| `4a693129` | Help someone sign in: the closed "How this works" card is the row's height on phones |
| (this commit) | Captures and this report only |

## Proof run

- `tsc --noEmit`: clean. `oxlint` on the changed paths: clean.
- Tests beside the changes (`run-rstest.mjs`: account deletion, U11 last Owner, legal pages, deletion view, Manager
  Profile, assisted recovery, person page): 67 passed, 0 failed. Tests that asserted the old Quiet markup were updated.
- One production build per role (`NEVORA_OWNED_APP_PRODUCTION=1`, under `flock /tmp/nevora-heavy.lock`), fictional
  data: Owner (`QAOWNER`) and Manager (`OWN-ELENA`, no grants), 390, 768 and 1440. 42 captures in
  `shots/requests-account/` (`<row>-<role>-<width>.webp`).
- Overflow: 0 at every width for every captured page (harness `scan-log.json`).
- Not run: the location Manager (`OWN-DANI`, Condado) scoped harness with axe and edge measurements, 320 px and 200%
  text, keyboard walk. See "Gaps" below.

## Per page

### I6 Delete my account (Owner, Manager; Mℓ uses the same code path)

**What changed.** Owners and Managers had the older Quiet page (account rows, "What happens" rows, a separate "Your job
and your workplace" footer, three button styles). They now get the Employee's Direction B screen, the component the
Employee and Lead already use (`employee-mobile/deletion.tsx`, `EmployeeDeleteB`), with their own data:

- Same action, hidden account field, password check, consent box, retry and every outcome (received, duplicate, failed,
  uncertain, busy, unavailable, signed out, changed). A failure keeps its Support reference (now shown for every role).
- Owner: "Your company's workspace stays open for the rest of your team. To close it, email support@…" sits in the
  "What … keeps" card.
- Last Owner (`LAST_OWNER`): the existing `LastOwnerCard`, drawn once under the band at every width; no form, no
  password field.
- A plain "not available" keeps the Delete button for Owners and Managers, as their page did (the Employee's hides it).
- "What may be kept" opens the public `/account-deletion` policy (their Profile has no policy page; the employee
  route redirects them). Back goes to `/app/profile#profile-privacy`, which opens "Privacy and terms" where the row is.
- Layout for the Owner and Manager shell is page-scoped (`account-deletion.css`, `.em-delete--team`): the two
  information cards show from 768 px, the consent line wraps on a phone (it ran off the screen at 683 px in the first
  try), the red button ends on the card's right edge with "This can't be undone." centred under it.

**Words.** Before (Owner, 390): 170 words, title "Delete your NEVORA account" + sub "Read what happens before you
confirm.", account rows (Name, Role, Employee ID), "Keep my account". After: the Employee's approved wording, title
"Delete account", sub "Your NEVORA sign-in, not your job", 3 cards. The name and Employee ID rows are gone (the shell
shows who is signed in; the ID is still sent).

**Buttons.** Before: red pill, quiet "Keep my account", text link (3 styles). After: one red "Delete my account"
(full width on phones, its own width from 768 px); the way back is the band's back link.

**Alignment** (read from the captures, not measured with `getBoundingClientRect`). Cards share the 16 px phone gutter
and the 296 px desktop edge; card text shares one left edge; the button's right edge is the field's right edge.

### I1 Profile (Owner and Manager)

**What changed.**
- The Manager's Phone and Email no longer each show "<Owner> can change this" under the value. The lock stays; the
  sentence is said to screen readers beside it. The Owner's name now shows once ("For anything else, ask …").
- Access said "Manager, all locations" under a band that already says "Manager · <company>"; it now says the reach only:
  "All locations" or the location names.
- On a phone, "What you can approve" and its closing line sat on the screen edge (x = 4) while the cards start at 16;
  they now start 4 px inside the card edge, as on desktop.

**Words (Manager, 390).** Before 108 words (sweep). After: two "Jose Natal can change this" lines (10 words) and one
repeated "Manager" removed; not re-counted by the harness.
**Buttons.** Owner: the white band "Edit" only. Manager: none. Unchanged.
**Still Quiet markup** under the Direction B dress (`q-list`/`q-row`); visually it matches the band and cards. A full
move to the Corp kit would touch the live read, alert switches, passkeys and privacy rows; left for a follow-up (see
end sweep).

### F9 Help someone sign in (Owner, Manager)

**What changed.** "How this works" (three steps and the 15-minute note, about 60 words) showed on every visit. It is now
a closed row that opens to the same words (density rule 5), with a 56 px row and a caret that turns (no motion under
reduced motion). The security guidance under the switch is approved wording and stays. Same form, request, proof
custody and clearing.

**Words (390).** Before 125 (Owner) / 112 (Manager), from the sweep. After, counted by hand from the captures at rest:
about 70 (Owner, with the Clocker PIN row) and 55 (Manager).
**Buttons.** One solid teal "Make reset link"; the Owner's "Reset a Clocker PIN" row. Unchanged.

### F4 Person (Owner, Manager)

Already on Direction B (Corp kit, B dress). Fixed:
- Access and sign-in: the card under the band repeated "Access"; the heading is gone (still the card's name for
  screen readers).
- "Reset password" said "Give them a one-time code to sign back in", but the page it opens makes a reset **link**
  (Phase 5). It now says "Give them a one-time link to sign back in". This is wording about what happens: please
  confirm.

### E1 Time off (Owner, Manager)

Checked at 390, 768, 1440 (Waiting, Approved, one request). The band, segments and card are Direction B; the waiting
rows already match Things to do (tinted Approve/Review, quiet Decline, recorded Nov 15 as "a list of requests carries no
filled primary"). I changed nothing here: the title "Time off requests" matches the Home and Things to do rows that
open it, and the waiting list's markup is shared with the request review flow. The Manager without "Approve time off"
gets the closed state ("Time off is decided by an Owner", Open your schedule, Return to Home); that is the shared
`OperationalUnavailable` screen, outside this package.

## Impeccable audit

```
Impeccable audit: Requests and account (Owner, Manager; 390, 768, 1440; at rest)
Checked: production build captures on fictional data, harness overflow and small-target scan

Blocking
(none left in this package's files)

Should fix
1. [Hierarchy] E1 waiting list, Manager without the grant: the closed card says "time off" three times (band "Team time
   off", title, line) and offers "Open your schedule" to a company-wide Manager. Shared component
   (OperationalUnavailable / permission copy). Fix: lead-owned copy change.
2. [Hierarchy] I1 Profile is still Quiet markup under the B dress. Fix: move to Corp rows in a follow-up.
3. [Spacing] I6 desktop: the gap from a card's heading to its first paragraph is visibly larger than on the B screen (not measured).

Polish
4. [Hierarchy] F9 phone: the security guidance sits on the canvas between two cards; inside the second card would read
   as part of the switch.

States: Empty ✓ (E1 empty tabs unchanged) · Loading ✓ (route skeletons unchanged) · Error ✓ (deletion failed and
uncertain keep their words and Support reference) · Success ✓ (deletion receipt) · Edge ✓ (last Owner, not available)
Not checked: axe, 320 px, 200% text, keyboard order, Mℓ captures (see Gaps)
```

## Blocking items left

None in this package's files. Needs Jose's OK (trust wording): F4 "Give them a one-time link to sign back in".

## Gaps

- No location Manager (Mℓ) captures: the scoped harness wasn't run in the time. E1, F4 and F9 show the shared closed
  notice for Mℓ; I1 and I6 use the same components as the Manager.
- No axe, 320 px, 200% text or keyboard run on the after state.
- The LAST_OWNER card under the new layout is covered by the U11 tests, not by a capture (the harness can't trigger it).

## End sweep (proposed ledger rows)

| Row | Page | Item | Kind |
|---|---|---|---|
| RA-1 | I6 | The inline support address in the Owner's sentence is a small target at 390 (harness) | end sweep |
| RA-2 | I1 | Move the Owner and Manager Profile from Quiet rows to Corp rows | end sweep |
| RA-3 | E1 | Closed card for a Manager without "Approve time off": "time off" three times; "Open your schedule" for a company-wide Manager (shared component) | end sweep |
| RA-4 | I6 | Desktop card head gap (Corp card) larger than the B screen's | end sweep |
| RA-5 | all | axe, 320 px, 200% text and keyboard pass on the after state; Mℓ captures | end sweep |

## Kit or shell changes requested

None required. Note for the lead: `src/components/employee-mobile/deletion.tsx` and `employee-b/account-b-client.tsx`
gained optional props (`manager`, `keptHref`, `profileHref`, `owner`, `lastOwner`) with Employee defaults, so the
Employee and Lead screens are unchanged except that a failed request now shows its Support reference when the server
gives one.
