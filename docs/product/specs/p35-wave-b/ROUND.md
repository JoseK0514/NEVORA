# Wave B inspection round

- **Round:** 3
- **Exit round:** yes. One full sweep by all five areas, plus a re-check of every open ID.
- **Commit:** `9f32ca6` on `claude/p35-wave-b-808dfd` (preview synced to it)
- **Where it runs:** pushed for Codex (Jose's yes in the Wave B chat, Oct 19). Five local inspectors are also running this round on the same commit; whichever reports first is used, and both are kept.
- **status:** open

## Routes and roles

| Page | Route | Roles |
|---|---|---|
| Insights | `/app/reports` | Owner `QAOWNER`, Manager `AUDIT-M`; Employee is sent to `/app` |
| Templates | `/app/schedule/templates` (`?week=`, `?saved=1`, `?archived=1`, `?error=save`, `?applied=3&skipped=1&warnings=1`) | Owner, Manager |
| Scheduling rules | `/app/schedule/settings` (`?saved=1`, `?error=invalid_hours`, `?windowSaved=1`) | Owner (edits the trade policy), Manager (reads it) |
| Update detail | `/app/updates/<id>` (first link on `/app/updates`) | Owner, Manager, Lead `AUDIT-LEAD`, Employee `AUDIT-E`, `AUDIT-LONG` |
| Compose | `/app/updates/compose` | Owner and Manager ("Create update"), Lead and Employee ("Message today’s team") |
| Payroll settings | `/app/settings/payroll` | Owner `QAOWNER`, `payroll-qa-owner`; Manager is sent to `/app` |
| Payroll runs | `/app/payroll` | Manager with payroll access `payroll-qa-reviewer` (and the Owner, no regression) |

## Open IDs to re-check (from round 2)

- **Alignment:** AL-B05, AL-B16, AL-B17, AL-B20, AL-B22, AL-B23, AL-B24, AL-B25, AL-B26, AL-B27, AL-B28
- **Bars and stability:** ST-B01, ST-B02, ST-B04, ST-B05, ST-B06, ST-B08, ST-B09, ST-B12
- **Type, colour and copy:** TC-B-01, TC-B-10, TC-B-14, TC-B-16, TC-B-20, TC-B-21, TC-B-22, TC-B-23, TC-B-24, TC-B-25, TC-B-26
- **Interaction and states:** IS-B1, IS-B2, IS-B8, IS-B9, IS-B12, IS-B13, IS-B25, IS-B26, IS-B27, IS-B28
- **Widths, roles and consistency:** WR-B-04, WR-B-06, WR-B-09, WR-B-10, WR-B-11, WR-B-17, WR-B-21

## What the round-2 fixes touched

- **Insights:**
  - The refresh starts halfway through each snapshot's life and retries. If a refresh still fails, the page keeps its height and scroll place.
  - At a glance takes 2, 3 or 6 columns by card width.
  - Period summary rows wrap.
  - Section jumps land 16px under the header.
  - Wording: "Couldn’t load insights", "Your session ended", "Unable to work" instead of callout, "Shift changes and coverage".
- **Update detail:**
  - Notices come last and scroll into view.
  - Buttons stay focusable while pending (`aria-disabled`).
  - Withdraw's confirm takes the full row.
  - There's an offline state, and "Couldn’t load this update" with "Try again".
  - A soft hyphen in "Acknowledgement".
  - "Announcement" instead of "Location announcement".
- **Compose:**
  - "Sign in again" on a 401.
  - Publish keeps focus while pending.
  - Type options read "Announcement" and "Today’s team".
- **Templates:**
  - Archive's confirm takes the row.
  - Apply and Archive have one width.
  - "Name a template".
  - Success toasts show again (the feedback wrapper is `display: contents`).
- **Scheduling rules:**
  - The save bar shows its status on phones.
  - Section links land below the header.
  - Focus clears the save bar (scroll padding outranks the shell's).
  - The bar's offset fits a taller tab bar at large text.
  - Server messages appear in plain words.
  - The policy order error sits under its field.
  - The trade and coverage policy has one name.
  - "and" instead of "&".
  - Policy facts dividers are inset like kit rows.
  - The duplicate "Position quantities" legend is hidden visually.
- **Payroll settings:** only the form being saved says "Saving…", and focus returns to its button.
- **Payroll runs** (Owner and Manager): amounts and dates stay whole.
- **Everywhere in Wave B:**
  - No automatic hyphenation.
  - Long words break in pills and buttons.
  - Textareas and search fields have 3:1 edges.
  - Placeholder bands are set for landscape, for 125% and 150% text at 390, and for Lead and Employee Compose at 320.

## Decided, don't refile

The table in `inspection/ROUND-2.md` still applies. It adds:
- Shared WR-49 textarea and search border on other pages (sent to the coordinator).
- Report definitions and payroll strings, which wait on Jose.
- The Update detail band height depends on the title's length, so its placeholder can't match every title.

## Checks

`checks.mjs` results for this build: `.../scratchpad/wb/r3/*.txt` and `.../scratchpad/preview/checks/*.json` (newest).
