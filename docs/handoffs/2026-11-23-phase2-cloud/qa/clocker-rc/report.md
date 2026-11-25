# Clocker release check, 2026-11-25

**Tested:**
- Browser runs on `6801e035a`.
- The regression gate on `6801e035a`.
- The unit suite again on the release candidate `341f2a2a9`. That commit is `6801e035a` plus the GSAP guard (`src/test`), the coverage fixture fix (`src/test`) and the guide rebuild, with no app code changes.

**Setup:**
- Production build (`next build`, `next start`) at the owned https test origin, behind the loopback TLS proxy.
- A throwaway local PostgreSQL with fictional people and tablets.
- Chromium and WebKit from Playwright 1.62.1.
- "Open billing in Velani" was never pressed.

Raw results are in this folder (`clk-steps1-2-6801e035.json`, `scan-*.json`); screenshots are in `img/`.

## Verdict per item

| # | Item | Result |
|---|---|---|
| 1a | Clock in at: a double click or double Enter on Save sends exactly 1 POST | **PASS** in Chromium and WebKit |
| 1b | "View paused" on window blur | **FINDING F1**: affects the whole app (32 routes), the same in Safari and Chrome |
| 2 | Clocker steps 1–3, WebKit and Chromium | **PASS** with findings F2 (CLS), F3 and F4 (WebKit only, low), and info notes |
| 2 | Name hint cookie holds only `picker` or `id`, scoped to the location's path | **PASS** |
| 3 | Regression sweep | **PASS**: the only unit failures were the 2 fixed in `341f2a2a` |
| 4 | Flaky coverage-actions-response test | **FIXED** in the test fixture (`d37ef1ff` on the shared branch); cause below |
| — | Unit suite on `341f2a2a9` | **PASS**: 16,422 passed, 0 failed (guides included) |

## Findings

**F1, medium, both engines: tabbing past the last control replaces the page with "View paused".**
- **Cause:** `src/components/company-access/scoped-read-frame.tsx:180` pauses on window `blur` and `pagehide`, as well as `visibilitychange`.
- **Measured:**
  - Tabbing past a page's last control moves focus to the browser. The window blurs once in both WebKit and Chromium, and the page shows "View paused — Come back to this window to see current information. Try again".
  - Measured on Clock in at, Payroll export and Timecards. By code it covers the 32 routes rendered in `ScopedReadFrame`: Home, Things to do, Schedule (7), Team and person pages (8), Payroll export (2), Timecards (3), Updates (3), Insights (2), Clocker PINs and photos (3), Account recovery.
- **Unsaved changes:**
  - When the window regains focus, the page resumes on its own and an unsaved tick on Clock in at is kept.
  - Pressing "Try again" remounts the page and loses the unsaved tick: it came back as SELECTED West and Old San Juan, without Main.
- **Other triggers:** in headless mode, `alert`, `confirm`, `print()`, a file input click and bringing a second tab to the front fired no blur. Headless browsers have no OS focus, so these need a headed check on a real iPad, Mac or PC. On a real browser, the address bar, a native file picker or print dialog, and switching windows are expected to blur.
- **Suggestions:** pause only on `visibilitychange` to hidden, or ignore a blur that comes back within a few seconds. Either way, "Try again" should keep unsaved form state.

**F2, medium, Chromium (WebKit has no layout-shift API): a tablet's first load without the hint cookie shifts.**
- **Measured:** an Employee ID tablet with no hint has CLS 0.2325 at 768×1024 and 0.135 at 1024×768, both above 0.1. The page first draws the name picker's shape, then moves to the ID form: `task` 380→619 px and `card` 6→195 px.
- **When it happens:** on the first load after setup, or whenever cookies are cleared or blocked. A name-picker tablet with no hint is 0.030 at 768 and 0.037 at 1024.
- **With the hint:** a correct hint gives ≤ 0.0024 in every case.
- **Wrong hint:** about 0.20 at 768 and about 0.10 at 1024. The code comment at `src/components/clocker-roster.ts:66-69` expects that cost.
- **Location:** the first paint without a hint, `src/app/clocker/[location]/page.tsx:47`. A neutral first shape, or the Employee ID shape when there's no hint, would avoid it.

**F3, low, WebKit only: the Clock in at row summary is cut at 768 with 200% text.**
- WebKit shows "Every location · Includes locations added …"; Chromium shows the whole line (`img/webkit-row-every-en-768-200.png` against `img/chromium-row-every-en-768-200.png`).
- **Cause:** the shared rule `src/components/corp/corp.css:79` (`.c-row__detail > span:first-child { white-space: nowrap; text-overflow: ellipsis }`), combined with WebKit's slightly wider text.
- **Suggestion:** let the `#clock-in-at` detail wrap, as `src/components/team/team-forms.css:117` does for the person summary.

**F4, low, WebKit only:** the Clock in at save round trip logs `TypeError: Load failed` twice in the console. These are fetches cut off by the reload, the same family as G69. Chromium logs none. No visible effect: the database and UI are correct after each reload.

**Info notes, not defects:**
- **Save while saving:** Save isn't `disabled` during "Saving…", but the JS guard holds. A double click and a double Enter each sent exactly 1 POST in both engines, for step 1 and for step 2's "Turn on name picker".
- **Use Employee ID at 390 with 200% text:** the button is below the fold at the top of the name list in both engines, and in view and unobstructed mid-list. WebKit draws it 109 px tall against Chromium's 67 px because the label wraps.
- **Skip link:** "Skip to time clock" shows no ring on its first focus stop and a 3 px white ring on the next, in both engines. Probably my sampling, during the link's own transition.
- **Known:** G69 aborts in WebKit (4 views).

