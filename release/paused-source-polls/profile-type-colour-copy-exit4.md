## Exit round 4

October 19, preview `http://127.0.0.1:50933`. App code at `b8a3bad` for most of the sweep. The final 184 Chromium snapshots and the re-runs ran on the exit commit `ee088cf`, whose only change is the band summary "Details, pay and alerts." and its placeholder threshold.

Coverage, a full sweep of the area:
- **Chromium:** 320, 390, 844×390, 768, 1024 and 1440 at 100, 125, 150 and 200%, Owner and Manager. Every state the harness produces:
  - ready, loading, failed read, `unavailable`, 404, signed out, paused, offline
  - save pending, failed, aborted and 401; retry pending
  - `owner-large`, `manager-empty`
  - scratch fixtures: 12 assigned locations (closed and open), five inline locations, no contact or alerts, one location, and the 24-character address part
- **WebKit spot checks:** 320, 844×390 and 1440 at 100 and 200%: ready, loading, failed, signed out, save pending, save failed, `owner-large`, `manager-empty`, the long address and retry pending.
- **Totals:** 1,128 snapshots and 612 axe runs.
- **Harness artifact, not a finding:** in the first Chromium pass, the Manager's failed, `unavailable`, 404, signed-out and paused captures ran with the browser context offline. They made 0 requests and showed "You’re offline". I re-ran all five states for both roles in a fresh browser (240 snapshots), and they show the right states. A manual load of the Manager's failed read at 1024 also shows `navigator.onLine` true and "Your alert choices couldn’t load."
- **Employee and Lead:** `AUDIT-E` and `AUDIT-LEAD` still get the employee Profile (`.premium-employee-profile` 1, `.premium-manager-profile` 0).

Screenshots are in `scratchpad/inspect/type/r4/shots/`.

### Findings

None.

### Checked and correct

- **Type:**
  - Every text node is a kit role. Smallest text is 15.0px on phones and landscape and 14.0px on desktop (callout and label only).
  - Nothing under the floor at any text size. Every node scales with the root size.
  - No text node is clipped or line-clamped, and there's no sideways overflow, in any snapshot.
- **Contrast, text:**
  - Nothing under 4.5:1 in any state, including busy, held and error states.
  - Ink 17.65, muted 5.84 (5.52 on hover), teal 5.53, save error 6.76.
  - Band summary 7.42 on the band.
  - The loading bars (transparent text on #EEF1F0) are decorative and `aria-hidden`.
- **Contrast, graphics:**
  - Switch off: track and thumb 3.45. Switch on: 5.53 (5.23 on hover). Unchanged while saving.
  - Chevrons 3.26–3.45. Save-error icon 3.56–3.77. Tile glyphs 5.80 (urgent) and 7.43 (neutral).
  - Loading pills (1.14) are decorative.
- **Colour never alone:** switches carry state in thumb position and `aria-checked`. Save errors and read failures have an icon and words.
- **Contact values:** stacked under their labels at 320 and 390 (value 248 and 318px), in every state.
  - **Manager's address:** "morgan.rivera@northside-qa.example" breaks only before ".example".
  - **Long test address:** "christopherjohnsonmanage@ / westoverhospitality.example" at 100% on every width.
  - **Breaks inside a part:** these occur only where the part alone is wider than its row. Examples:
    - 320 at 125–200%, 390 at 150–200%
    - 768 at 200%: the part is clamped at the row's full 420px
    - 1024 at 150–200%: the 310px row
    - `owner-large`'s 37-character domain at every width
  - **Phone numbers:** break only at spaces, and "ext. 4021" stays whole.
- **Locations:** the inline list breaks only between names, with "·" kept on the name before it. "12 locations / Show all 12 / Show fewer", "All 3 locations", "All 60 locations", "None assigned yet", "No locations yet".
- **Copy:**
  - Sentence case, curly apostrophes, real ellipses and no blame words in every visible and spoken string. Checked:
    - the band summary "Details, pay and alerts." (one line at 100–125% on 320, at 100–150% on 390, and at every size from 768 up)
    - "All notifications"
    - the paused, offline, failed and signed-out notes
    - "Not saved. Try again." / "Not saved. Sign in again." / "Not saved. You’re offline."
    - announcements prefixed with the topic ("Time-off requests: …")
    - "Your details loaded."
  - Approved wording (design, payroll, alert topics) wasn't refiled.
  - Observation, not a finding: without payroll the summary is "Your details and alerts.", so the two variants differ in their first word. Each company only ever sees one, and both match the 24-character placeholder rule.
- **axe:** 0 violations in 612 runs (both roles, every state above, 100 and 200%, Chromium and WebKit).
- **Background runs:** none of mine are running.

Open P0–P2 in type, colour and copy: 0
