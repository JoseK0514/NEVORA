# 26 Accessibility Engineer (motor and vestibular): touch targets, drag alternatives, reduced motion, timeouts

**Verdict.** On phones, the v3 Owner and Manager pages are mostly safe for motor and vestibular needs. Pages load with no movement, almost every target is 44px or larger, and every sheet can be closed with a tap instead of a swipe. Two defects affect real users, though. With Reduce Motion on, every success banner is invisible, because a catch-all `animation-duration: 0ms` sends the banner's 5.2-second fade straight to opacity 0. Separately, Timecards clears its data every 30 seconds and whenever the window loses focus, so focus jumps to `<body>` and any selection or typed note is lost, with no warning.

Evidence comes from read-only Playwright runs on the preview with the Owner (QAOWNER) and Manager (AUDIT-M) accounts, on Chromium with isMobile and hasTouch. I covered 18 Owner and 12 Manager routes at 390 and 320 wide (about 1,350 targets). Each target was hit-tested with `elementFromPoint` from its centre outward, so invisible hit extensions count. Reduced motion was emulated, and I ran timed probes of 30 to 70 seconds.

## Recommendations

1. **Make success banners visible when Reduce Motion is on.**
   - *What:* exempt `.form-success` from the kit's catch-all, for example `.nv-page *:not(.form-success)`. A better fix is to stop using a CSS animation as a timer. Hand redirect flags to the existing `Toaster`, which pauses on hover and focus and has a 44px dismiss button, or leave the banner in place without a timer.
   - *Why:* `src/components/kit/kit.css:338-341` sets `.nv-page * { animation-duration: 0ms !important }`. That turns `nevora-banner-fade 5.2s` (`src/app/app/portal-motion.css:186-208`) into a 0s animation, and its `both` fill lands on the last keyframe, `opacity: 0`.
   - *Measured:* opacity was 0 at 0.5s, 3s and 6.5s on `/app/schedule?updated=1` (390), `/app/schedule/settings?saved=1` (390) and `/app/schedule/templates?saved=1` (1440). With motion allowed, the same banner showed at opacity 1. Users who turn on Reduce Motion never see "Shift updated.", "Scheduling rules saved." or "Template saved.".
   - *Impact:* High. *Effort:* S. *Owner:* UI.

2. **Stop Timecards from wiping state every 30 seconds and on window blur.**
   - *What:* keep the privacy pause, but revalidate in the background and keep the previous rows on screen while it runs. Keep selection and reopen notes keyed by employee ID and revision, and clear only the cards whose revision actually changed. Put focus back on the same row key afterwards. When a snapshot expires, refresh it quietly instead of showing "Timecards expired".
   - *Why:* `src/components/timecards.tsx:151` polls `sync()` every 30s, and `sync()` calls `clear()` (`:146`). `clear()` runs `clearBatch()`, `setNotes({})` and `setData(null)`. The same happens on `blur`, `pagehide` and when the 45-second snapshot expires (`:122`). The server caps the snapshot at 45s (`src/lib/timecards/service.ts:124`).
   - *Measured:* at 390 I focused the fourth row. Focus fell to `<body>` at about 37s. The status cycled to "Checking period timecards…" every 30s while the sheet was open.
   - *Who it hurts:* switch-access, keyboard and slow-input users lose their place, their selection and any typed reopen note, with no warning and no way to extend. This fails WCAG 2.2.1 (Timing Adjustable) and 2.4.3 (Focus Order).
   - *Impact:* High. *Effort:* M. *Owner:* UI, plus Backend if the server lifetime needs a renew endpoint.

3. **Respect Reduce Motion on landscape phones.**
   - *What:* add the landscape coarse-pointer branch to the reduced-motion override.
   - *Why:* the sheet rule (`portal-motion.css:38`) covers `(max-width:760px)` and also landscape phones (`max-height:430px`, coarse pointer). The reduced-motion override (`:147`) covers only `(max-width:760px)`.
   - *Measured:* at 844×390 with Reduce Motion on, opening More still ran a 320ms `transform` slide. In portrait the same sheet only fades, which is correct.
   - *Impact:* Medium (vestibular). *Effort:* S. *Owner:* UI.

4. **Give the remaining 32px controls a 44px hit area without changing how they look.**
   - *Measured on phones (390 and 320):*
     - Availability filter chips `.wa-chip` have a 38px hit area (Owner and Manager).
     - Locations filters `.nv-filter` have 36px (`premium-clean-manager.css:206`).
     - Payroll section tabs `.section-tab` have 42px (`:257`).
   - *Why:* all of these pass WCAG 2.5.8 (24px or larger, and well spaced) but break the spec's constant "every target 44px" (`spec.md:21,42,159`).
   - *What:* the chips already use an `::after { inset: -6px 0 }` extension. Extend it to `-6px` plus the track padding so each reaches 44, and add the same to `.nv-filter` and `.section-tab`. The look stays at the iOS 32pt segmented size.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

