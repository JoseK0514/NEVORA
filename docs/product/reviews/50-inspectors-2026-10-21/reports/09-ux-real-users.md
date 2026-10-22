# 09 UX Researcher — the real users (older phones, slow data, Spanish-first, older owners, one-handed managers, shared Clocker tablets)

## Verdict
NEVORA works well for a confident English reader on a recent phone with good signal. It falls short for the people most of its Puerto Rico customers employ. Outside 18 Clocker phrases the app is English only, and the moments that go wrong (errors, offline, push) use the hardest English. Each employee page loads the whole manager stylesheet. With no signal, an employee can't see their schedule. On an iPhone that stops at iOS 16, the employee "More" tab does nothing.

## Recommendations

1. **Ship Spanish to employees first, and do the string groundwork now instead of waiting for all of B5.**
   - *What:* Make the first slice the screens employees use: sign-in and activation, Home, My schedule, My time, Requests, the offline page, push text and every Clocker message. Start the groundwork in UI now:
     - move strings into one dictionary;
     - replace English plural joins with `Intl.PluralRules`;
     - pass a locale to every date and number formatter.
   - *Why:* `src/app/layout.tsx:25` hard-codes `lang="en"`. Spanish exists only as 18 Clocker phrases (`src/components/clocker-language.tsx:9-16`). The code has 90 hard-coded `'en-US'` formatters across 45 files, and 64 English plural joins such as `item{n === 1 ? '' : 's'}` (`src/components/manager-attendance-review.tsx:142`). Each of these blocks translation. `docs/product/direction.md:160` already ranks Spanish first (15/16), but at size L behind backend B5. The groundwork removes most of that L and changes nothing visible.
   - *Impact:* High. *Effort:* L overall (S/M for the groundwork). *Owner:* UI (extraction and formatters), Backend (locale preference, B5), Product (approved Spanish payroll and legal copy).

2. **Give the employee More sheet, and the manager sheets, a fallback for browsers without the Popover API.**
   - *What:* Check for `popover` support on `HTMLElement.prototype`. Where it's missing, make More a plain link to a More page, or a `<details>` list, as Shift options already does. If a sheet can't open, show a short "update your phone's browser" note instead of failing silently.
   - *Why:*
     - The employee More tab is a `popoverTarget` button with a `popover="auto"` panel (`src/components/app-shell.tsx:326-345`). The panel is `display:none` by default (`src/app/globals.css:11422`), and the code has no polyfill or feature check.
     - The Popover API arrived in Safari 17 and Chrome 114 (2023). iPhone 8, 8 Plus and X stop at iOS 16, and those hand-me-down phones are common among hourly workers.
     - On them, More probably does nothing, so Updates, Profile and the other More items can't be reached.
     - The manager sheets use the same API (`app-shell.tsx:126`, `src/components/action-menu.tsx:163`).
   - *Impact:* High (a silent failure). *Effort:* S–M. *Owner:* UI.

3. **Stop sending manager CSS and heavy brand assets to employees on slow data.**
   - *What:*
     - Split the stylesheets so employee routes don't load the clean-manager, insights, schedule-grid and timecards CSS.
     - Draw the wordmark as SVG paths instead of a PNG inside an SVG `<image>`.
     - Point the Clocker at the existing Inter woff2 instead of the TTF.
   - *Why:*
     - `src/app/app/layout.tsx:1-20` plus `src/app/layout.tsx:4-7` import about 1.6 MB of source CSS (about 210 KB gzipped) on every portal page. That includes `premium-clean-manager.css` (220 KB), `clean-manager/schedule.css` (67 KB) and `clean-manager/timecards.css` (46 KB). CSS blocks rendering, so the download comes before the employee sees their shift.
     - `BrandWordmark` loads `/images/nevora-wordmark.png`, a 907×122 image of 120 KB, through SVG `<image>` (`src/components/brand-mark.tsx:46,51`). This skips `next/image` resizing.
     - The Clocker loads `inter-variable.ttf` at 877 KB (`src/components/clocker-shell.module.css:1`), while `public/fonts/typeface/inter/variable.woff2` is 242 KB.
   - *Impact:* High for employees on prepaid data. *Effort:* M. *Owner:* UI.

4. **Keep the last-loaded schedule readable offline.**
   - *What:* Cache a read-only copy of the employee's next 7 days. Show it offline with "Saved Tue 8:12 AM. It may have changed." Clear it on sign-out, and translate the offline page.
   - *Why:* The service worker only swaps a failed page load for `fuel-portal-offline.html` (`public/fuel-portal-sw.js:87-101`). That page says, in English only, "Reconnect to see your schedule". "When do I work tomorrow?" is the top employee question, and people ask it on the bus with data off.
   - *Impact:* High. *Effort:* M. *Owner:* UI and Backend (privacy and logout cleanup, `src/lib/notifications/logout.ts`). Product signs off on what may be stored on a device.

