# 08 UX Researcher — what people expect from everyday apps in 2026

Lens: the habits iOS 26, Android 16 and the apps people use daily have taught (lock-screen activities, widgets, push habits, AI help, passkeys, scroll and refresh physics), and which ones NEVORA should take up for managers and hourly workers. This builds on `docs/product/trends-2026-10.md` (Oct 17) and reports only what is still open or has changed since the v3 rebuild.

## Verdict

The Manager and Owner phone app now feels like an iOS app: large titles, grouped lists, a Calendar-style week strip, and search and the bell in the navigation bar. That closes the "no search on phones" gap from Oct 17. What still feels behind 2026 is everything outside the screen. Notifications say nothing specific, the app has no icon badge, there are no passkeys, phones lose the bounce and pull-to-refresh, and NEVORA has no presence on the lock screen or in widgets. Hourly employees, the people who live on their phones, still get the pre-v3 visual language that v3 removed for managers.

## Recommendations

1. **Make each push say what happened, in the person's language, and add an icon badge.**
   *Why:* every push is content-free and in English only. Examples: "Your NEVORA Schedule Is Ready / Open NEVORA to review your schedule", and one shared "NEVORA Request Update / Open NEVORA to review your pending task" for 20 different events (`src/lib/notifications/payloads.ts:4,9-19`). An approved or declined time-off request is therefore announced as a "pending task", which is wrong. The titles use Title Case while the app uses sentence case. People now triage from the lock screen, and iOS 26 Apple Intelligence summaries and prioritisation work from notification text (TechRadar/Tom's Guide on iOS 26 summaries, Jul–Aug 2025), so "Open NEVORA to review" can't be ranked and teaches people to ignore it. `setAppBadge` is still unused (0 hits in `src`/`public`).
   *Do:* safe facts only: "Schedule changed: Thu Oct 23, 9 AM–5 PM, Main Office", "Time off approved: Oct 30–31". Never pay amounts or other people's names. iOS "Show Previews: When Unlocked" stays the user's privacy control. Send in the recipient's language (EN/ES). Set the icon badge to the manager's Inbox count or the employee's To do count.
   *Impact:* High · *Effort:* M · *Owner:* Backend (payload builder, locale), UI (copy).

2. **Bring back scroll bounce and pull to refresh on phones.**
   *Why:* `html, body { overscroll-behavior: none }` applies to every portal page at ≤760px (`src/app/app/portal-gusto.css:265`, added in `85330418` for "no bounce past the page's end"). That rule also turns off Chrome Android's pull to refresh and iOS's rubber-band edge, two behaviours people expect from every list app. The only refresh control is text at the bottom of the page: "Refresh" under the Inbox (`AUDIT-M-inbox-390.png`) and "Refresh home" under the employee Home (`AUDIT-E-emp-home-390.png`). Manager Home shows "Updated 1:11 AM" with no control (`AUDIT-M-home-390.png`).
   *Do:* limit the rule to `overscroll-behavior-x: none`. In `display-mode: standalone` (and later in the native shell), add pull to refresh on Home, Inbox, Schedule and My schedule that runs the existing refresh and updates the "Updated" stamp. Keep the buttons for keyboard and screen-reader users. Turn the pull off while a sheet is open.
   *Impact:* High · *Effort:* S (CSS) / M (standalone pull) · *Owner:* UI.

3. **Give employees the same phone grammar that managers now have.**
   *Why:* hourly workers are the phone audience. Their Home and Schedule still use what the v3 spec removed as looking "generated": a gradient hero with "Good morning · Hi, Alexandra.", a decorative triangle, a numbered bell, outline tab icons with a pill indicator, and "Shift options" buttons on every row (`AUDIT-E-emp-home-390.png`, `AUDIT-E-emp-schedule-390.png`). Compare the manager's filled iOS tab bar and grouped lists (`AUDIT-M-home-390.png`, `QAOWNER-schedule-390.png`). Leads and managers who also work shifts switch between two tab-bar languages inside one app, which breaks Jakob's law where it costs most.
   *Do:* extend the v3 phone kit (large title, grouped lists, filled tab icons, a dot on the bell, a segmented My shifts / Open shifts control) to the employee pages. Keep the next-shift pass as the one card with emphasis. Keep the Material equivalents on Android.
   *Impact:* High · *Effort:* L · *Owner:* Product (approve scope), UI.

4. **Ship passkeys, with Face ID and fingerprint sign-in.**
   *Why:* still none. Sign-in is employee ID and password (`src/app/login/page.tsx:53,66`, `autocomplete="username"` without `webauthn`), and there is no WebAuthn code in `src`. Since the Oct 17 report, iOS 26 added a passkey account-creation API and automatic passkey upgrades, which quietly add a passkey after a password sign-in (WWDC25 session 279, "What's new in passkeys", June 2025). Banking and shopping apps have taught hourly workers to expect Face ID.
   *Do:* offer the passkey after a successful password sign-in on a personal phone, use `autocomplete="username webauthn"` for passkey autofill, and keep the ID and password path and manager recovery. The Clocker keeps its PIN.
   *Impact:* High · *Effort:* L · *Owner:* Backend (auth contract), Product (approval), UI (sign-in states).

5. **Use the calendar feed as NEVORA's widget and lock-screen presence for now.**
   *Why:* web apps can't make widgets or Live Activities, but NEVORA already serves an iCal feed (`src/lib/calendar/ical.ts`). Subscribed shifts then show in the iOS and Android Calendar widgets, on Apple Watch, and in Siri's "Up Next". The offer is buried as the last row of My schedule (`AUDIT-E-emp-schedule-390.png`, `src/components/employee-my-schedule.tsx:227`) and in a Profile disclosure. The feed has no calendar name (`X-WR-CALNAME`) and no refresh hint (`REFRESH-INTERVAL` / `X-PUBLISHED-TTL`, `ical.ts:6`), so it shows under a URL-like name and may refresh slowly. Apple Calendar and Outlook read the hint; Google ignores it.
   *Do:* after "Confirm schedule", offer "See your shifts in your phone's calendar" once, with "Not now". Name the calendar "NEVORA shifts" and add an hourly refresh hint.
   *Impact:* Medium · *Effort:* S · *Owner:* UI (offer), Backend (feed headers).

6. **Plan a "Shift in progress" Live Activity and Android Live Update for the native shell.**
   *Why:* time apps already do this. Procore My Time shows clock-in time, break and elapsed time on the lock screen and Dynamic Island (Procore support, current), and ShiftFlow does the same. Lock-screen timers are a learned pattern from workouts and focus apps ([Hevy](https://mobbin.com/screens/184c2861-65d0-4764-a3d3-6808a961264e), [Jomo](https://mobbin.com/screens/9dc8b7b4-1a33-48c4-b863-793c5d35064e), [Any Distance](https://mobbin.com/screens/4ba75bbe-ea5f-4a7a-8555-97e5e25ee091)). In iOS 26 one Live Activity also appears in CarPlay, the Apple Watch Smart Stack and the Mac menu bar without extra work (WWDC25 session 216, June 2025). Android 16 Live Updates put a chip in the status bar, and Samsung shows them in its Now Bar (Android Authority, 2025). NEVORA's employee "My time" page already holds the content ("Off clock", "Updated Oct 21, 1:12 AM", `AUDIT-E-emp-mytime-390.png`).
   *Do:* after a Clocker punch, show "On the clock since 8:02 AM · Main Office", with the break when one is running. End it at clock-out or at Apple's 8-hour limit. Never show pay or hours totals. Label it "recorded at" so nobody reads it as proof of a punch, the caveat ShiftFlow itself gives.
   *Impact:* Medium · *Effort:* L (needs the wrapper decision) · *Owner:* Product, Backend, UI.

7. **Ask for notifications at a useful moment, update the iOS 26 install copy, and let employees choose alert types.**
   *Why:* the "Keep NEVORA Handy" setup popover opens on its own at the first page load whenever the device is ready or installable (`src/components/portal-device-setup.tsx:120-124`). A dismissal is stored, so the offer never returns at the moment it would make sense. The install copy says "Enable 'Open as Web App' if offered" (line ~36), but on iOS 26 every site added to the Home Screen opens as a web app by default (WebKit, "News from WWDC25: WebKit in Safari 26 beta", June 2025; heise, 2025). Only Owners and Managers can turn alert topics off; for everyone else `recipientAlertOn` returns true (`src/lib/notifications/alert-choices.ts:5-6`). Apps people use show per-category switches ([Nike Run Club](https://mobbin.com/screens/6825f5e3-e732-44bf-94c3-979b4f4027e5), [Blinkist](https://mobbin.com/screens/cadacc39-d6ce-4817-a1ad-5b633039b077)).
   *Do:* offer the setup after the first "Confirm schedule" (employees) or the first Inbox visit (managers). Shorten the iOS steps to "Share, then Add to Home Screen". Give employees switches for schedule changes, request answers and open-shift invitations.
   *Impact:* Medium · *Effort:* S–M · *Owner:* UI, Backend (employee alert choices).

8. **Make employee text follow the phone's text size.**
   *Why:* v3 moved manager type to `rem` (126 rem, 0 px in `premium-clean-manager.css`), but the employee layers still sit on `globals.css`, with 701 px font sizes against 57 rem. Nothing maps the iOS text-size setting onto the root size (no `-apple-system-body` in `src`), so the installed iOS web app ignores Settings › Display & Text Size, which is the first thing App Store "Larger Text" labels check.
   *Do:* convert the employee type tokens to `rem` and set the root to the system body size on Apple devices. Test the next-shift pass and the tab labels at the largest standard size.
   *Impact:* Medium · *Effort:* M · *Owner:* UI.

9. **Get v3 ready for dark mode now, and ship dark mode later.**
   *Why:* v3 names its colours after iOS system colours (`--cm-label`, `--cm-grouped`, `--cm-sep`; `premium-clean-manager.css:9-13`), so a dark set would be a token swap. But the same file still has 241 raw hex values, `src` has no `prefers-color-scheme` rule, and `mobile-workforce.css:37` forces `color-scheme: light`. A half-dark app reads as broken, which is a trust problem.
   *Do:* replace the raw hex in v3 with tokens now, at little cost. Ship dark, following the system setting, once the employee pages are on the same kit.
   *Impact:* Low–Medium · *Effort:* M · *Owner:* UI.

10. **Keep the current AI shape, and keep saying no to the 2026 lookalikes.**
    *Why:* NN/g calls 2026 "the year of AI fatigue" and names trust as the main design problem for AI (NN/g, "State of UX 2026", 2026-01-16). Gusto's Gus asks for confirmation before it changes anything (CPA Practice Advisor, 2024-09-16), and Gusto now runs payroll inside ChatGPT (CPA Practice Advisor, 2026-01-23). NEVORA already follows the trustworthy pattern: coverage help explains "How the order is chosen" and says "Nothing is saved on this page" (`src/components/coverage-assistant.tsx`), and schedule generation has an explanation panel (`generation-explanation-panel.tsx`). The next AI step should be read-only questions in the finder ("who's off Friday") that open the real record.
    *Avoid:* CSS copies of Liquid Glass or the floating, shrinking iOS 26 tab bar (Android and web users get a fake iOS); chat bubbles or mascots; AI that approves, publishes or answers pay and labour-law questions; swipe-to-approve (correctly removed in `44e831d7`); pay or hours on the lock screen; attendance streaks; phone clock-in with location tracking until Product decides on policy and consent.
    *Impact:* High (as a guardrail) · *Effort:* S · *Owner:* Product.

## What's good

- The manager phone app now matches iOS 26 conventions closely: large titles, grouped lists, segmented filters, a Calendar-style week strip with dots, "Find Cover" inline, and search and the bell in the navigation bar (`AUDIT-M-home-390.png`, `AUDIT-M-inbox-390.png`, `QAOWNER-schedule-390.png`).
- The automation is done the trusted way: suggestions with reasons, nothing saved until a person decides, and decisions moved off swipes into a full review (`44e831d7`).
- The notification groundwork matches 2026 habits: quiet hours from 9 PM to 7 AM and manager batching (`src/lib/notifications/policy.ts:8`), and Android launcher shortcuts for Schedule and Time off now ship in the manifest (`src/lib/notifications/manifest.ts:7-10`). Both were recommended on Oct 17.

## Not checked / limits

- No browser was used (the brief doesn't allow it here), and nothing ran on a physical iPhone or Android phone. I didn't verify the effect of `overscroll-behavior: none` on a device, how pushes render on the lock screen, or the iOS 26 Add to Home Screen flow.
- The screenshots are full-page captures, so the fixed tab bar appears mid-page. The "N" circle at bottom left is the Next.js dev indicator, not app UI.
- Mobbin covers iOS and web only, so the Android claims come from Google and press coverage (2025).
- Competitor Live Activity examples (Procore, ShiftFlow) come from vendor help pages. I found no confirmed Live Activity from Homebase, Deputy, When I Work or Connecteam.
- The iOS 26 passkey upgrade API is cited from Apple's WWDC25 session listing and third-party summaries. One Apple forum post reports that it failed in an early beta.
- I didn't check how the Spanish UI is delivered beyond the push payloads and `lang="en"` in `src/app/layout.tsx:25`. The localization reviewer should confirm.
