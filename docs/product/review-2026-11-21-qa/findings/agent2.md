# Agent 2: mobile, tablet, desktop and motion. Review tip 6601ee82a (Nov 21, 2026)

Saved by the lead from Agent 2's hand-back, because the subagent could not write files.

Evidence is in this folder:
- Marked-up screenshots: `shots/A2-*.png`.
- Frame sequences: `shots/motion/`. Simulator shots: `shots/ios-sim/`.
- Scripts: `scripts/` (including `access-repro.mjs`).
- Raw data: `own-*-m2.json`, `emp-*-m2.json`, `motion*.log`, `sheets.log`, `kbd.log`, `longname.json`.

**Where the results come from.** The shared live app at :59493 was overloaded:
- notifications and the access check returned 503 after 11–17 s;
- the database hit statement timeouts (57014);
- Owner pages took 30–60 s;
- QAOWNER sign-in was rate-limited.

So Agent 2 started its own held app, with the same seed and Rondo switches, at http://127.0.0.1:53617, and stopped it afterwards. Results are from that app unless marked "live".

**Caveats.** Both apps ran `next dev`, so absolute times are inflated; compare relative behaviour. No data was changed.

**Evidence labels:**
- `chromium-desktop`
- `chromium-touch-emulation`
- `webkit-playwright`
- `ios-simulator`
- `source-only`

No real-device evidence.

## Findings
| ID | Sev | Finding | Evidence | Verified |
|---|---|---|---|---|
| A2-01 | **P1** | **Owner pages drop their content while idle.** About every 15 s the access check re-runs and the page refreshes. A slow check sends the page to Loading, then a red "Couldn't check your access / Try again" card, then it recovers. All requests returned 200.<br>• Schedule 1440: content 3.5 s, Loading 16.8 s, error 19.4 s, back 25.8 s.<br>• Schedule 390 touch: error at 4.5 s during first load, again at 21.4 s, still showing at 45 s.<br>• Timecards 390: error at 22.3 s.<br>• Team on Fast-3G: never rendered in 45 s.<br>Likely cause: `src/components/company-access/scoped-read-frame.tsx`. The snapshot lasts at most 15 s, delivery included; the early refresh starts at 65% of that, and STUCK_MS turns a slow check into the failed state.<br>Expected: a background check keeps the current view and shows the error only when access is actually refused. | `shots/A2-01*.png`, `scripts/access-repro.mjs` | reproduced 3x, 2 routes, desktop + touch; also seen on live. **Confirm on a production build.** |
| A2-02 | P2 | **Timecards jumps while loading.** CLS is 0.96 at 390 touch, 0.15–0.18 on live, 0.09 on desktop. For about 60 ms a white corporate header replaces the band. The Time exports card then swaps in and gets pushed down. Tapping Last week shifts the page by 0.81 + 0.23. FIXED-AND-REMAINING claims zero shift. | `shots/A2-timecards-load-sequence-390.png`, `shots/motion/load-timecards-390/` | touch + desktop |
| A2-03 | P2 | **Owner Home briefly shows a "First week setup" card** for about 100 ms in a workspace with three weeks of history. Things to do and Today then swap places and Today drops about 340 px. CLS 0.13. | `shots/A2-owner-home-load-sequence-1440.png` | desktop |
| A2-04 | P2 | **Next week replaces the whole Schedule page, band and switcher included,** with a generic list skeleton. A second tap is impossible while it loads. Settles in about 7 s on dev. Desktop shows no visible change for 1.3 s; production prefetch may shorten that. | `shots/A2-schedule-next-week-desk-frames.png` | desktop + touch |
| A2-05 | P2 | **Home shortcut labels are cut off between 768 and 803 px.** Employee: "Can't w…", "Swap s…", "Fix my t…". Owner: "Add employee", "Send update". | `shots/A2-05*.png` | width sweep |
| A2-06 | P2 | **Schedule grid at 768 touch:** every capsule's position reads "Front co…". The "4 open" chips are 36 px tall, under DESIGN.MD B1's 44 px floor for touch tablets. | `shots/A2-06*.png` | touch |
| A2-07 | P2 | **Add shift on a phone: Save is only in the top header, which isn't sticky.** With the keyboard on Note, Save is 466 px above view and there is no Save at the bottom. | — | webkit-playwright (iPhone 15 Pro; keyboard approximated by a shorter viewport) |
| A2-08 | P2 | **The Clocker breaks words mid-word on short landscape screens.**<br>• 667x375: "Continu/e".<br>• 200% text at 844x390 and 667x375: "Ente/r", "Clea", and Continue cut off.<br>• 1024x768 at 200% is fine. | `shots/A2-08*.png` | harness, Chromium |
| A2-09 | P3 | At 768 touch, back links are 32 px tall and the bell is 40 px wide. | | touch |
| A2-10 | P3 | The phone Schedule day-strip buttons are 38 px wide at 320. | | touch |
| A2-11 | P3 | "Clocker tablets" is truncated in Settings at 768. | | |
| A2-12 | P3 | iOS Safari shows a grey strip under the status bar, above the teal band. `themeColor` is `#FFFFFF` (`src/app/app/layout.tsx:106`) and its comment is out of date. | `shots/ios-sim/` | ios-simulator |
| A2-13 | P3 | A 35-letter unbroken surname runs past the right edge of the Person title at 320 and 390. Hyphenated names are fine. | `longname.json` | synthetic DOM test |
| A2-14 | P3 | On the Clocker at 667x375 and 844x390, the safe way out (Stay on break, Done, Back) is below the fold. | | harness |
| A2-15 | P3 | The Clocker language button has a light teal fill (`--ck-soft`). It may conflict with "no light tinted buttons"; Jose's call. | | |

