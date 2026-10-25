# v5 "One look": build report (run 1, Oct 24, 2026)

Jose approved round 2 of the v5 mockups with "Yes approved exactly like this". This run builds the approved screens on the
Quiet kit for Employees and Leads, plus the dark-mode and Manager states. Every check used local fictional data.

## What was built

| Mockup | Route | Notes |
|---|---|---|
| E01 Home | `/app` | Greeting, gradient next-shift card, Needs you (tinted icons, weeks merged into one row), This week glance |
| L01 Lead Home | `/app` (Lead) | Adds Today's team → Message today's team (the existing compose) |
| E02 Schedule | `/app/schedule` | Week strip, confirm row, the chosen day, Coming up; Open shifts segment |
| E03 Shift sheet | Schedule → tap a shift | Native dialog sheet; also opens from `?shift=` for deep links and no-JS |
| E04 Swap sheet | `/app/exchange/swap` | Intercepted route: a sheet over Schedule, the same page by URL |
| Offer it for cover | `/app/exchange/swap?mode=cover` | New cover mode on the swap route; same reviewed-terms check |
| E05 Unable to work | `/app/exchange/callout` | Intercepted route; six reasons as choice rows |
| E06 Requests | `/app/requests/hub` | Waiting, Ask for, the help |
| E07 Time off | `/app/requests` | Waiting / Decided segments; each request opens its sheet (status, timeline, note, Withdraw) |
| E08 Time-off sheet | `/app/requests?tab=new` | Full days / Part of a day, picker rows, note, Send in the bar |
| E09 Shift requests | `/app/exchange` | Open shifts / For you / Yours; each row opens a sheet with its actions |
| E10 Availability | `/app/availability` | Seven rows; a day opens a sheet (switch, From, Until); Save in the bar |
| E11 Pay | `/app/my-pay` | Next payday line, This week rows, statements, privacy note (wording unchanged) |
| E12 My time | `/app/my-time` | Status rows, Today, Earlier entries (sheets), corrections |
| E13 Updates | `/app/updates` | Segments, one row per update, Plus messages today's team |
| E14 Notifications | `/app/notifications` | The Quiet list for Employees and Leads (no Mark read: it is management-only) |
| E15 More | `/app/more` | A page for Employees and Leads |
| E16 Profile | `/app/profile` | Who you are, Settings (sheets), Work details, Your account, Sign out |
| E17 Delete account | `/app/account/delete` | The approved regrouping: three rows; the retention schedule opens from "What may be kept" |
| D01–D06 Dark | all of the above | Dark tokens; sign-in and Owner Today follow the phone |
| M01 family | `/app` for a Manager with no access | One Quiet "No access yet" page, same words |

Comparisons (mockup beside build) are in `build-run-1/`.

## Deviations from the mockups (each keeps an existing feature or reflects missing data)

1. **"This week 32.5 h" on Pay and My time.** The time read has no weekly total, so the rows link to My time and
   Timecards without a figure. A weekly total needs a server read (not added).
2. **Lead "4 on shift now".** There is no read of who is on shift for a Lead, so that row is not shown. Message today's
   team is shown (it exists today).
3. **Lead Home keeps This week** under Today's team, since the team section has one row.
4. **Clock status on Home** shows only while a shift is under way (E01 has none); My time keeps it at all times.
5. **Schedule week arrows and Today** sit in the bar beside the calendar icon (E02 has no week navigation).
6. **Availability** keeps a Usual week / Week of … segment, so a schedule week can still be submitted.
7. **Swap note field** (E04) is not shown: the swap command takes no note.
8. **Notifications back link** says Home (the Employee tab), not Today.
9. **Schedule notices name their week** only when the notice link carries `week=`; today's server links for
   "Schedule update" do not, so the week line appears as data allows.
10. **Profile** keeps passkeys (when on), Alerts on this device and the calendar subscription.
11. **Shift lead wording**: Schedule and sheets say "Shift lead" (E03); Shift requests keep "Designated lead".
12. **Page behind a sheet** dims but does not scale back (a Phase 3 item).

## Checks run

- TypeScript: `tsc --noEmit` clean.
- ESLint on every changed file: clean.
- Unit tests: `vitest run`, 9,617 passed, 0 failed (577 files). Tests that asserted the Signature markup were updated
  to the v5 markup with the same intent; five new tests guard the cover mode (changed source terms are refused) and
  the shift sheet's links.
- Production build (`next build`): succeeds; the intercepted routes `/app/(.)exchange/swap` and `/callout` build.
- Browser flows (Chromium, 390×844, dev and production builds): shift sheet → Swap → Cancel; Offer for cover →
  Escape; Unable to work → choose a reason → Escape; soft navigation to Requests leaves no sheet open; a bad shift id
  still redirects. Time off: Request time off → Part of a day → Cancel; a request's sheet → Done. Availability: a day
  sheet toggles the day and Save turns on; the form posts the same fields. No console errors.
- Keyboard and reduced motion: Enter opens the shift sheet, Tab walks its actions, Escape closes and returns focus;
  under reduced motion the sheet has no transition.
- 320 px: no horizontal overflow on 17 Employee routes.
- Dark: Home, Schedule, Requests, Profile, sign-in and Owner Today compared with D01–D06.

## Not covered

- A real iPhone (Safari), and WebKit after sign-in (the Secure cookie on localhost).
- The GitHub cloud suites for this change.
- Screen-reader passes (VoiceOver), beyond the semantic checks above.
- Desktop layouts for the new pages (desktop comes after the phone, per the plan).
