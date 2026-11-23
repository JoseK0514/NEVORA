# Account pages (F9, I1, I6): report

Branch `claude-codex-collab-nevora-account`, based on `claude-codex-collab-nevora` at `b40f60e9`.

## Commits (code)
- `17d2d051` I6 Delete my account: Owner and Manager on the Employee's Direction B screen
- `0f8ae9fd` F9 Help someone sign in: Direction B on the corporate kit
- `a1a41dab` I1 Profile (Owner, Manager): the Employee Profile's Direction B frame
- `bd1e8e9e` Tests for the Direction B markup, and spacing fixes
- `5b3c25c9` Alert rows, the who-can-change note on the rows' inset, equal buttons
- `a877932a` The Manager's Role line wraps; alert rows centre text and switch
- `2e6ffb3c` The alert row's three detail states share one cell

The shots and this report are one separate final commit.

## Checks run
- Typecheck clean. oxlint clean on the changed files.
- Tests beside the changes: 116 pass (manager-profile, account-deletion-u11, legal-pages, assisted-recovery, recovery-u11, wave-a/parts, employee-mobile/deletion). I updated 17 tests that asserted the old Quiet markup.
- One production build (`NEVORA_OWNED_APP_PRODUCTION=1`, fictional data, owned loopback Postgres) through the extended `mgr.ts`, as Owner `QAOWNER` (o), Manager `OWN-ELENA` (m) and location Manager `OWN-DANI` at Condado (ml). Widths: 320, 390, 390 at 200% text, 768 and 1440, with geometry, axe and a keyboard walk at 390 and 1440. I1 was captured again after its last two fixes (`2e6ffb3c`); I6 and F9 come from the `5b3c25c9` run, and nothing on those two pages changed after it.
- Results on every page, role and width: no page overflow, no clipped text, no overlapping text, no axe violations inside `main`, and every keyboard stop in the page has a visible ring.
- Captures: `shots/account/<row>-<o|m|ml>-<390|768|1440>.webp` (27 files).

