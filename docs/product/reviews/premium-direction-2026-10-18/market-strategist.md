# Premium direction: market and competitive review

- **Author:** market-strategist-pm
- **Date:** 2026-10-18. Web sources and App Store listings were read on this date unless a row says otherwise.
- **Builds on:** [competitive-2026-10.md](../../competitive-2026-10.md) (17 Oct). That brief covers pricing, ratings, the Puerto Rico Ley 379 rules and the app-store route. This review does not repeat them. It adds what changed or was newly checked, and judges the new direction against the market.
- **Inputs:** the seven new-direction screenshots (Home, Inbox, Request review, Schedule, Owner Payroll, desktop Home and Inbox at 1440), plus the offline and approved states in the same folder; the [manager review](../manager-mobile-usability-2026-10-18/REVIEW.md) and [employee review](../employee-mobile-usability-2026-10-18/REVIEW.md); the [roadmap](../../../execution/2026-10-15-gusto-roadmap.md); [direction.md](../../direction.md) and its Checkpoint 1 decision.
- **Evidence key:** *primary* means a vendor page, an App Store listing, or Apple or Expo documentation. *Secondary* means press, a tracker or a vendor blog. *Unconfirmed* means we found no primary source.
- **Status:** a draft for Jose. Nothing here is approved.

Screenshot paths below are relative to `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/shots/`.

---

## 1. Verdict

**The new direction already looks good enough to win a demo against Homebase, When I Work, Sling and Deputy.** It reads as calm and finished. Its strongest moments are the request review that puts every detail before the decision (p1-Request-Review), the payroll stepper with the exact revision and an acknowledgement gate (p3-Payroll-Owner), and the "Updated 6:14 PM / Counts published shifts only" labels. No competitor screen we have seen states its data's age and scope this plainly.

**What will lose the deal now sits outside the screens:**

1. **The installed app icon is still the old blue flame.** `public/icons/fuel-512.png`, `fuel-apple-180.png` and the maskable icons show a glowing blue flame, not NEVORA teal or the wordmark's Λ (manifest `src/lib/notifications/manifest.ts:20-24`, apple icon `src/app/app/layout.tsx:23`). Every employee who adds NEVORA to a Home Screen sees it, and it breaks two TEAM-RULES constants (teal, no heavy gradients). The planned "company logo" item covers in-app branding but not this icon.
2. **The demo data undercuts the design.** Everyone works 56h in amber (p2-Schedule), ten people's gross pay totals $1,000.00 (p3-Payroll-Owner), and "Earlier periods: No payroll run yet" sits beside a badge reading 2. A buyer reads these as bugs.
3. **The store presence doesn't exist yet**, and that is where employees meet the product first. Six competitors we checked today declare no App Store accessibility labels at all (section 5). NEVORA's WCAG work is the easiest listing win in the category, and nobody has claimed it.
4. **Spanish is still the moat that isn't built.** Gusto Mobile, Rippling, Sling and Paychex Flex list English only, and ADP Mobile lists English and Portuguese (iTunes API, today). Spanish names already break the layout: "María José Rivera Sant…" truncates on Inbox and Schedule (p2-Inbox, p2-Schedule).

**For owners**, the direction is at parity on scheduling and ahead on trust and payroll care. It falls behind on store presence and on what owners now call "AI". **For managers**, it is ahead on decision context, provided the manager review's D1 fix (no approvals without details) holds everywhere. **For employees**, it is close to parity. The gaps are store install, the icon, offline next-shift and pay-status visibility.

---

## 2. What competitors launched or emphasised (Oct 2025 to Oct 2026)

These rows add to the launch table in competitive-2026-10 §4; they don't replace it.