## 2. Clocker steps 1–3 in detail

**Step 1, Clock in at on the person page:**
- **Views:** 104 across 390, 768 and 1440, 100% and 200% text, English and Spanish, in both engines.
  - Overflow 0, axe 0 and reach misses 0 at ±21.5 px. Radios and checkboxes were judged through their 44 px label rows.
  - The only clipping is F3.
- **Focus:** Cancel, by keyboard or click, returns focus to the row (`a.c-row`, URL `#clock-in-at`). Save moves focus to "Saved"; closing then returns focus to the row. The walk has 4 stops, each with a 2 px #0B6E69 outline.
- **States:**
  - Nothing ticked: Save disabled, plus "Choose at least one location to save."
  - Saving: "Saving…".
  - Couldn't confirm: the callout takes focus; Reload profile restores the saved value.
  - Stale, with two contexts: "This employee changed…"; Save disabled.
- **Round trip, both engines:** ASSIGNED → SELECTED {loc-2} → ALL {} in the database. The UI matches after each reload.

**Step 2, How staff sign in, in the tablet options sheet:**
- **Views:** 76 across 390, 768 and 1440, 100% and 200%, English and Spanish. No overflow, clipping, axe or reach issues.
- **Name picker:** choosing it shows the amber warning, tied to the choices with `aria-describedby`, and the button reads "Turn on name picker".
- **Round trip:** a double click sends 1 POST and the database goes EMPLOYEE_ID → NAME_PICKER (version +1). After reload NAME_PICKER is checked. Switching back to Employee ID uses "Save".
- **Saved:** the callout takes focus.
- **Stale, with two contexts:** "Check this tablet" plus the server's sentence; focus on the callout; a 358×52 Reload button.
- **Focus:** the walk stays inside the sheet with a ring on every stop. Escape returns focus to the tablet's row.
- **Reduced motion:** only opacity transitions, 150 ms, in Chromium.
- **Read-only tablet:** "Set up this tablet first…".

**Step 3, iPad name picker** (the shared branch's own ui-scan names, motion and cls modes, run in WebKit and Chromium):
- **End to end, both engines:**
  - By name: Ana clocked in, then out, and the database has the entry.
  - Use Employee ID: James.
  - Duplicate: both Luis entries hidden; Luis verified by ID.
  - Stale: Miguel removed from the list after a re-read.
  - Roster failure: falls back to "Names couldn't load. Use your Employee ID." and then James verifies.
  - Device revoked: "This tablet needs to be set up again", and the hint is cleared.
- **Spanish (WebKit):** the same flows pass, apart from two steps the tool selects by their English label (a tool limit).
- **Layout:** axe 0 and overflow 0 in every state.
- **Name box at 390:** the names scroll in their own box, and the way out stays in view and unobstructed mid-list in WebKit too, where `:has()` is supported.
- **Motion (WebKit):** tiles settle, the chosen name moves into the PIN header, and PIN dots grow in without overshoot (scale 0.55 → 0.99 → 1). The wrong-PIN shake wasn't seen in the sampled frames.
- **Reduced motion:** no animations, CLS 0.
- **Hint cookie:** `nv_clocker_layout` holds only `picker` or `id`. It is written with `Path=/clocker/<key>; Secure; SameSite=Lax; Max-Age=31536000` (`src/components/clocker-roster.ts:85`) and read back only as `picker` or `id` (`:73`).

## 3. Regression gate on 6801e035a

- **Typecheck:** 0. **Lint:** 0.
- **Unit:** 16,419 passed, 2 failed.
  - The GSAP guard: fixed in `65c61f407` with a Clocker-only allowlist.
  - `manual-publication`: the guides, rebuilt in `341f2a2a`.
- **readiness-ui (production https) ×3:** 3 of 3 complete; Chromium 7 and WebKit 7 checks each; 0 errors.
- **Concurrency (dev) ×2:** 2 of 2 complete; 20 and 20 checks; 0 errors.
- **Clocked-in Payroll probe:** the form passes in both engines; history loads 100 events on the same node.
- **Step 1 recheck:** clean.
- **Unit on `341f2a2a9`:** 16,422 passed, 0 failed.

## 4. The flaky test

**Coverage fixture:**
- **Cause:** `src/test/fixtures/owner-coverage-action.ts` read the clock twice. `preparedAt` came from `new Date()` and `expiresAt` from `Date.now()+300000`. `parseCoverageActionResult` requires a gap of exactly 300000 ms.
- **When it fails:** a millisecond tick between the two readings, more likely under load.
- **Fix:** one clock reading.
- **Proof:** with `Date.now()` forced 1 ms ahead, the old fixture fails 3 of 3 states; the new one passes, along with 40 coverage tests.
- **Commits:** `54630e360` on this branch, cherry-picked as `d37ef1ff`.

**Greeting test:**
- **Cause:** `owner-b-copy.test.tsx` on screens-final expected "Buenas tardes" at any hour.
- **Fix:** pin the clock to 3 PM Puerto Rico time.
- **Patch:** `../patches/screens-final-owner-b-copy-clock.patch`.
- **Proof:** it failed at 05:05 UTC and passes after the fix, 10 of 10.
