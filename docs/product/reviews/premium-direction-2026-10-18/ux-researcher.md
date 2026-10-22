# Premium direction: what people expect, and where NEVORA stands

- **Role:** UX Researcher. Written 2026-10-18.
- **Input:** the new direction screenshots (`scratchpad/shots/r2-Home-Refined.png`, `p1-Home-Manager.png`, `p2-Inbox.png`, `p1-Request-Review.png`, `p2-Schedule.png`, `p2-Team.png`, `p2-Timecards.png`, `p3-Desktop-Home-1440.png`, plus `p3-State-Approved.png` and `p3-State-Home-Offline.png`), the two 2026-10-18 mobile reviews, `docs/product/trends-2026-10.md` (written yesterday), `TEAM-RULES.md` and the code.
- **Method:** 5 Mobbin screen searches (iOS), 12 web searches, 1 NN/g page read. This report builds on `trends-2026-10.md` and does not repeat its sections on passkeys, the notification prompt, Dynamic Type, phone search, pull to refresh, Live Activities or dark mode. It cites them where they apply.
- **Screenshot paths** below are short for `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/shots/`.
- **Limits:** Mobbin returned no screens from Homebase, When I Work, Deputy, Connecteam, 7shifts or Rippling. Competitor behaviour comes from their help pages, release notes and marketing, which I mark as vendor claims. I did not open any competitor app. No employee screens exist yet for the new direction, so employee findings use the current employee Home (`docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/18-visual-home-390.jpg`). Nothing ran on a physical phone.

## Summary

The new manager direction meets or beats the 2026 bar on the patterns that matter most for a workforce app: a one-line "what needs me" summary, one "Next up" action, update stamps, decisions only on full review screens, grouped work, and honest offline and empty states. Two things hold it back from feeling premium and trustworthy. First, some numbers can mislead: after shifts end, Home shows "Not in yet 0" next to a card about 3 shifts with no clock-in, and the header counts "2 things" while the Inbox badge says 4. Second, the direction is manager-first. The employee phone app is English only (`src/app/layout.tsx:22` sets `lang="en"`; Spanish exists only as second-line Clocker labels in `src/components/clocker-language.tsx` and payroll statements in `src/components/payroll/payroll-settings.tsx:84`). TEAM-RULES names "full Spanish" as what sets NEVORA apart in Puerto Rico, so this is the largest gap between promise and product. Leading tools show conflicts inside the time-off review, remind employees before a punch is missed, and show employees their hours so far. NEVORA's direction does none of the three yet. The top moves are Spanish for the employee and Lead app, numbers that state their scope, decision verbs only on decision screens, impact shown inside the review, and a single reminder that prevents missed clock-ins at the source.

## 1. What a premium phone app means in 2026, applied to NEVORA

Ahead, On par or Behind refers to the new direction screenshots unless a file is named.