| Theme | Date | Company | What | Source |
|---|---|---|---|---|
| AI payroll check | 2025-10-23 | Homebase | Payroll Assistant flags missed breaks, late punches and missing clock-outs before payroll, **prompts employees to fix their own timecards**, and gives managers a summary | Secondary: [Business Wire 2025-10-23](https://www.businesswire.com/news/home/20251023823122/en/Homebase-Expands-AI-Innovation-with-Payroll-Assistant-Following-Year-of-Small-Business-Payroll-Growth) (403 on fetch; search snippet) |
| AI scheduling | 2025-06 (assistants), 2025-12 (adoption) | Homebase | Scheduling and Hiring Assistants; ">20,000 small businesses" using its AI assistants by Dec 2025 | Secondary: [Business Wire 2025-12-02](https://www.businesswire.com/news/home/20251202531091/en/Homebase-Brings-AI-to-Main-Street-with-Smart-Tools-That-Reduce-Admin-Work-and-Save-Time) (403; snippet) |
| AI copilot | Beta from Nov 2025; "broader rollout planned for 2026" | Deputy | Deputy AI: labour optimisation, AI timesheet approval, payroll anomaly detection. We found no general-availability date | Primary: [news.deputy.com](https://news.deputy.com/deputy-launches-new-ai-platform-on-aws-to-transform-how-businesses-manage-shift-work) |
| Employee AI agent | Mar to Jul 2026 | Connecteam | An AI Agent that answers employee questions from company knowledge, with custom instructions and usage analytics (Mar); behaviour customisation (Jul); in-app "AI responses" in Chat (iOS notes, Jun) | Primary for the chat items: [App Store version history](https://apps.apple.com/us/app/connecteam-team-management-app/id1121613912). Dates secondary: [yespress.io](https://yespress.io/connecteam), [stork.ai](https://www.stork.ai/en/connecteam) |
| Location trust | 2026-10-02 | Connecteam | v10.0: "clearer location prompts", better background tracking | Primary: App Store notes (iTunes API) |
| LatAm frontline app | 2026-02-23 | Humand (Argentine-founded) | $66M Series A for an AI "operating system" for deskless workers: chat, scheduling, benefits, training, HR agents; 1.6M workers at ~1,500 organisations. iOS 4.94 (372 ratings); lists Spanish among 19 languages | Secondary: [Dealroom 2026-02-23](https://dealroom.co/news/126078-humand-raises-66m-for-ai-platform-targeting-2-7b-deskless-workers); ratings primary (iTunes API) |
| Engagement | Live (feature from Dec 2024) | 7shifts | Shift Feedback: an emoji rating pushed after each shift, with scores per location per day in the manager Log Book | Primary: [7shifts.com/employee-engagement](https://www.7shifts.com/employee-engagement/) |
| Engagement | Live (undated) | Homebase | Shout Outs: after a shift, the employee sees who they worked with and can send one badge per shift | Primary: [joinhomebase.com blog](https://joinhomebase.com/blog/favorite-feature-shout-outs/) |
| Engagement | Live (undated) | Connecteam | Recognitions plus tokens redeemable for gift cards | Primary: [connecteam.com](https://connecteam.com/hr-people-management/employee-recognition-rewards/motivate-employees/) |
| Instant pay | 2026 | Instant Financial (EWA vendor) | A 2026 study of 750 hourly workers says 70% earning under $60K live paycheck to paycheck. The retention evidence comes mostly from vendors | Secondary: [instant.co](https://www.instant.co/2026-state-of-americas-hourly-workers-study/) |
| Platform | 2026-10-18 | Deputy | iOS minimum is now **18.0** (17.0 yesterday's brief; the 11 Oct notes warned) | Primary: iTunes API |
| Store discovery | 2025-07-30; 2025-10-29 | Apple | Custom product pages can carry keywords and appear in organic search; limit raised from 35 to 70 pages | Secondary: [Adapty](https://adapty.io/blog/custom-product-pages-app-store/), [Stora 2026-05-13](https://stora.sh/blog/2026-05-13-custom-product-pages-70-keyword-linking-aso-guide) |
| Store accessibility | Announced 2025-05; voluntary now, "over time" required | Apple | Accessibility Nutrition Labels on product pages. To claim a feature, every common task (first launch, login, main tasks, settings) must work with it | Primary: [App Store Connect help](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels) |
| Native look | iOS 26 (2025-09); iOS 27 beta (2026-06) | Apple | Liquid Glass tab bars and layered icons. iOS 27 beta reworks icon layers after complaints about blur | Secondary: [MacRumors 2026-06-16](https://macrumors.com/2026/06/16/ios-27-revamps-app-icons) |
| Native look in cross-platform | SDK 55 (beta) | Expo | `NativeTabs` gives React Native apps the system Liquid Glass tab bar. We found no Capacitor equivalent; it would need a custom Swift plugin | Primary: [docs.expo.dev native tabs](https://docs.expo.dev/router/advanced/native-tabs.md) |

**Release-note reading, today (iTunes API).** Gusto (4.7.0, 16 Oct), Homebase (5.23), Deputy (26.41.0, released today), 7shifts, When I Work, Sling, Rippling, Square Team and ADP all ship "bug fixes and improvements" notes. Only Connecteam writes real notes. Weekly releases with empty notes are the category norm, so a NEVORA changelog in plain words, in English and Spanish, would stand out.

**What the themes add up to**

- **AI scheduling:** table stakes in marketing (Homebase, Deputy, Rippling, 7shifts). The demos still end with a manager editing a draft.
- **Smart summaries:** the AI use case that actually shipped. Homebase's payroll summary, Paylocity's dashboard summaries and 7shifts' daily insights all turn records into a short list of what needs attention. NEVORA's "3 things need you today" (r2-Home-Refined) is the same idea without a model.
- **Instant pay:** still sold hard (Gusto Wallet, Homebase cash out, UKG Wallet). Reviews still punish fees and pulled eligibility (prior brief, theme 8). Stay out.
- **Employee engagement:** shift-tied recognition (Homebase), shift pulse (7shifts) and AI answers to employee questions (Connecteam, Humand). All are cheap for the employee and give the owner a reason to keep paying.
- **Compliance helpers:** Homebase's employee self-fix and Deputy's break-policy beta. Nobody ships Puerto Rico presets (prior brief §7).
- **Spanish UX:** most US apps list Spanish. We found no evidence that anyone localises for Puerto Rico in particular (double surnames, PR vocabulary, Ley 379 wording). Humand is the LatAm-native player, but it targets enterprises (Siemens, Home Depot) with HR and communications, not SMB time and pay.

---

## 3. Where the new direction stands

D = differentiated, P = at parity, B = behind. Each claim cites a screenshot or repo file.

| Area | Owners | Managers | Employees | Evidence and note |
|---|---|---|---|---|
| Today's status at a glance | **D**: Today tiles with "Counts published shifts only" and an update time | **D** | n/a | r2-Home-Refined, p3-Desktop-Home-1440. Competitors show counts with no stated scope |
| Decision with full context | **D** | **D**: dates, length, location, note and "See that week's schedule" before Approve | n/a | p1-Request-Review, p3-Desktop-Inbox-1440 (two panes). Holds only if D1 removes context-free approvals everywhere |
| Inbox triage (Act now, Requests, Planning) | P | P | n/a | p2-Inbox. Deputy and Homebase have task feeds. The "Planning: 39 items" count reads heavy; a demo will ask what 39 means |
| Scheduling | P | P | P | p2-Schedule. Publish-by-location ("Main Office is live. West Office is a draft.") is clearer than most. No AI draft in the UI (the deterministic generator exists, prior brief §2) |
| Payroll care | **D**: stepper, revision, "I reviewed revision 2…" gate | n/a | n/a | p3-Payroll-Owner. Gusto-level ceremony for a product that doesn't move money. Owners in Puerto Rico can't get this from Gusto at all |
| Feedback after actions | P | P | P | p3-State-Approved toast with name and dates. Matches Gusto and Square |
| Offline | B for employees, P for managers | P | **B** | p3-State-Home-Offline shows an honest blank ("Couldn't load today"). A competitor's native app shows the last schedule. B6 (Clocker) is approved but not started; the employee's own week offline (A3b) waits for privacy review |
| Store app, icon, listing | **B** | **B** | **B** | PWA only; blue-flame icon (section 1). Every competitor is in both stores |
| AI | **B** in perception | B | P | No LLM. "3 things need you today" works as a summary but isn't presented as one |
| Spanish | P (planned D) | P | P (Clocker only) | `src/app/layout.tsx:22` sets `lang="en"`; B5 is approved in priority but not built |
| Company branding | **D** at small tiers | n/a | **D** | B1 logo and colour under contrast floors. Connecteam only added a Basic-tier welcome screen in Jul 2026 |
| Employee engagement | n/a | B | **B** | Updates and acknowledgements exist. No recognition, shift pulse or pay-status view |
| Payroll handoff | **D** for PR | n/a | n/a | ADP RUN export profile with receipts (`docs/execution/phase-d-export-mappings.md:10`). Gusto excludes PR payroll |
| Privacy posture | **D** (unmarketed) | n/a | **D** (unmarketed) | No third-party analytics in `package.json`. Gusto and Homebase both declare "Data Used to Track You: Usage Data" (App Store, today) |

### Gaps that matter most for winning and keeping small-business owners

1. **Store install and icon.** These decide whether employees adopt the product in week one. An owner who has to explain "add to Home Screen" to 15 staff, and then sees a blue flame, will doubt the product. *Winning and keeping.*
2. **Spanish (B5) and PR rules.** These are why a Puerto Rico owner switches. Already ranked 1 and 5 in direction.md; still the largest gap between the promise and the build. *Winning.*
3. **A credible answer to "do you have AI?"** Owners now expect it at no extra charge (Deputy includes it in every plan). NEVORA needs a named, explainable feature on screen, not a chat box (section 6, R6). *Winning.*
4. **Employee self-fix before payroll.** Homebase prompts employees to correct their own missed punches, which takes work off the owner. NEVORA has corrections and receipts but no prompt to the employee. *Keeping.*
5. **Offline next shift for employees.** Competitors' native apps show the last-known schedule offline. *Keeping.*

---

## 4. Employee features and polish that drive adoption and retention

Employees don't choose the product, but their adoption decides whether the owner keeps paying. If staff don't install it, the owner goes back to texting the schedule. The evidence points to five things.

| # | What | Why it drives adoption or retention | Evidence | NEVORA today |
|---|---|---|---|---|
| E1 | **Find it in the store, sign in once** | Employees search the store when told "download NEVORA". Logouts are the top complaint category | Prior brief theme 1; every competitor is in both stores | PWA; 14-day session; passkeys approved in priority, not built |
| E2 | **Know your next shift with weak or no signal** | Opening the app to check a shift is the most frequent employee task | Prior brief theme 4; p3-State-Home-Offline | Blank when offline |
| E3 | **Know you'll be paid right, and when** | Pay worry is why employees like EWA. A status view answers "is my pay on track?" without moving money | Gusto Mobile Home leads with payday ([Mobbin](https://mobbin.com/screens/fa4081e0-675f-467a-aa70-8e7b16148c00)); Remote's employee Home tracks payment status with a step bar ([Mobbin flow](https://mobbin.com/flows/7efec271-7ebf-4695-89f9-5cc0fcbe807e)); DoorDash Dasher shows a per-shift earnings breakdown ([Mobbin](https://mobbin.com/screens/90101e7b-394d-4444-82c0-1be64965f525)) | Payday moment without amounts (U6); statements carry no amounts |
| E4 | **Fix your own missed punch before your manager has to** | Fewer corrections; the employee feels in control | Homebase Payroll Assistant (2025-10-23) | Corrections exist; nothing prompts the employee |
| E5 | **Small recognition after a shift** | Gives employees a reason to open the app that isn't a chore | Homebase Shout Outs (one per shift); 7shifts Shift Feedback | None |

**Polish employees notice:**

- Their name shown correctly. Puerto Rico names carry two surnames; "María José Rivera Sant…" truncated on two screens reads as careless. Show first name plus first surname in lists and the full name on detail pages.
- An app icon that matches the employer's tool. The B1 company logo inside the app is good, but the Home Screen icon is the first impression.
- Notifications that say which week or request (employee review M6).
- Spanish everywhere, including notifications, emails and the store listing, not only the Clocker.

---

## 5. Premium signals buyers notice, and what NEVORA should do

### 5.1 In demos (owners and managers)

| Signal | Market today | NEVORA now | Do |
|---|---|---|---|
| Realistic demo company | Vendors demo staged accounts | Fictional fixtures with implausible numbers (56h for everyone, $1,000 gross for 10 people) | R2: a curated Puerto Rico demo workspace (section 6) |
| One coherent shell | Gusto, Square | Manager review MG11 found "two generations of UI" | In the plan (shared component system). Treat it as a release blocker for demos |
| Phone and desktop tell one story | Most competitors' mobile apps lack admin features (Capterra, prior theme 10) | p3-Desktop-Inbox-1440 matches p1-Request-Review | Demo the same request on desktop, then on the phone |
| Speed | Rarely marketed; often complained about (Gusto "sluggish loading", App Store review 2024-05-24) | Not measured on devices (direction.md, "Not verified") | Planned speed work: set a budget and show it on a mid-range Android |
| Honest states | Rare | Offline, approved and "Updated" states are strong | Keep them; they are a differentiator |

### 5.2 In the app stores (employees first)

Checked today on apps.apple.com: Gusto, Homebase, Deputy, 7shifts, Connecteam and When I Work **all say "The developer has not yet indicated which accessibility features this app supports."** None of the Gusto, Homebase or 7shifts screenshots carry text captions. Subtitles are generic ("Employee scheduling", "Small Business Team Management").

| Listing element | Recommendation |
|---|---|
| Icon | New NEVORA mark (R1). Layered artwork for iOS 26/27 (Icon Composer: default, dark, clear, tinted) and an Android monochrome layer for themed icons |
| Name and subtitle | "NEVORA Workforce" with a subtitle that names the job, e.g. "Schedules, time and pay, in Spanish". The wording needs Jose's approval |
| Screenshots | Captioned, five to seven, employee first (next shift, request time off, my time and receipts, pay status), then manager (request review, publish). The same set in Spanish under the **Spanish (Mexico)** localisation, which the US storefront indexes for search ([Sensor Tower](https://sensortower.com/blog/ios-keyword-localization-guide), secondary). Puerto Rico's storefront locales are unconfirmed |
| Custom product pages | Three: Employees ("your schedule"), Owners ("payroll-ready time"), Spanish ("horarios y nómina"). Each with its own keywords (secondary, Adapty) |
| Accessibility labels | Claim only what passes Apple's common-task test inside the shell: VoiceOver, Larger Text (needs phone foundations, item 8), Sufficient Contrast, Reduced Motion, Differentiate Without Color Alone, and Dark Interface after dark mode |
| Privacy label | Aim for "Data Not Used to Track You". Today's code has no third-party analytics; keep any SDK added to the shell to that rule |
| What's New | Plain-language notes in both languages, unlike the category's "bug fixes" |
| First launch | Splash with the new icon, then sign-in, then one permission ask at the moment of value (direction item 9), then the next shift. Apple counts first launch and login as common tasks for the accessibility labels |

### 5.3 PWA vs Capacitor vs Expo vs TWA, judged by perceived quality

The prior brief and the approved spike already settled the build route (Capacitor, two-week spike). This view adds only how each option *looks and feels* to a buyer or employee.

| Perceived-quality signal | PWA (today) | Capacitor over the live app | Expo / React Native | TWA (Android) |
|---|---|---|---|---|
| Found in the store, installs like an app | No | Yes | Yes | Android only |
| Home Screen icon quality | Manifest icons only; iOS uses a single apple-touch PNG and keeps it until re-added | Full layered icon and themed Android icon | Same as Capacitor | Android themed icon possible |
| System tab bar (iOS 26 Liquid Glass) | No; CSS tab bar | No by default; a custom Swift `UITabBarController` plugin is possible but splits navigation state (inference; no plugin found) | **Yes**: `NativeTabs`, beta in SDK 55 | No (Chrome) |
| Haptics, share sheet, native date pickers | Partial (Web Share; `input type=date` already native) | Yes via plugins | Yes | Partial |
| Offline first-open (the reviewer's airplane-mode test) | Service-worker offline page | Must ship B6 or a cached shell, or risk guideline 4.2 ([capgo](https://capgo.app/blog/how-to-pass-app-store-review-2026/), vendor, secondary) | Native | Service worker |
| Lock-screen presence (Live Activity, widget) | No | Yes, Swift extension | Yes, Swift via config plugin | No |
| Push reliability | Only after Home Screen install on iOS | Native APNs/FCM | Native | Chrome push |
| Older phones | Works on old iOS | Set the minimum iOS; avoid copying Deputy's 18.0 floor | Same | Chrome |

**View.** Capacitor gets NEVORA about 85% of the premium signals buyers notice: store presence, icon, push, biometrics, Live Activity, haptics. The one visible gap is the system tab bar, which only Expo gets almost for free. It does not justify a second UI codebase; the reasons in competitive-2026-10 §8 still hold. Do not imitate Liquid Glass in CSS: TEAM-RULES and direction X3 rule out more glass, and a fake reads worse than a solid bar. Revisit only if TestFlight testers say "it feels like a website". Add that question to the spike's go/no-go report.

Inside the shell, the cheap native touches with the best payoff are:

- haptic ticks on server-confirmed approve, publish and punch;
- the native share sheet for invites (R7);
- swipe-back, already in spike Q6;
- a status bar that follows the page header colour;
- a splash screen with the new icon.

**Keep the PWA** for older phones and for owners who never install. That is an advantage over iOS 17- and 18-only competitors.

---

## 6. Recommendations beyond the current plan

"Current plan" here means the planned build (shared components, defect fixes, phone screens, desktop, speed and motion, type, voice and PWA polish, company logo, dark mode) plus everything approved or ranked in direction.md. Each item below is new or materially extends a ranked item.

Scorecard order: U Usability, F Familiarity, T Trust, A Accessibility, B Brand, D Durability, C Cost, Co Continuity (0 to 2). Twelve of 16 are needed to go ahead, and a 0 on T, A or U blocks the item. The scores are drafts for the Product Designer to confirm.

| ID | Recommendation | For | Effort | Impact | U | F | T | A | B | D | C | Co | Total | Flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 | **Replace the blue-flame icon** with a NEVORA teal mark derived from the wordmark's Λ. Ship apple-touch, manifest any and maskable, push badge, layered iOS variants and an Android monochrome layer. Rename the `fuel-*` files and keep the old paths as aliases for one release | All | S | High | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | **14** | **Brand: Jose approves the mark.** iOS PWA users keep the old icon until they re-add it; say so in a release note |
| R2 | **Curated Puerto Rico demo workspace**: a believable small business (two locations, 12 to 15 people with double surnames, normal hours, one overtime case, plausible payroll totals, statuses across the grey, amber, green and coral ladder), in English and Spanish. Reused for sales demos, store screenshots, the Apple review account and the spike | Owners (buyers) | S–M | High | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **15** | Fixture only, fictional data. Payroll amounts must not imply NEVORA calculates tax |
| R3 | **Store listing kit**: name, subtitle, captioned screenshots in EN and es-MX, three custom product pages, accessibility labels claimed only after the common-task test, privacy label with no tracking, bilingual What's New | Employees, owners | S–M | High | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **15** | Needs the Capacitor go decision and Jose's developer accounts. Listing copy and the privacy label need Jose's and legal's sign-off |
| R4 | **Spanish-ready layout before B5**: name rule (first name plus first surname in lists, full name on detail), 30% text-expansion headroom in chips, tabs and buttons, and `lang` set per string where Spanish already appears (Clocker) | All | S | Med–High | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **16** | UI only. Exact name display may need an Owner setting if some people go by their second surname |
| R5 | **Employee pay-status tracker** on Pay: Hours approved → Payroll approved → Statement published → Payday, from existing run states, with no amounts | Employees | M | High | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | **Payroll copy approval.** Likely a read-model change to expose run state to employees. Never show a date the provider hasn't confirmed |
| R6 | **Name the "smart" features honestly**: a "NEVORA checked…" line on Home and Inbox ("Checked 214 punches and 3 requests. 3 need you.") with a link to every record behind it; the same sentence in the payroll-readiness check. Answers "do you have AI?" with something verifiable | Owners, managers | S (UI on existing B4 data); M with readiness | High | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **16** | Counts must come from server data (B4); "Unavailable", never zero, on failed reads. Marketing must not call it AI |
| R7 | **Invite through the phone's share sheet**: Team › person › "Share invite" opens WhatsApp, SMS or email from the Owner's own phone. NEVORA sends nothing, and the employee lands on activation, then their next shift | Owners, employees | S–M | High | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 2 | **14** | **Security review**: the invite link is a bearer secret in a chat app, so it needs single use and a short expiry. Check the existing activation tokens |
| R8 | **Employee self-fix prompt**: when a missed punch is detected (B4), the employee's Home To do says "Add your clock-out for Tue" and links to the existing correction request, before the manager sees it in Inbox | Employees, managers | M | High | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | Backend: deliver B4 detections to the employee view. Correction authority and original records unchanged |
| R9 | **Last-known next shift offline** for employees (pull A3b forward): show "Your next shift, as of 6:14 PM", read-only, instead of a blank Home | Employees | M | High | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | **Privacy review** (direction decision 5): what stays on a personal phone. Not on shared Clocker tablets |
| R10 | **Monday owner brief**: the R6 checks rolled up weekly on Home (hours vs last week, overtime risk, missed punches, requests decided, payroll readiness) | Owners | M | Med | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | On-Home version is UI over existing data. Email delivery is a backend change and a notification-preference decision |
| R11 | **Push that opens the decision**: request and missed-punch notifications deep-link straight to the full-context review (p1-Request-Review), never to an approve-from-banner | Managers | S after push exists | Med–High | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** | Needs the APNs/FCM sender (backend). D1 rule: no decision without details |
| R12 | **"What your employer sees" page** in Profile, in both languages: location only at the punch, no tracking off shift, who can see your hours | Employees | S | Med | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **15** | **Privacy and legal copy** sign-off; must match the shell's actual permissions |
| R13 | **Native touches in the shell**: haptics on server-confirmed actions, a header-coloured status bar, splash screen, share sheet | All, in the store app | S | Med | 1 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | **13** | Spike or build. Haptics follow the iOS system setting; never on pay |
| Defer | Shift-end pulse and shout-outs (7shifts and Homebase pattern) | Employees | M | Med | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 11 | Below threshold today: new data, moderation and the risk of a "rate your shift" nag. Revisit after store adoption data |
| Defer | Native Liquid Glass tab bar through a custom Capacitor plugin | iOS | M–L | Low–Med | 1 | 2 | 2 | 1 | 1 | 1 | 0 | 2 | 10 | Two navigation states to keep in step. Revisit only if TestFlight feedback says "feels like a website" |
| Avoid | Earned wage access or instant pay | Employees | L | n/a | 1 | 2 | 0 | 2 | 0 | 1 | 0 | 2 | 8 | Trust 0: fees, eligibility anger, regulation in flux (prior brief). R5 answers the same worry without moving money |
| Avoid | Employee AI chat agent (Connecteam, Humand pattern) now | Employees | L | Med | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 2 | 8 | Cost 0 (model hosting, Spanish quality, answers about pay). Revisit after B5 with a read-only FAQ scope |

**Notes on the current plan from a market view**

- **Dark mode:** keep it, but at low priority. Of the apps we checked, only Gusto users ask loudly for it, and Gusto's September redesign removed it. Ship it when it can be claimed as "Dark Interface" on the store label, not earlier.
- **Company logo (B1):** extend it to the Clocker idle screen and the employee sign-in page. Owners show those to staff on day one.
- **Manager tab naming:** the new phone bar reads Home, Schedule, Inbox, Team and More, where U1 had Requests as the third tab. That is a rename under TEAM-RULES. Keep `/app?view=requests` working, as manager review MG1 asks, and note it in the release notes.
- **Payroll handoff:** sell it as "keep ADP, add NEVORA in Spanish". ADP Mobile has 4.47M iOS ratings and lists English and Portuguese only. Verifying a Paychex Flex import profile is the next partner task. That is backend work and needs Jose's go-ahead; no provider contact.

---

## 7. Top 10, in priority order

Ranked by effect on winning and keeping Puerto Rico small-business owners, then cost. Items already approved in direction.md are marked; the plan doesn't need to change for them, only their order relative to the new items.

| # | Item | Why now | Score | Needs |
|---|---|---|---|---|
| 1 | **R1 New app icon** | The first thing every employee sees; off-brand today; small job | 14 | Jose: brand approval |
| 2 | **R2 Puerto Rico demo workspace** | Every demo, store screenshot and Apple review depends on it | 15 | None (fictional fixture) |
| 3 | **B5 full Puerto Rico Spanish** (approved #1) **plus R4** Spanish-ready layout now | The moat; R4 is UI-only and removes the visible name truncation today | 15 / 16 | B5: backend and Spanish legal copy |
| 4 | **R6 "NEVORA checked…" summaries**, feeding the payroll-readiness check (approved #4) | A verifiable answer to "do you have AI?" at no model cost | 16 | Readiness: read route and payroll copy |
| 5 | **Capacitor spike to store (approved) plus R3 listing kit and R13 native touches** | Store presence is where adoption is won; the accessibility-label gap is open across the category | 15 / 13 | Spike go decision, Jose's developer accounts, listing copy sign-off |
| 6 | **Passkeys and biometric sign-in** (approved #3) | The top complaint in the category; helps clear guideline 4.2 | 14 | Backend auth, privacy for shared phones |
| 7 | **R7 Share-sheet invites** | Week-one activation through WhatsApp with no messaging provider | 14 | Security review of activation links |
| 8 | **R8 Employee self-fix prompt, with B6 offline Clocker** (approved #2) | Clean timecards before payroll; Homebase already prompts employees | 14 / 15 | Backend (B4 delivery, B6) |
| 9 | **R5 Pay-status tracker** | Answers the pay worry EWA sells to, without moving money | 14 | Payroll copy, read-model change |
| 10 | **R9 Offline next shift, plus R11 push into the full review** | Retention on weak signal; managers decide from the lock screen with context | 14 / 15 | Privacy review (R9); push sender (R11) |

The Puerto Rico rules pack (approved #5) stays where direction.md put it, waiting for counsel. It is the strongest reason to switch, but only once it can ship correctly.

---

## 8. Not verified, and limits

- **Homebase press releases** (Oct and Dec 2025) returned 403. The details come from search snippets.
- **Connecteam AI Agent dates** come from third-party profiles. The chat items are confirmed in App Store version history.
- **Deputy AI general availability:** we found no date. The vendor says only "2026".
- **Apple accessibility-label deadline:** Apple says labels will be required "over time" but gives no date (App Store Connect help; the last 9% of the page was unread).
- **Puerto Rico storefront locales:** the US storefront indexes Spanish (Mexico), per secondary ASO sources. We could not confirm Puerto Rico's.
- **Capacitor native tab bar:** we found no plugin. The custom-plugin route is an inference.
- **Competitor in-app Spanish quality** was not tested. Language codes in the listing show bundled localisations, not translation quality or Puerto Rico wording.
- **Speed:** we measured no device numbers for NEVORA or competitors.
- **Mobbin:** still no screens for Deputy, Homebase, 7shifts, Connecteam or When I Work. Employee pay and onboarding patterns come from Gusto, Remote, DoorDash Dasher and Navan.
- **Screens reviewed** are the fictional preview at 390 and 1440. Employee-side new-direction screens were not in the set, so employee judgements lean on the employee review.
- **Effort sizes** are this author's estimates.