5. **Rewrite the failure and status copy in plain language (about grade 6, at most 15 words, one action), and give Clocker errors the Spanish line.**
   - *Why:*
     - Clocker errors are the longest, most technical text in the product, and the Spanish second line doesn't cover them:
       - `src/components/clocker-punch-panel.tsx:101` is 37 words and says "nothing was replayed";
       - `:102` says "it keeps the original request ID";
       - `:71` says "Allow browser storage" to a worker at a locked shared tablet;
       - `src/components/clocker-pin-gate.tsx:41` says "clear tablet verification".
     - The Clocker setup screen tells staff "Cookies must be allowed" (`src/components/clocker-setup.tsx:97`).
     - The Clocker shows the raw zone ID "America/Puerto Rico" (`src/components/clocker-shell.tsx:46`), and its date stays English when Spanish is on (`:25`).
     - On employee Home and My time, the status line "No open time entry was recorded at the last check." (`src/components/employee-time-panel.tsx:69`) could say "You're not clocked in."
   - Button names that test scripts press, and payroll and legal copy, stay as they are.
   - *Impact:* High. *Effort:* S. *Owner:* UI (copy). Product approves the Spanish.

6. **Make push notifications say something useful without opening the app.**
   - *What:* Put safe facts in the push, such as "Your schedule for Oct 26 – Nov 1 is posted" or "Your time off for Oct 29–30 was approved". Never include pay amounts. Send it in the user's language.
   - *Why:* Today's bodies are generic English: "Open NEVORA to review an update." and "Schedule review" (`src/lib/notifications/recipients.ts:98,150,178`). Each one costs an app open (data and a sign-in) to learn one fact.
   - *Impact:* Medium. *Effort:* S–M. *Owner:* Backend, with Product deciding what may show on a lock screen.

7. **Let a manager on the floor decide simple requests with one thumb.**
   - *What:*
     - Put Approve and Decline in the Inbox request sheet, pinned to the bottom, for time-off requests with no conflicts.
     - Move timecard bulk "Select" into a bottom action bar.
     - Consider a direct path to "Missing clock-out" fixes from Home.
   - *Why:*
     - The sheet tells managers "Approve or decline it on the full request." (`src/components/manager-inbox.tsx:139`), which adds a step.
     - On phones, Timecards sits behind More (the "< More" back link in `AUDIT-M-timecards-390.png`), and "Select", search and the bell sit top-right, out of thumb reach on 6.1-inch and larger phones.
     - The full request page already pins its decision buttons to the bottom (`qa-out/final-mgr-phone/c390/AUDIT-M-_app_requests_tab_pending_requestId_audit_timeoff-…png`), so the pattern exists.
   - *Impact:* Medium. *Effort:* M. *Owner:* UI. Product decides whether a sheet decision is acceptable for trust.

8. **Test Spanish text length before B5.**
   - *What:* Run a pseudo-locale pass that makes every string 35% longer, at 320 and 390px, and fix what breaks.
   - *Why:* Spanish runs about 20–30% longer than English. The 5-tab employee bar uses 10px labels with `white-space: nowrap` (`src/app/globals.css:11517`). "Solicitudes" in place of "Requests" at 320px is the likely first break. Segmented controls like "Act now / Requests / Plan ahead" (`AUDIT-M-inbox-390.png`) already fill the width.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

9. **Use words people use on the floor in the manager Inbox's "Plan ahead" rows.**
   - *Why:* Rows like "People without hour targets", "Availability deadline: Not set" and "Schedule not confirmed" (`AUDIT-M-inbox-390.png`) are system terms. A shift lead reading at speed has to work out what each one asks them to do. Make each row a verb ("Set weekly hours for 13 people").
   - *Impact:* Low–Medium. *Effort:* S. *Owner:* UI.

10. **Give older Owners a "Larger text" choice on desktop.**
    - *Why:* Desktop tables use 13–14px grey secondary text, grey "Draft" status and very faint row checkboxes (`QAOWNER-timecards-1440.png`). Browser zoom works, because type is rem-based, but many older owners don't know about it. A Profile setting that scales the root font by 112% would help them, and the layout already handles larger text.
    - *Impact:* Low. *Effort:* S. *Owner:* UI.

## What's good
- Type grows with the reader's text-size setting (rem sizes, plus the text-scale hook in `src/app/layout.tsx:27`). The request page pins Approve and Decline in the thumb zone. Clocker buttons are 56px tall (`clocker-shell.module.css:65`).
- Background refreshes stop when the tab is hidden or offline (`src/components/timecards.tsx:151`, `src/components/manager-today.tsx:23-25`, `src/components/use-inbox-count.ts:34`), which saves data.
- The shared tablet protects privacy. The PIN session clears itself after 30 seconds and whenever the page is hidden (`clocker-pin-gate.tsx:49-61`). Spanish labels are on by default, remembered per tablet, and marked `lang="es"` so screen readers use a Spanish voice.

## Not checked / limits
- No browser use: this brief didn't allow it. Popover failure on iOS 16 is inferred from browser support data and the code; I didn't reproduce it on a device. No low-end Android test either.
- Byte counts come from source files (raw, and gzip -9 of the concatenated CSS), not from built and minified output or a measured page load.
- Reading levels are judged from word count and vocabulary, not scored with a tool. No interviews with real users.
- Lead-role pages and the Clocker PIN and keypad screens beyond the setup screen weren't reviewed in screenshots.