| Area | What people now expect | Evidence (dated) | New direction | Verdict |
|---|---|---|---|---|
| Navigation | 4 or 5 bottom tabs, More for the rest, Back always returns to where you were, with the filter and scroll kept | HIG Tab bars (2026-06-08), in `trends-2026-10.md` §2 | Home, Schedule, Inbox, Team, More. Request Review shows "‹ Requests". Timecards shows "‹ Inbox" but lights the **More** tab (`p2-Timecards.png`) | On par. Fix the tab that lights up when you arrive from Inbox |
| "What needs me" summary | One sentence on top, then the single most urgent action, then the rest | Uber Activity, Jobber, Gusto Mobile Home (trends §2); Asana Home cards with Completed/Overdue/Due ([Asana](https://mobbin.com/screens/0181c618-16c6-4cfb-808e-fe2ba2207a4d)) | "3 things need you today", Next up card with one button, "Also waiting" list (`r2-Home-Refined.png`) | Ahead of the workforce tools I could verify. Numbers need scope (§4) |
| Status | Short labelled pills with one meaning per colour | Remote's time-off list labels Approved, Declined, Canceled, Taken with a colour dot and a word ([Remote](https://mobbin.com/screens/c2e49d7c-66b1-49eb-8e37-0a63a2823691)) | Grey Waiting, amber Review, coral Fix, green done (`p2-Timecards.png`) | On par. Keep words on every pill |
| Notifications | Context-rich, grouped, few. Urgent now, the rest batched. Badges count only what you can act on | iOS notification summary since iOS 15; WebKit badging (2023) in trends §3.2 | Bell dot plus Inbox badge. Employee alerts read "Schedule update" twice with no week (employee review M6) | Behind on content and tiers (R7) |
| Gestures | Swipe back, sheet swipe-down, swipe on list rows only for reversible actions | HIG Sheets (2026-03-24); NN/g bottom sheets (2023-06-11) | Swipe-to-decide removed from Inbox in favour of full review (manager review D1) | On par, and safer than consumer patterns |
| Motion and feedback | Short motion, a toast that names the result, pending state while the server works | HIG Motion (2025-09-09); X shows a spinner inside the Approve button until the server answers ([X](https://mobbin.com/screens/b9d47aae-5407-4bc1-b76f-56198d875dc0)) | "Time off approved · Alexandra · Oct 28 – 29" toast (`p3-State-Approved.png`) | On par. Add what happened next (R3 note) |
| Speed perception | Skeletons, "Updated" stamps, response inside 400 ms or a visible pending state | NN/g Skeleton Screens (2023-06-04, reviewed 2026-09-02); INP 200 ms "good" (web.dev, 2024-03-12) | "Updated 6:14 PM" on Today and Inbox; loading state exists (`v6-State-Home-Loading.png`) | Ahead. No INP measurements yet |
| Dark mode | Follows the system | HIG Dark Mode (2024-08-06) | Not built; gated on legacy CSS (trends §3.10) | Behind, planned. The teal band will translate well |
| Large text and accessibility | Text follows the phone's size setting to 200%; layout reflows | Apple App Store "Larger Text" label (support 123073, 2025) | Fixed `px` type (trends §3.3). The teal band plus a 2-line greeting will push Next up below the fold at large sizes | Behind (R9) |
| Bilingual UI | App follows the phone's language, with a per-app override; every string translated, not just buttons | Android 13 per-app language ([Android developers](https://developer.android.com/guide/topics/resources/app-languages)); Connecteam's app follows phone language and offers "See Translation" on posts ([Connecteam help](https://help.connecteam.com/en/articles/7900512-updates-automatic-translation)) | Portal English only; Clocker shows Spanish second lines | **Behind** (R1) |
| AI assistance | Grounded suggestions that link to the record; no free chat about pay or law | Glassdoor cites sources and adds a double-check note (trends §3.8). Homebase markets an AI scheduler and hiring assistant ([Homebase vs Deputy](https://joinhomebase.com/homebase-vs-deputy/), vendor claim, 2026) | Summary lines read as written by rules, not a model. Coverage help is rule-based | On par. Keep summaries rule-based (§4) |
| Offline | Keep what you already saw, stamped, with actions paused | Qantas keeps the screen and says it could not update (trends §3.6) | "Couldn't load today" replaces the Today card; "Last updated 6:14 PM" (`p3-State-Home-Offline.png`) | On par in honesty, behind in usefulness (R8) |

## 2. How leading workforce apps handle the core jobs

| Job | What leading tools do (source) | NEVORA new direction | Verdict |
|---|---|---|---|
| **Manager morning overview** | Homebase markets late-arrival alerts and an on-time rate ([Homebase team communication](https://joinhomebase.com/features/team-communication), vendor page). Deel's Home flags "1 worker may miss start dates" with an AT RISK pill above counts ([Deel](https://mobbin.com/screens/4f36fd58-f233-41e2-abf3-f1322f5d7f89)) | Today strip (Scheduled, Clocked in, Not in yet) plus Next up with one action and named people (`p1-Home-Manager.png`, `r2-Home-Refined.png`) | **Ahead** in clarity. The "Not in yet 0" tile after shifts end is a trust defect (§4) |
| **Missed clock-ins** | Homebase lists late-employee and missed-punch alerts, and release notes mention alerts for late arrivals, missed clock-outs and overtime ([time and attendance](https://joinhomebase.com/features/time-clock/time-and-attendance-software/); [APKMirror 4.30.1](https://www.apkmirror.com/?p=5579098)) | Inbox "Act now" lists each person and shift; Timecards opens with "From Inbox · Needs a fix" for that person (`p2-Inbox.png`, `p2-Timecards.png`) | **On par** for managers, **behind** on prevention: nothing reminds the employee before the punch is missed (R6) |
| **Time-off approval** | MangoApps shows who else is off and staffing warnings on the approval; Paycor lists conflicting shifts on the request ([MangoApps](https://workforce.mangoapps.com/help/approving_time_off); [Paycor](https://legacycare.paycor.com/hc/en-us/articles/115004460733-Time-Off-Requests)). Consumer finance apps show an approval timeline with who acted ([Revolut Business](https://mobbin.com/screens/9a34e3c2-65fa-49e0-9a6f-5833c749d333), [Brex](https://mobbin.com/screens/fdf16c74-5c67-4189-9ffb-4d2b83819811)). Remote puts Approve and Decline on the list row with only hours and a date ([Remote](https://mobbin.com/screens/6f7ddbc3-3a49-492b-8de8-5f7c791cdf28)) | Full review with dates, length, location, her note, then a link "See that week's schedule" (`p1-Request-Review.png`) | **Ahead** of Remote on safety; **behind** MangoApps and Paycor because the impact sits one tap away (R4) |
| **Schedule publishing** | Deputy can require each employee to accept a published shift within a window; unconfirmed shifts become open shifts ([Deputy help](https://help.deputy.com/hc/en-au/articles/4689081125007-Can-I-automatically-turn-unconfirmed-shifts-to-open-shifts-if-they-are-not-confirmed-by-the-team-member), page blocked to fetch; summary from search). Sling reports acceptance back to managers ([Sling](https://support.getsling.com/en/articles/4319967-shift-acceptance)) | Per-location state in the header, "Publish West Office · Employees there can't see this week yet" as Next up, and "Schedule not confirmed: Alexandra, María José" in Inbox (`p2-Schedule.png`, `p2-Inbox.png`) | **On par**, ahead in naming the consequence. Add a publish preview (R11) |
| **Employee next shift** | Gusto Mobile time off uses a teal header band with one primary action ([Gusto Mobile](https://mobbin.com/screens/64a5c79e-88e7-447f-a911-5dc282824b59)). DoorDash Dasher splits Available and Scheduled ([DoorDash](https://mobbin.com/screens/efd5f376-ee68-4009-b382-d68e85d0ea0c)) | Green pass: date, time, countdown "Starts in 14 h 2 min", location, "Times in Puerto Rico time" (`18-visual-home-390.jpg`) | **Ahead**. Two wording risks: "Shifts shown are final" and "No open time entry was recorded at the last check" |
| **Shift swap and claim** | When I Work: you keep your original shift until the swap is accepted and approved ([Software Finder](https://softwarefinder.com/resources/when-i-work-swap-shifts), third party). NetSuite shows the manager the cost difference and reason ([NetSuite](https://oracle.hydrogen.sagittarius.connect.product.adaptavist.com/en/cloud/saas/netsuite/ns-online-help/section_1019102056.html)) | My shifts / Open shifts segments exist (trends §2). No new-direction swap review screen to judge | **Unknown** for the new direction. Apply R4 to swaps (both people's hours and overtime) |
| **Hours and pay** | Homebase's employee app shows hours worked and estimated earnings (vendor claim). 7shifts shows estimated tips, labelled as subject to change ([7shifts KB](https://kb.7shifts.com/hc/en-us/articles/38268731703315-Enabling-Employee-Access-to-Tip-Reports)). DoorDash leads with "This week $15.40 · Active 26 min" ([DoorDash](https://mobbin.com/screens/63f22cfd-d488-4c4a-9e89-8299ca8ec389)) | Employee Pay shows Statements and Hours; Timecards loses the Pay context (employee review M7). Manager Timecards: "Approvals open after Oct 18" with a lock line (`p2-Timecards.png`) | **Behind** for employees (R10). The manager lock line is ahead: it says why the button is unavailable |

## 3. Employees and Leads: what makes the phone app feel premium and safe

Hourly workers open the app between tasks, often on older Android phones, often in Spanish, with little patience for reading. Their questions are few: when do I work, did my punch count, did my request go through, how many hours do I have, when do I get paid.

1. **My language, everywhere.** Spanish on buttons is the floor. Requests, notifications, errors and empty states must be Spanish too. Connecteam follows the phone's language ([help](https://help.connecteam.com/en/articles/5365277-configure-your-preferred-language)). Pew found 18% of Puerto Ricans (island and mainland, 2011 ACS) speak English less than very well ([Pew, 2013-06-19](https://www.pewresearch.org/race-and-ethnicity/2013/06/19/hispanics-of-puerto-rican-origin-in-the-united-states-2011/)); the island-only share is not in my sources and the Market Strategist should pull ACS table B16001. NEVORA today: Clocker only.
2. **One glance answers "when do I work".** The green pass does this. Keep it the first thing on Home.
3. **Proof that my punch counted.** "Clock In Recorded" on the Clocker is good. On the phone, the clock card says "Off Clock" and "No open time entry was recorded at the last check" (`18-visual-home-390.jpg`). An employee reads that as "something is wrong". Say "Last punch: Clocked out 4:02 PM, Main Office" when one exists.
4. **Where my request stands, and who has it.** Brex, Alan and Bumble show a step timeline with names and dates ([Brex](https://mobbin.com/screens/fdf16c74-5c67-4189-9ffb-4d2b83819811), [Alan](https://mobbin.com/screens/751decaa-80b3-4dfd-bb78-4f39c3718578), [Bumble](https://mobbin.com/screens/09426d05-9e3c-4a74-b206-da7d04e07ba4)). Employees expect "Sent Oct 18 → With Morgan → Approved Oct 19" (R5).
5. **Hours so far, and payday.** Gig apps taught "this week so far" (DoorDash above). Facts first: hours recorded this period and the payday date. Money only with an approved estimate label (R10).
6. **A nudge, not a nag.** One reminder at shift start beats a manager calling later (R6).
7. **Same look as the manager app.** The employee Home still uses a white header and different card style (`18-visual-home-390.jpg`) while managers get the teal band. Leads switch between both. Align header, type and pills; keep the green pass as the hero (R12).
8. **Tone.** Neutral facts, never blame. "Your 8:00 shift started" beats "You're late".

## 4. Trust risks in the direction, and patterns to avoid

| Risk | Where | Why it hurts | What to do |
|---|---|---|---|
| A reassuring zero that hides a problem | `p1-Home-Manager.png`: "Not in yet 0", grey, "All of today's shifts have ended", while Next up says "3 shifts with no clock-in" | A manager who reads only the strip thinks everyone came | After shifts end, the tile becomes "No clock-in 3" in coral |
| Counts in different units | `p1-Home-Manager.png` says "2 things need you today"; the Inbox badge says 4; the Inbox header says "3 missed clock-ins and 1 request" | People compare numbers. A mismatch reads as a bug in a payroll app | Count the same unit everywhere, or name it ("3 missed clock-ins and 1 request") as Inbox does |
| Numbers without scope | `p2-Schedule.png`: "56h" pills on a Sunday list, explained only by a footnote; manager review MG9 | Is it today, this week, or overtime? | "56h this week". Keep the footnote |
| A decision verb on a summary surface | "Approve" pill for Payroll Sep 21 – 27 on Home (`r2-Home-Refined.png`, `p3-Desktop-Home-1440.png`) | It looks like one tap approves payroll, which contradicts "decisions only on full review screens" | Use "Review" on Home and Inbox. "Approve" lives only on the review screen. NN/g: label buttons with the outcome they produce ([NN/g, 2018-02-18, reviewed 2026](https://www.nngroup.com/articles/confirmation-dialog/)) |
| Optimistic decisions | Any approve, publish or payroll step | Showing "Approved" before the server confirms, then failing, is the fastest way to lose trust | Keep pending labels ("Approving…") as the direction does; X does the same ([X](https://mobbin.com/screens/b9d47aae-5407-4bc1-b76f-56198d875dc0)). No fake Undo after the employee is notified |
| Absolute claims | "Shifts shown are final" on employee Home | Managers can edit published shifts; "final" sets a promise NEVORA can't keep | "Published. Your manager may still change it, and you'll be told." Product decides the wording |
| System language | "No open time entry was recorded at the last check" | Reads as an error to a worker | Name the last punch, or "No punch yet today" |
| Nagging | Availability reminders, badges | Badges that count things you can't act on (open-period "Waiting" timecards) teach people to ignore them | Badge only actionable items; one reminder per item; no repeat pushes |
| Confirmshaming | Permission asks | "No, I don't want to know about my schedule" style copy | Neutral "Not now" (trends §3.2) |
| Hidden defaults on publish | Future publish dialog | Pre-checked "notify everyone" or silent publishes surprise employees | Show who will be told, before the button (R11) |
| Generated summaries | Header summary line | A language model that miscounts who is missing breaks the one line people trust most | Keep summaries rule-based and computed from the same data as the cards |
| Celebration on money | Success states | Confetti on payroll looks unserious | Toast with facts only (U7 already excludes it) |

The FTC's staff report on dark patterns (2022-09-15) lists confirmshaming, obstruction and hidden defaults among the tactics it targets ([Hunton summary](https://www.huntonprivacyblog.com/2022/09/27/ftc-releases-report-on-dark-patterns/)). NEVORA isn't selling subscriptions to employees, but the same tactics inside a pay app would read as manipulation.

## 5. Recommendations beyond the current plan

Scores use the TEAM-RULES order: Usability, Familiarity, Trust, Accessibility, Brand, Durability, Cost, Continuity (0 to 2 each). The Product Designer sets final scores. Platform lines cover iOS app, Android app, desktop web, mobile web and PWA.

### R1. Spanish (Puerto Rico) for the employee and Lead phone app

- **Evidence:** TEAM-RULES "full Spanish set it apart"; `src/app/layout.tsx:22` (`lang="en"`); Spanish only in `clocker-language.tsx` and statement language in `payroll-settings.tsx:84`; Connecteam app language and auto-translate (help pages above); Android 13 per-app language guide.
- **Proposal:** Employee and Lead screens first (Home, Schedule, Requests, Pay/Hours, Notifications, push text). Follow the device or browser language; a Language row in Profile overrides it. Set `lang="es"` on the page so screen readers switch voice. Push and email go out in each person's saved language. Payroll and legal text keep the approved English until approved Spanish exists, marked `lang="en"` inside Spanish pages. Design for 20–30% longer strings: chips and Today tiles must wrap.
- **Platforms:** iOS and Android apps follow the per-app language setting; desktop web and mobile web follow `Accept-Language` with the Profile override; PWA same as mobile web, stored server-side so it survives reinstall.
- **Score:** 2 · 2 · 2 · 2 · 2 · 2 · 1 · 2 = **15/16**. Cost assumes a staged string extraction.

### R2. Numbers that state their scope and change honestly

- **Evidence:** `p1-Home-Manager.png` (zero tile, "2 things" vs badge 4), `p2-Schedule.png` ("56h"), manager review MG9.
- **Proposal:** One counting rule for Home, Inbox and badge. "Not in yet" becomes "No clock-in" once shifts end. Hours pills read "56h this wk". Every count has a noun.
- **Platforms:** Same on all five; screen readers read the full label ("56 hours this week, over the 40-hour limit").
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 2 · 2 = **15/16**.

### R3. Decision verbs only on decision screens

- **Evidence:** "Approve" pill on Home (`r2-Home-Refined.png`, `p3-Desktop-Home-1440.png`); NN/g 2018 on outcome labels.
- **Proposal:** Home and Inbox pills say "Review". The review screen keeps Approve and Decline. The success toast adds the consequence when the server did it ("Alexandra was notified").
- **Platforms:** Same everywhere; desktop keeps the pill as a link with the same label.
- **Score:** 2 · 2 · 2 · 2 · 2 · 2 · 2 · 1 = **15/16**.

### R4. Impact inside the review (time off and swaps)

- **Evidence:** `p1-Request-Review.png` puts impact behind "See that week's schedule"; MangoApps and Paycor show conflicts on the request; NetSuite shows swap cost difference.
- **Proposal:** Add a "Before you decide" block with facts from authorised reads: her shifts on those dates, others already off those dates, and coverage left at that location. For swaps: both people's weekly hours after the swap and any overtime flag. Keep the full schedule link.
- **Platforms:** Phones show it above the buttons; desktop shows it in a right column; offline disables Approve and says why.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 1 · 2 = **14/16**. Needs a read-model extension.

### R5. Request status timeline for employees

- **Evidence:** Brex, Alan, Bumble and Airwallex timelines (links in §3 and [Airwallex](https://mobbin.com/screens/9ef8f9b6-0fbd-422e-9171-f053d18c7b11)).
- **Proposal:** Each request detail shows Sent (date) → With (manager name, if the data allows) → Decided (by, date, note). No promised turnaround time.
- **Platforms:** Same on all five; the timeline is a list with text, not only dots.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 2 · 2 = **15/16**.

### R6. One reminder that prevents a missed clock-in

- **Evidence:** Homebase late and missed-punch alerts (vendor pages); Home and Inbox show the problem only after the fact (`p1-Home-Manager.png`).
- **Proposal:** If a published shift started N minutes ago (company setting) with no punch, send the employee one push in their language: "Your 8:00 shift at Main Office started. Clock in at the Clocker." The manager's Next up appears only after the grace period. One reminder per shift, never repeated.
- **Platforms:** Native push on iOS and Android apps; web push in the installed PWA (iOS 16.4+); nothing in a mobile browser tab; desktop not applicable.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 1 · 2 = **14/16**. Needs policy setting and push contract; test with fictional data only.

### R7. Notification tiers and a daily digest

- **Evidence:** iOS notification summary; employee review M6 and manager review MG12 (generic alerts).
- **Proposal:** Immediate: shift changed within 48 hours, missed clock-in, request decided. Everything else goes into one daily digest at a time the person picks. Each alert names its record ("Schedule for Oct 26 – Nov 1 changed").
- **Platforms:** Android notification channels per tier; iOS time-sensitive only for the immediate tier; PWA same text; desktop shows the bell list.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 1 · 2 = **14/16**.

### R8. Keep what the person already saw when the connection drops

- **Evidence:** `p3-State-Home-Offline.png` replaces the Today card with "Couldn't load today"; Qantas and banking apps keep the last data with a stamp (trends §3.6).
- **Proposal:** If the page already loaded, keep the cards on screen, greyed slightly, with "Offline · as of 6:14 PM" and actions paused. Show "Couldn't load" only on a cold start. Hold the data in memory only; store nothing new.
- **Platforms:** Same on all five; screen readers announce the offline state once.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 2 · 2 = **15/16**.

### R9. A header band that shrinks for large text and on scroll

- **Evidence:** iOS large titles collapse into a compact bar on scroll (HIG Navigation bars); trends §3.3 on 200% text. At 390 px the band, greeting and summary take about the top quarter of the screen before Next up (`r2-Home-Refined.png`).
- **Proposal:** On scroll the band collapses to wordmark, title and summary line. At large text sizes the date eyebrow hides and the greeting shortens so Next up stays in the first screen. Reduced motion: no animated collapse.
- **Platforms:** iOS and Android apps map to the system text size; desktop keeps the full band; mobile web and PWA respond to `rem` and zoom.
- **Score:** 2 · 2 · 2 · 2 · 2 · 2 · 1 · 2 = **15/16**.

### R10. Employee hours and payday, facts first

- **Evidence:** Homebase estimated earnings (vendor claim), 7shifts tip estimates "subject to change", DoorDash "This week" earnings; employee review M7.
- **Proposal:** On Pay: "This period: 32h recorded · 40h scheduled · Payday Fri, Oct 30." A money estimate waits for approved payroll copy and must say "Estimate before taxes. Your pay statement is final."
- **Platforms:** Same on all five; never on a lock screen or widget.
- **Score (facts):** 2 · 2 · 2 · 2 · 1 · 2 · 1 · 2 = **14/16**. With money estimate, Trust drops to 1 = **13/16** until the copy is approved.

### R11. Publish preview

- **Evidence:** Deputy publish with required confirmation; Sling acceptance reporting; `p2-Schedule.png` "Review and publish".
- **Proposal:** The publish screen lists what changed since the last publish and who will be notified, with each location separate. Optional "Ask employees to confirm" fits the existing "Schedule not confirmed" group.
- **Score:** 2 · 2 · 2 · 2 · 1 · 2 · 1 · 2 = **14/16**.

### R12. Carry the shell to employee pages

- **Evidence:** `18-visual-home-390.jpg` vs `r2-Home-Refined.png`.
- **Proposal:** Same header band, pills and card style for Employee and Lead; the green pass stays the first card.
- **Score:** 2 · 2 · 2 · 2 · 2 · 2 · 1 · 1 = **14/16**. Continuity 1: employees just learned the current Home.

### R13. Daily overtime for Puerto Rico in the schedule

- **Evidence:** Puerto Rico's statute counts hours over 8 in a day as overtime ([Act 379 text, pr.gov](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/2-ingles/379-1948.pdf)); Act 4-2017 kept the daily rule ([Dayforce](https://www.dayforce.com/blog/puerto-rico-changes-employment-law-wage-hour)). `p2-Schedule.png` flags only the 40h weekly limit.
- **Proposal:** Flag a shift that pushes someone past the company's daily limit as well as the weekly one, driven by policy settings, with approved wording.
- **Score:** 2 · 1 · 2 · 2 · 2 · 2 · 1 · 2 = **14/16**. Needs legal copy approval and policy data.

## 6. Prioritized top 10

| # | Recommendation | Why first | Score |
|---|---|---|---|
| 1 | R2 Numbers that state their scope (incl. "Not in yet 0" fix) | Trust defect visible today; cheap | 15 |
| 2 | R3 "Review" on summaries, "Approve" only on review screens | Direct contradiction of the direction's own rule | 15 |
| 3 | R1 Spanish for employee and Lead app, staged | Largest gap against NEVORA's stated difference in Puerto Rico | 15 |
| 4 | R4 Impact inside time-off and swap review | Competitors show conflicts on the request | 14 |
| 5 | R6 One reminder before a missed clock-in | Removes the most common Next up item at its source | 14 |
| 6 | R5 Employee request timeline | Answers the employee's main anxiety | 15 |
| 7 | R8 Keep last-seen data offline | Cheap; turns a dead end into a useful screen | 15 |
| 8 | R9 Header band that shrinks for large text | Keeps Next up reachable at 200% text | 15 |
| 9 | R7 Notification tiers and digest | Stops alert fatigue before push volume grows | 14 |
| 10 | R10 Hours and payday, facts first | Employees expect "this period so far" | 14 |

Next in line: R11 publish preview, R13 daily overtime, R12 employee shell.

## 7. Sources

**Mobbin (iOS screens, cited by link):** [Asana Home](https://mobbin.com/screens/0181c618-16c6-4cfb-808e-fe2ba2207a4d), [Deel Home](https://mobbin.com/screens/4f36fd58-f233-41e2-abf3-f1322f5d7f89), [Remote time-off requests](https://mobbin.com/screens/6f7ddbc3-3a49-492b-8de8-5f7c791cdf28), [Remote time-off history](https://mobbin.com/screens/c2e49d7c-66b1-49eb-8e37-0a63a2823691), [Revolut Business approval](https://mobbin.com/screens/9a34e3c2-65fa-49e0-9a6f-5833c749d333), [Brex approval timeline](https://mobbin.com/screens/fdf16c74-5c67-4189-9ffb-4d2b83819811), [Airwallex approval timeline](https://mobbin.com/screens/9ef8f9b6-0fbd-422e-9171-f053d18c7b11), [X pending Approve](https://mobbin.com/screens/b9d47aae-5407-4bc1-b76f-56198d875dc0), [Gusto Mobile time off](https://mobbin.com/screens/64a5c79e-88e7-447f-a911-5dc282824b59), [DoorDash Dasher schedule](https://mobbin.com/screens/efd5f376-ee68-4009-b382-d68e85d0ea0c), [DoorDash Dasher earnings](https://mobbin.com/screens/63f22cfd-d488-4c4a-9e89-8299ca8ec389), [Alan request tracker](https://mobbin.com/screens/751decaa-80b3-4dfd-bb78-4f39c3718578), [Bumble report tracker](https://mobbin.com/screens/09426d05-9e3c-4a74-b206-da7d04e07ba4).

**Competitors (vendor or third-party, read 2026-10-18):** Homebase [team communication](https://joinhomebase.com/features/team-communication), [time and attendance](https://joinhomebase.com/features/time-clock/time-and-attendance-software/), [vs Deputy](https://joinhomebase.com/homebase-vs-deputy/) (2026 page); [Homebase 4.30.1 release notes](https://www.apkmirror.com/?p=5579098); [7shifts tip report](https://kb.7shifts.com/hc/en-us/articles/38268731703315-Enabling-Employee-Access-to-Tip-Reports); [Deputy shift confirmation](https://help.deputy.com/hc/en-au/articles/4689081125007-Can-I-automatically-turn-unconfirmed-shifts-to-open-shifts-if-they-are-not-confirmed-by-the-team-member) (fetch blocked, summary from search); [Sling shift acceptance](https://support.getsling.com/en/articles/4319967-shift-acceptance); [When I Work swaps](https://softwarefinder.com/resources/when-i-work-swap-shifts) (third party); [Connecteam auto-translation](https://help.connecteam.com/en/articles/7900512-updates-automatic-translation), [language settings](https://help.connecteam.com/en/articles/5365277-configure-your-preferred-language); [MangoApps time-off approval](https://workforce.mangoapps.com/help/approving_time_off); [Paycor time-off requests](https://legacycare.paycor.com/hc/en-us/articles/115004460733-Time-Off-Requests); [NetSuite swaps](https://oracle.hydrogen.sagittarius.connect.product.adaptavist.com/en/cloud/saas/netsuite/ns-online-help/section_1019102056.html).

**Platform and research:** [Android per-app language](https://developer.android.com/guide/topics/resources/app-languages) (current page; feature from Android 13, 2022); NN/g [Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/) (2018-02-18, reviewed 2026); Apple HIG, NN/g, WebKit and web.dev sources as dated in `docs/product/trends-2026-10.md` §6.

**Law and population:** [Puerto Rico Act 379 (English text, pr.gov)](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/2-ingles/379-1948.pdf); [Dayforce on Act 4-2017](https://www.dayforce.com/blog/puerto-rico-changes-employment-law-wage-hour) (2017); [Pew, Puerto Rican-origin Hispanics 2011](https://www.pewresearch.org/race-and-ethnicity/2013/06/19/hispanics-of-puerto-rican-origin-in-the-united-states-2011/) (2013-06-19); [FTC dark patterns report summary](https://www.huntonprivacyblog.com/2022/09/27/ftc-releases-report-on-dark-patterns/) (2022-09-27).

## 8. Not verified

- No competitor app was opened; Homebase, 7shifts and Deputy behaviour comes from vendor pages and search summaries.
- No 2026 AI-assistant launch from Deputy or 7shifts turned up; Homebase's AI claims are marketing.
- The island-only share of Puerto Rico residents with limited English is not in my sources.
- No employee screens exist for the new direction; employee findings use the current Home.
- Nothing ran on a physical phone, at large text sizes or in Spanish.
- Daily overtime rules depend on hire date and agreements; legal copy needs counsel and Jose's approval.