## F9 Help someone sign in (Owner, Manager; location Manager sees the existing notice)
- **What changed:** The page moved from the Quiet `SettingsFrame` to the kit: `CorpPage` with "‹ Team" and the title in the phone band, and the wide title on tablets and desktop. `ScopedReadFrame` still wraps the page.
  - One "Verify the employee" card holds Employee ID, How you checked and the "I confirmed who they are" switch, with the teal Make reset link in the card's footer.
  - "How this works" (3 steps, how long a link lasts, who can't be helped) is now a closed disclosure card (density rule 5).
  - Reset a Clocker PIN is a kit row (Owner only).
- **Unchanged:** the request, the confirmation that stops the submit, all field checks and messages, the receipt, and the clearing on blur or hide.
- **Words:** Before, 134 words were always on screen. Now about 45 are (the band title, the card, the security guidance under How you checked, and the two row titles). The free-text field was "How you checked", the same label as the select; it is now "Describe how you checked". The select had an aria-label that differed from its text ("How you checked who they are"); its visible label is now its name. The offline message is the amber callout, as on the request and reset pages.
- **Buttons:** one Solid teal (Make reset link). It is full width on phones and at the card footer's right on tablets and desktop. It shows one label at a time (before this fix, both labels showed side by side).
- **Edges:** the card, field and row left edges match the band title at 390 and 1440. Overflow is 0 at every width.

## I1 Profile (Owner, Manager, location Manager)
- **What changed:** Profile now uses the Employee Profile's frame. The title is "Profile and settings" (phone band with "‹ More"; wide title on desktop), and the Owner's Edit sits in the band. The cards are:
  - **Personal info:** Name, Role, Company, Phone, Email, Time zone. An Owner's Phone and Email open the edit page.
  - **Notifications:** the alert switches as kit rows, Alerts on this phone/device, and All notifications.
  - **What you can approve:** the existing Manager section, unchanged.
  - **Security:** Passkeys (hidden while the flag is off) and Delete my account.
  - **Privacy and terms:** Privacy Policy, Terms of Use, Support.
- **Unchanged:** the same reads, saves, retry, pause, hold-size and focus rules.
- **Words:** "<Owner> can change this" repeated on Phone and Email with a lock on each. It now shows once, as the last row of Personal info: "Jose Natal can change these details." The avatar band that repeated your name was removed, so the name appears once.
- **Buttons:** Edit (Owner) in the band; Try again or Sign in in the card footers only when a read fails or the session ends.
- **Edges:** the note sits on the rows' left edge. Values share one right edge. At 768 the Manager's Role line used to be cut with an ellipsis; it now wraps (re-checked in production, no clipping).

## I6 Delete my account (Owner, Manager, location Manager)
- **What changed:** Owners and Managers get the Employee and Lead screen (`EmployeeDeletionView`): What we delete, What <company> keeps, and a "Confirm it's you" card. It is drawn with kit cards on every width, because the Employee phone screen's CSS is tied to the Employee shell.
- **Unchanged, every safety step:** the same action, password, consent box, "This can't be undone.", unknown-result retry ("Check my request"), received/duplicate receipt, signed-out and changed outcomes, and the last-Owner card.
- **Kept for Owners and Managers:** Keep my account, the Owner's "Your company’s workspace stays open…" line, and the Support reference under a failed reply. What may be kept opens the public `/account-deletion` page, because the Profile policy page redirects managers.
- **Words:** 170 before (Owner). Now about 150, and nothing is said twice.
- **Buttons:** before, there were 3 styles. Now there are 2: the red Delete my account (kit danger) and the white Keep my account. They are the same height, stacked full width on phones and side by side at the right from 768, with the note under Delete.
- **Overflow:** 0 at every width, including 320 and 200% text.

## Impeccable audit
```
Impeccable audit: F9, I1, I6 (Owner, Manager, location Manager; 320/390/390@200%/768/1440; ready state)
Checked: production build, fictional data, mgr.ts geometry + axe + keyboard walk; screenshots reviewed by eye

Blocking
(none left on these pages)

Should fix
1. [Accessibility] I6 consent checkbox is a 22px input. Its 44px label row is the target, so it works, but the kit has no 44px checkbox. Fix in kit.
2. [Accessibility] F9 switch is 31px tall inside a 44px label row (same kit switch as Settings).
3. [Accessibility] Desktop band back link ("‹ More", "‹ Profile", "‹ Team") is 32px tall. This is the kit's CorpNav or CorpTitle, which is read-only for me.

Polish
4. [Hierarchy] I6 Delete my account is the kit's red outline (c-btn--danger), not a solid red pill. On Employee phones it turns solid once armed. A solid danger kind needs a kit decision.
5. [Hierarchy] I1 "What you can approve" (ManagerAuthoritySection) has its heading outside the card. It is a workforce component, so I left it unchanged.

States: Empty ✓ (Email "Not added"/"None") · Loading ✓ ("Checking…", sized rows) · Error ✓ (unit-tested; failed read: Try again in two places) · Success ✓ (receipt, Your details loaded) · Edge ✓ (last Owner, location Manager notice)
Not checked: VoiceOver/TalkBack output; error and receipt states in the browser (covered by unit tests only); the passkeys row (flag off in the scan).
```

## Blocking items left
None on these pages.

## End-sweep items (proposed ledger rows, kit or app shell)
| Row | Page | Item | Owner |
|---|---|---|---|
| ES-A1 | All Corp pages | Desktop band back link is 32px tall (target under 44) | kit (CorpNav/CorpTitle) |
| ES-A2 | All forms | No 44px kit checkbox; the 22px box relies on its label row | kit |
| ES-A3 | Settings, F9 | `.c-switch` is 31px tall; the row is the target | kit |
| ES-A4 | I6, Employee desktop | `c-btn--danger` is an outline; Jose's B6 says a red pill | kit decision |
| ES-A5 | `owner-b-desktop.css` | Layer rule sets `min-height: 40px !important` on every `.c-btn`; page rules can't lift it, so mixed button kinds in a row differ (I worked around it with padding on I6) | app shell CSS |

Fixed now on my pages: the F9 select's screen-reader name now matches its visible label, the duplicate field label is gone, F9's label swap is fixed, the Manager's lock icons that repeated on each row are gone, and text sizes in my CSS use rem tokens.

## Notes
- `docs/handoffs/.../run-scoped.sh` was used as is. In the scratch copy of `mgr.ts` I added `NEVORA_MGR_LOGINS` and `NEVORA_MGR_SCREENS`; that copy is not committed.
- The kit, the app shell, Team, E1 and F4 are untouched. I changed shared non-kit files additively: `employee-mobile/deletion.tsx` gained an optional `manager` prop, so the Employee and Lead output is unchanged.