## Observations
- **Seed data, not a product defect:** Daniel's "Clocked in at 2:03 PM" sits next to a 6:30 PM shift.
- **Not a defect:** `body.scrollWidth` is 2 px over at phone widths, but `overflow-x: clip` hides it. `scrollX` stays 0 and nothing is cut.

## Viewport × screen matrix
320 is touch. 390 and 768 were run both as touch and as a narrowed desktop window. 900 and 1440 are desktop.

| Screen | 320 | 390 | 768 | 900 | 1440 |
|---|---|---|---|---|---|
| Owner Home | P | P | F A2-05 | P | F A2-03 |
| Schedule week | F A2-10, A2-01 | F A2-01, A2-04 | F A2-06 | F A2-01 | F A2-01, A2-04 |
| Schedule day | F A2-10 | P | F A2-06 | P | P |
| Team (long name) | P | P | P | P | P |
| Person | P* | P* | F A2-09 | P | P |
| Payroll run | P | P | F A2-09 | P | P |
| Timecards | F A2-02 | F A2-02, A2-01 | F A2-02 | F A2-02 | F A2-02 |
| Rondo | P | P | F A2-09 | P | P |
| Settings | P | P | F A2-11 | P | P |
| Employee Home | P | P (+ios-sim) | F A2-05 | P | P |
| Employee Schedule | P | P | P | P | P |
| Employee My time | P | P | P | P | P |

\* Person passes except the synthetic long-name test A2-13.

**Clocker kiosk sizes:**
- 1024x768: pass.
- 768x1024: pass.
- 844x390: fail (A2-08 at 200% text, A2-14).
- 667x375: fail (A2-08, A2-14).

## Motion
Measured on Agent 2's own app in Chromium. "First visible" is the first screenshot that changed; screenshots were taken every 50 ms, so allow ±100 ms.

| Interaction | Viewport | First DOM change | First visible | Settled | Verdict |
|---|---|---|---|---|---|
| Schedule options sheet | 390 touch | 2 ms | 182 ms | 475 ms | P |
| Location sheet | 390 touch | 2 ms | 146 ms | 438 ms | P |
| More menu | 1440 | 1 ms | 125 ms | 265 ms | P |
| ⌘K search | 1440 | 18 ms | 61 ms | 666 ms | P |
| Escape closes a sheet | all | — | 10–38 ms | — | P |
| Day switch | 390 touch | 113 ms | 396 ms | 561 ms | Borderline: about 110 ms with no feedback |
| Next week | 390 touch | — | 429 ms | 7.0 s | F A2-04 |
| Next week | 1440 | — | 1303 ms | 6.7 s | F A2-04 |
| Nav Home → Schedule | 390 touch | — | 215 ms | 1980 ms | P |
| Nav Schedule → Team | 390 touch | — | 142 ms | 783 ms | P |
| Sidebar Home → Payroll | 1440 | — | 144 ms | 1011 ms | P |
| Add shift | 1440 | — | 162 ms | 681 ms | P |
| Timecards → Last week | 390 touch | — | 139 ms | 472 ms | F A2-02 (0.81 shift) |
| Employee Shift details sheet | 390 touch | — | 233 ms | 883 ms | P |
| Employee Next week | 390 touch | — | 416 ms | — | P |
| Employee Time off | 390 touch | — | 156 ms | 1475 ms | P |
| Employee nav Home → Time | 390 touch | — | 111 ms | 891 ms | P |

**Page-load CLS:**
- Timecards: 0.96 (F).
- Owner Home: 0.13 (F).
- Team: 0.025 (P).

**Reduced motion:** pass. Sheets, menus and search open with no animation, and `b-arrive` and `b-home-bar` are removed. Only a 150 ms opacity fade remains on Timecards (`eb-keep-fade`), which is acceptable.

## Checked and good
- No sideways scroll at any width.
- Inputs are 16 px or larger, so iOS won't zoom (Sign in is 17 px).
- With the keyboard approximated in WebKit, the focused field stays visible on Time off, Fix my time and Sign in.
- Safe areas: `viewport-fit=cover`, `env(safe-area-inset-*)` on the bottom nav and kiosk, and a transparent tap highlight.
- Sheets open, scroll and close with Escape or Done in WebKit at iPhone 15 Pro and 320x568.
- Long hyphenated and multi-part names wrap well.
- Clocker harness: 39 steps ok, 0 axe violations in 24 states.
- iOS simulator (iPhone 17, iOS 27 Safari):
  - Sign in with the real keyboard keeps the fields and the Sign in button visible.
  - The Employee Shift details sheet sits above the Safari toolbar.
  - The first tap was ignored, which is attributed to lag on the loaded Mac.

## Gaps
- No real devices. Keyboard results other than Sign in are approximations.
- No production build: every timing is from `next dev`.
- Clocker not tried in the simulator, because it needs a tablet enrolled with an Owner code. Clocker reduced motion was not re-run.
- iPad simulator: another session was using it, so it was left alone.
- Not run: touch at 900 and 1440, the full matrix in WebKit, Firefox, VoiceOver.
- Not opened, because the selectors missed them: the Owner More sheet and the Employee account menu.