5. **Remove or wire up the Inbox sheet's grab handle.**
   - *What:* either connect `dialog.cm-sheet` to `SheetGestures` and keep the Done button, or remove the handle.
   - *Why:* `manager-inbox.tsx:524` and `premium-clean-manager.css:101` draw a drag handle, but `SheetGestures` only handles `[popover]:popover-open` (`sheet-gestures.tsx:11`). The handle invites a drag that does nothing. That drag is the hardest gesture for motor-impaired users, and it fails silently. The Timecards sheet has no handle, so the two sheets also behave differently.
   - *Impact:* Low to Medium. *Effort:* S. *Owner:* UI.

6. **Make swipe-to-dismiss less sensitive to tremor.**
   - *What:* raise the flick threshold to about 0.5px/ms with at least 56px of travel, and require some distance before a flick counts.
   - *Why:* a flick closes the More sheet at only `FLICK_VELOCITY = 0.11px/ms` and `FLICK_MIN_TRAVEL = 24px` (`sheet-gestures.tsx:13-15`). The click under the finger is then swallowed (`:77`). A 25px downward slip while tapping a menu item closes the sheet and drops the tap.
   - *Impact:* Low. *Effort:* S. *Owner:* UI.

7. **Lengthen toasts on touch.**
   - *What:* scale the lifetime with the text, for example 4s + 60ms per character with a 6s minimum. Make sure the outcome is also visible on the page.
   - *Why:* `toaster.tsx:13` sets `DURATION = 4500`. Measured: "Time off approved. The employee will be told." stayed about 4.6s at 390. Phones have no hover, so pausing needs a tap that many users won't think to make.
   - *Impact:* Low. *Effort:* S. *Owner:* UI.

8. **Fix the 1px shortfalls.**
   - *Rows:* the "Show N more" and disclosure rows (`.nv-row` on Home, Inbox, Schedule, Timecards) are 44px boxes, but the bottom pixel hits the parent `<li>`, so the effective hit area is 43px.
   - *Week strip:* at 320 the day buttons (`.cm-week__day`) are 43px wide on alternating days.
   - *Finder:* the search field is 42px tall.
   - *What:* set `pointer-events: none` on the separator or li padding, and give the week strip `minmax(44px, 1fr)` with a smaller gutter at 320.
   - *Impact:* Low. *Effort:* S. *Owner:* UI.

9. **Lock these checks in with one regression test.**
   - *What:* one Playwright spec that loads each Owner and Manager route at 320 and 390 with `reducedMotion: 'reduce'`. It asserts no `transform`/`translate` animations, every hit-tested target at least 44px, banner opacity 1 one second after `?saved=1`, and that focus stays on a Timecards row after 35s.
   - *Why:* defects 1 and 3 are cascade problems that QA screenshots can't catch.
   - *Impact:* Medium. *Effort:* M. *Owner:* UI.

## What's good
- **No load motion.** With Reduce Motion on, I recorded 0 animations during load on all 17 Owner routes I sampled, and even with motion allowed nothing moves. The scroll-linked edge fades only change a mask. JavaScript smooth scrolling is gated on the Reduce Motion setting (`app-shell.tsx:130`, `focus-on-arrival.tsx:12`), and pinch-zoom is not locked.
- **Every swipe has a tap alternative, and there is no drag-only interaction.** The More sheet has Close (390×48), the Inbox sheet has Done (60×44), the Timecards sheet has Done (50×44) and the finder has Close search (60×44). The schedule has no drag-and-drop. The More sheet's 18 items are all at least 44px even at 320×640.
- **Toaster.** It pauses on hover, focus and hidden tab, and has a 44px dismiss button.

## Not checked / limits
- Only Chromium emulation was used. I did not test real iOS Safari or Android devices, VoiceOver, Switch Control, WebKit or Firefox. A real swipe-and-slip gesture was judged from the code, not performed.
- **Timecard selection loss** comes from the code. With the fictional period, every timecard checkbox is disabled, so I could only show the focus loss and the 30-second refresh cycle live. Payroll export expiry (`payroll-export.tsx:71`) was not exercised.
- Desktop pointer sizes and Employee and Lead pages were out of scope. Kiosk timeouts were not reviewed: Clocker PIN reset after 30s (`clocker-pin-gate.tsx:60`) and the punch panel auto-close after 5s (`clocker-punch-panel.tsx:56`). Those deserve their own 2.2.1 check.
- In the preview, the Next.js dev indicator covers the Home tab. It is dev-only and not a product issue. Targets inside closed disclosures were skipped because they can't be tapped until opened.
