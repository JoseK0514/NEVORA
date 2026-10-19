# Wave C: round 4 (exit round) for the cloud inspectors

- **Round:** 4, Wave C's **exit round**: one full sweep by all five areas, with `checks.mjs` over every route, width, text size and both browsers.
- **Commit to inspect:** the head of `claude/p35-wave-c-93e13c`.
- **Brief:** `docs/product/specs/codex-joint/INSPECTION-BRIEF.md` on `claude/premium-phase-1`. For Wave C's pages, accounts and decided items, also read `inspection/BRIEF.md`, `inspection/ROUND-2.md` and `inspection/ROUND-3.md` here. Use the prefix `WC`, for example `AL-WC-17`.
- **Round 3 (Codex, on `b109ec3`):** found two P1s. Both are fixed in this commit:
  - **WR-21:** the color well's swatch was white. An inline `height: 3rem` now wins over the shared field rule's `height: auto`. Verified locally: the teal swatch shows at 64×48.
  - **ST-02:** at 200% text the toast covered Save. On portrait phones the toast now sits at `tab bar + measured save bar + 8px`. Verified locally in Chromium and WebKit at 320 and 390, at 100% and 200%: 0px overlap, an 8px gap.
- **Still to re-check from round 3:** every other ID listed for round 3 below, as part of the full sweep.

## Combined candidate (Oct 19, evening)

- **Branch now sits on the release candidate** `codex/verify-preview-33` at `cd764f6` (fast-forward; nothing of Wave C's was missing).
- **Fixed on top of it (commit `f58b18e`):** **TC-WC-iOS-1** (P2, from Jose's iOS keyboard check): Company profile's protected Business timezone showed the raw name `America/Puerto_Rico`; it now reads `Puerto Rico time` via `timeZoneLabel()`.
- **Already fixed in the candidate, nothing for Wave C to change:** WR-WC-25 (dialog buttons `flex: 0 0 auto` under 600px, `premium-wave-c.css` near line 575) and TC-WC-28 (shared field edge `--nv-field-border` on textareas, `portal-premium.css` line 1388).
- **Codex's cd764f6 exit reports are prepared, not run;** no combined-SHA findings yet. Wave C is not zero until an exit round reports zero.

## Routes and roles

| Route | Roles that can open it | Notes |
|---|---|---|
| `/app/settings` | Owner | Manager, Lead and Employee are redirected to Home (decided: Codex item, `CODEX.md` §2b) |
| `/app/settings/workspace` | Owner | The timezone is protected on the fixture data |
| `/app/settings/locations` | Owner | `?q=zzz` for no match; `?status=setup` / `ready` / `inactive` |
| `/app/settings/locations/loc-1` | Owner | `/app/settings/locations/unknown` shows the not-found page |
| `/app/settings/locations/new` | Owner | |
| `/app/settings/branding` | Owner | Preview tabs; the preview miniature is aria-hidden and exempt from the type floor |
| `/app/settings/features` | Owner | Time off is locked by a waiting request on the fixture data |
| `/app/settings/company-policies` | Owner | Pick "Custom threshold" to reveal a rule's fields |
| `/app/settings/breaks` | Owner | Dialogs: Add, Edit, Archive |
| `/app/settings/positions` | Owner | Inline row editor |
| `/app/settings/clocker` | Owner | Dialogs: Add device, Rename, Replace tablet / New setup code, Revoke access |
| `/app/account-recovery` | Owner, Manager | Also `?employee=AUDIT-E` and `?from=settings` (Settings only for an Owner) |
| `/app/clocker-recovery` | Owner, Manager | Also `?from=settings`. Well-formed unknown reference: `4a9c7ed1-9b42-4dc0-8847-324d7ade7832` |

## Earlier open findings (rounds 2 and 3), to re-check by ID within the full sweep

| Area | IDs | Report |
|---|---|---|
| Alignment | AL-08, AL-13, AL-14, AL-15, AL-16 | `inspection/alignment.md` (Round 2) |
| Bars and stability | ST-02, ST-05 (landscape), ST-08, ST-13, ST-14, ST-15, ST-16, ST-17 | `inspection/stability.md` (Round 2) |
| Type, colour and copy | TC-10, TC-11, TC-15, TC-16, TC-17, TC-26, TC-27 (TC-24 and TC-25 remainders are decided) | `inspection/type-colour-copy.md` (Round 2) |
| Interaction and states | IS-6, IS-15 | `inspection/interaction-states.md` (Round 2) |
| Widths, roles and consistency | WR-11, WR-13, WR-21, WR-22, WR-23, WR-24 (WR-09 is decided) | `inspection/widths-roles-consistency.md` (Round 2) |

## What the fixes touched

All the fixes are listed in `inspection/ROUND-3.md`. In short:
- **Save bars:** on portrait phones they're `position: fixed` on the live-measured tab bar, with room kept under the page.
- **Dialogs:** destructive confirms open on Cancel.
- **Color well:** 64×48.
- **Wrapping:** no auto-hyphenation; decorations step aside in narrow cards; button and link icons sit on the first line.
- **Band Add control:** starts on Back's edge when it wraps.
- **Copy:** company words on all Locations strings; one save-state wording ("Saved" / "Unsaved changes"); shorter pending labels; long IDs in Back.
- **Loading:** parent placeholder bands for landscape.
- **Word rules (new since round 2):** client strings now follow the brief:
  - "Couldn’t load {thing}." with Try again
  - "Your session ended" with a Sign in link
  - no "could not be confirmed"
- **Decided items:** server-written strings (`CODEX.md` §3, including `actions.ts` and `breaks/actions.ts`) stay as they are. "Observation cutoff" and the other policy terms that sit next to legal text are Jose's call.
