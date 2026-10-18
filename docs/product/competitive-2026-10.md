# NEVORA competitive brief, October 2026

- **Author:** market-strategist-pm (cycle 1 discovery)
- **Date:** 2026-10-17. All web sources were read on this date unless a row says otherwise.
- **Scope:** the whole product on iOS, Android, desktop web, mobile web and PWA.
- **Status:** draft for Checkpoint 1. Nothing here is approved.
- **Evidence key:** "primary" means the vendor's own page, an app store listing, or a Puerto Rico government text. "Secondary" means a tracker, press or review site. "Unconfirmed" means we found no primary source.

## Contents

1. Summary
2. Feature matrix
3. Pricing and app ratings
4. Recent launches (Oct 2025 to Oct 2026)
5. Technology shifts
6. Customer demand themes
7. NEVORA's openings, including Puerto Rico law
8. App-store route comparison and recommendation
9. Ranked opportunities with draft scorecards
10. Gaps and what we could not verify

---

## 1. Summary

**What changed in the market**

- **AI became a free inclusion.** Deputy's pricing page now says Deputy AI comes with every plan, marked "introductory free" ([deputy.com/pricing](https://www.deputy.com/pricing), primary). Gusto charges nothing for Gus or Cofounder. Rippling (7 Jul 2026), Paylocity (21 Jul 2026) and UKG (27 Aug 2026) all shipped AI for time and pay. Buyers now expect AI drafts and anomaly checks inside the base price.
- **"Check before payroll" is the AI use case that shipped.** Gusto's assisted payroll prep (Apr 2026), Rippling's timesheet exceptions (Jul 2026) and Paylocity's Time Correction Agent (Jul 2026) all flag problems before money moves. Chat copilots that take actions are still in beta or early access (Deputy AI beta Nov 2025, Gusto Cofounder early access Jun 2026).
- **Break rules are the new compliance front.** Deputy opened a Break Policy for Scheduling beta about mid-September 2026 (auto-loaded breaks, warnings or hard blocks by shift length and location; [whatsnew.deputy.com](https://whatsnew.deputy.com/), primary, dated "a month ago" on 17 Oct). The rules are generic. Nobody we checked ships Puerto Rico presets.
- **Redesigns are hurting incumbents.** Users blame September 2026 app changes at Gusto, When I Work and Rippling for broken clock-in, extra taps and lost features (App Store reviews, dated below). Gusto's recent-review feed shows 60% one- and two-star reviews between 25 Jun and 15 Oct 2026, while its lifetime rating stays 4.8.
- **Sign-in friction and location tracking top the complaint lists.** Paylocity, UKG Ready, Gusto and Rippling users report forced logouts and password resets that make them late. Connecteam users object to "always allow" location while off shift.
- **Puerto Rico stays underserved.** Gusto's help center says it does not run payroll for employees in US territories, Puerto Rico included ([support.gusto.com](https://support.gusto.com/article/210728164125837), primary). Homebase states payroll for the 50 states and DC only (secondary). Gusto Mobile, Rippling and Sling list English as their only App Store language (primary, iTunes API).

**What it means for NEVORA**

1. Win Puerto Rico on law and language: a Ley 379 rules pack (verified against the DTRH text below) and full Puerto Rico Spanish (B5). No competitor we checked has both.
2. Compete on trust where incumbents are failing: clock-in that works on weak signal (B6), sign-in that stays out of the way, visible receipts for every punch and change, and location only at the moment of a punch.
3. Treat AI as table stakes and start with the safe use case: a payroll-readiness check built on data NEVORA already has (B4 Today accuracy, missed punches). Defer chat agents that act on pay.
4. Ship to the stores with a Capacitor shell over the current Next.js app, with native push, biometric sign-in and a clock-in Live Activity so the app clears Apple's guideline 4.2. Keep one UI codebase.

---

## 2. Feature matrix

H = have, P = partial, M = missing, ? = not verified. NEVORA's column cites the repo; competitor cells cite section 4 or the source in the row note.

| Capability | Gusto | Deputy | Homebase | 7shifts | Connecteam | When I Work | Rippling | Square Team | Sling | UKG Ready | Paylocity | PR local¹ | **NEVORA** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shift scheduling | P? | H | H | H | H | H | H | H | H | H | H | ? | **H** (U3, D5) |
| Auto or AI schedule draft | M | H (Core+) | H (Plus+) | P (AI importer) | P? | ? | H (Jul 2026) | ? | ? | ? | H | M | **P** deterministic drafts with explanations and fairness (`src/lib/scheduling/generation/`), no LLM |
| AI assistant or agents | H | H (every plan) | P (support chat, hiring) | P (Ops Insights) | P (text tools) | ? | H | ? | ? | P (Bryte Assist) | H (Ignite AI) | M | **M** |
| Break and meal rules | ? | H (beta policy) | P? | P? | P? | P? | P (timesheet flags) | P? | ? | H? | H? | ? | **P** configurable rest, max shift, max daily, breaks, projected overtime (`src/lib/scheduling/operational-rules.ts`) |
| Puerto Rico rule preset | M | M | M | M | M | M | M | M | M | ? | ? | ? | **P** PR time zone and Monday-midnight split tested (`scheduling-rules.test.ts:468`); no Ley 379 preset |
| Spanish UI (App Store listing) | M (EN only) | H | H | H | H | H | M (EN only) | H | M (EN only) | H | H | ? | **P** kiosk second lines, vocabulary presets (B2, U9); B5 pending |
| Native store app | H | H | H | H | H | H | H | H | H | H | H | ? | **M** PWA only |
| Shared-device kiosk | ? | H | H | H (7punches) | H (Kiosk app) | H? | ? | H (POS) | ? | H | H | P (Renova QR) | **H** Clocker with PIN and Spanish toggle (U9) |
| Geofence or GPS at clock-in | H² | H | H | H | H | H | H² | ? | ? | H | H | ? | **M** |
| Photo or biometric clock-in | ? | H (Core) | H (photo) | ? | ? | ? | P² | ? | ? | H² | ? | ? | **M** |
| Native payroll | H | P (Paycor add-on, US) | H (add-on) | H (add-on) | M (integrations) | M (partner: Rippling) | H | H | P (Toast) | H | H | H (claimed) | **P** imports provider results, statements, exports; no tax engine (`docs/plans/2026-10-12-configurable-payroll.md`) |
| Puerto Rico payroll | M (help center) | ? | ? (50 states + DC) | ? | M | M | ? | ? | ? | ? | ? | H (claimed) | **P** export to the employer's PR provider |
| Earned wage access | H | ? | H (cash out) | P² | ? | ? | ? | ? | ? | H (UKG Wallet) | ? | ? | **M** |
| Messages with read receipts | M | H | H | H | H | H | P | P | H | P | P | ? | **H** required acknowledgement and recipient receipts (`src/lib/capabilities/types.ts:17`) |
| Punch receipts visible to employee | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | **H** `PunchReceipt` (`src/lib/clocker/punch-types.ts:17`) |
| Company branding at small tiers | ? | ? | ? | ? | P (welcome screen in Basic, Jul 2026) | ? | ? | ? | ? | ? | ? | ? | **H** logo and one brand colour under contrast floors (B1) |
| Dark mode | M² | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | **M** (roadmap Phase 8) |
| Widgets or Live Activities | ? | ? | ? | ? | ? | ? | ? | P (lock-screen widget)² | ? | ? | ? | ? | **M** |

¹ PR local = Nomiva (cloud payroll and hours, claims PR compliance; only a third-party description, [contra.com](https://contra.com/community/WXbq4WNq-nomiva-is-a-cloud-based-payroll-and)), AMS Payroll and ezPaycheck (desktop payroll), Renova Solutions (QR attendance app used by ECONO, SuperMax, Denny's; [newsismybusiness.com](https://newsismybusiness.com/mobile-app-allows-employers-to-track-employees-time-and-attendance), undated). The University of Puerto Rico runs UKG Pro Workforce Management ([UPR Cayey guide, 2025-03](https://www.cayey.upr.edu/wp-content/uploads/sites/10/2025/03/guia-para-el-uso-del-sistema-de-asistencia-ukg-empleados-upr-cayey.pdf)).
² Inferred from dated App Store reviews (section 6), not from vendor documentation.

**Competitor screens (Mobbin).** Gusto Mobile's Home leads with the next payday and a Wallet card selling early pay ([Home](https://mobbin.com/screens/fa4081e0-675f-467a-aa70-8e7b16148c00), [Time off](https://mobbin.com/screens/64a5c79e-88e7-447f-a911-5dc282824b59), [Request time off](https://mobbin.com/screens/1d88efc1-af34-41ec-a9d0-641d625044c9)); these captures predate the September 2026 redesign. Square's web scheduler states that times show in the location's time zone inside its Add shift dialog ([Square web](https://mobbin.com/screens/79c2ca0b-4baf-423b-aa9a-8217b8d74ec2)). Mobbin returned no screens for Deputy, Homebase, 7shifts, Connecteam or When I Work.

---

## 3. Pricing and app ratings

### Pricing (list prices seen on 2026-10-17)

| Company | Model | Tiers and price | AI gating | Source |
|---|---|---|---|---|
| Gusto | Base + per person | Simple $49 + $6, Plus $80 + $12, Premium $180 + $22; time tracking from Plus | Gus and Cofounder carry no price | Secondary (gusto.com returned 403); [noon.ai](https://www.noon.ai/blog/articles/317-gusto-pricing-2026) |
| Deputy | Per user | Lite $5, Core $6.50, Pro $9; $30 monthly minimum since 1 Sep 2025; Payroll by Paycor $8 + $49 base (US, annual Core/Pro); HR $2; Analytics+ $1.50; Messaging+ $1.95 | Deputy AI in every plan, "introductory free"; auto-scheduling Core+ | Primary, [deputy.com/pricing](https://www.deputy.com/pricing) |
| Homebase | Per location | Basic $0 (1 location, up to 10 staff), Essentials $30, Plus $70 (promo $0), All-in-One $120; payroll $49 + $6 per paid employee after 6 free months | Scheduling Assistant on Plus+; Hiring Assistant from $99/mo | Primary, [joinhomebase.com/pricing](https://www.joinhomebase.com/pricing) |
| 7shifts | Per location | Comp free (1 location, ~15 staff), Essentials ~$39.99, Pro ~$79.99, Premium ~$134.99 (annual) | AI Operational Insights tied to Log Book add-on or plan | Secondary, conflicting; [costbench](https://costbench.com/software/employee-scheduling/7shifts/) |
| Connecteam | Per hub, first 30 users | Free to 10 users; Basic $29/$35, Advanced $49/$59, Expert $99/$119 per hub; per-user overage | AI text tools on all tiers; translation on higher tiers | Primary, [connecteam.com/pricing](https://connecteam.com/pricing/) |
| When I Work | Per user | Essentials $2.50, Pro $5, Premium $8; time tracking adds ~$1.50 to $2; free plan removed | ? | Secondary, conflicting; [rework.com](https://resources.rework.com/tools/workforce-management/best-when-i-work-alternatives) |
| Rippling | Quote | Not public | ? | [rippling.com](https://www.rippling.com/blog/introducing-the-new-rippling-time) |
| Square Team | Per team member | Shifts Free (up to 5), Shifts Plus $4 per member (2 minimum) | ? | Secondary snippet of [square.com](https://square.com/us/en/staff/shifts/pricing) |
| Sling | Per user | Free to 30 users (no time clock), Premium $2, Business $3 annual; Lite bundled with every Toast POS package | ? | Secondary; [Toast support, updated 2026-08-12](https://support.toasttab.com/en/article/Sling-by-Toast-Compare-Sling-Lite-and-Sling-Pro) |
| UKG Ready, Paylocity | Quote | Not public | Paylocity Ignite AI included in platform (pricing not stated) | [paylocity.com](https://www.paylocity.com/company/about-us/newsroom/press-releases/paylocity-launches-ignite-ai-redefining-industry-ai-leadership/) |

**Read-out:** small-business buyers see $2.50 to $9 per user or $24 to $135 per location. Free tiers are shrinking (Homebase Basic now caps at 10 staff; When I Work dropped its free plan). Payroll add-ons cluster at about $39 to $49 base plus $6 to $8 per person.

### App ratings and recent-review mood

iOS data comes from the iTunes Search API and the App Store customer-review feed (100 most recent reviews per app). Google Play data comes from each Play listing. Recent feeds skew negative because unhappy people write reviews; use the last column to spot complaint themes, not to measure satisfaction.

| App | iOS rating (count) | Google Play (count) | Last iOS update | iOS languages include ES | 1-2★ share in last 100 iOS reviews (window) |
|---|---|---|---|---|---|
| Gusto Mobile | 4.82 (51,959) | not retrieved | 2026-10-16 | No (EN only) | 60% (2026-06-25 to 10-15) |
| Deputy | 4.79 (5,833) | 4.70 (19,670) | 2026-10-11 | Yes | 49% (2021-12 to 2026-09) |
| Homebase | 4.78 (95,641) | 4.17 (24,779) | 2026-10-14 | Yes | 12% (2026-09-16 to 10-15) |
| 7shifts | 4.84 (30,321) | 4.60 (9,095) | 2026-10-16 | Yes | 8% (2026-07-16 to 10-15) |
| Connecteam | 4.86 (60,673) | 4.77 (30,065) | 2026-10-02 | Yes | 45% (2025-10-28 to 2026-10-15) |
| When I Work | 4.79 (57,637) | not retrieved | 2026-10-06 | Yes | 9% (2026-08-21 to 10-15) |
| Rippling | 4.71 (16,618) | 4.46 (4,847) | 2026-10-15 | No (EN only) | 71% (2025-07-14 to 2026-10-14) |
| Square Team | 4.73 (41,157) | not retrieved | 2026-10-13 | Yes | 43% (2024-10-20 to 2026-10-15) |
| Sling | 4.68 (27,433) | 4.18 (10,294) | 2026-09-09 | No (EN only) | 60% (2025-07-24 to 2026-10-12) |
| UKG Ready | 4.42 (53,063) | 4.68 (36,780) | 2026-09-25 | Yes | 25% (2026-02-27 to 10-15) |
| Paylocity | 4.81 (681,367) | 4.73 (303,783) | 2026-10-06 | Yes | 38% (2026-09-04 to 10-15) |

Minimum iOS: Deputy, Gusto, Homebase, When I Work, UKG Ready and Square require iOS 17; 7shifts requires iOS 18. Deputy's 2026-10-11 notes say this is the last version for iOS 17.

---

## 4. Recent launches (Oct 2025 to Oct 2026)

| Date | Company | What | Why it matters for NEVORA | Source |
|---|---|---|---|---|
| 2025-11 (beta 28 Nov) | Deputy | Deputy AI: chat that builds and publishes schedules, finds replacements, flags timesheet errors; managers only | Sets the copilot bar for shift tools | Primary, [news.deputy.com](https://news.deputy.com/deputy-ai-is-the-intelligent-trusted-teammate-for-managing-shift-based-businesses) |
| 2026-01 (article 23 Jan) | Gusto | Gusto app in ChatGPT; Claude and Slack followed; eligible customers run payroll from chat | Owners start asking for answers outside the app | Secondary, [cpapracticeadvisor](https://www.cpapracticeadvisor.com/2026/01/23/gusto-launches-payroll-inside-claude/176791/) |
| 2026-01 | 7shifts | AI Employee Importer for trial accounts (staff from photo or file) | Onboarding speed through AI import | Primary, [kb.7shifts.com](https://kb.7shifts.com/hc/en-us/articles/48003854541587-What-s-New-January-2026) (title only) |
| 2026-01 to 02 (conflicting) | When I Work | Plans renamed Essentials, Pro, Premium; free plan gone | Price floor rises for tiny teams | Secondary, [pricingsaas](https://pricingsaas.com/companies/wheniwork/diffs/2025Q4), unconfirmed |
| 2026-02-23 to 03-02 | Deputy | Payroll add-on enabled by Paycor, $8 + $49 base, US only | Deputy now bundles pay; still not PR | Secondary [pricingsaas](https://pricingsaas.com/companies/deputy/diffs/2026W10); price primary on deputy.com |
| 2026-03-17 | Connecteam | NFC tag time tracking, auto clock-out | Hardware-light kiosk alternative | Secondary, pricingsaas (Connecteam page) |
| 2026-04 | 7shifts | AI Schedule Importer on mobile (photo or file of an old schedule) | Lowers switching cost from paper | Secondary, [usecarly.com](https://www.usecarly.com/blog/sevenshifts-ai/), unconfirmed |
| 2026-04-23 | Gusto | Spring Showcase, ~75 updates: assisted payroll prep flags anomalies, mobile expenses, Money dashboard, remote I-9 | "Check before you pay" goes mainstream | Secondary, [cpapracticeadvisor 2026-04-30](https://www.cpapracticeadvisor.com/2026/04/30/gusto-unveils-75-new-features-for-small-businesses/182244/) |
| 2026-05 | Paylocity | Scheduling templates, AI dashboard summaries | AI summaries on manager home | Primary, [paylocity.com May 2026](https://www.paylocity.com/resources/learn/blogs/whats-new-may-2026/) (title) |
| 2026-06-02 | Gusto | Cofounder, an "AI teammate" that automates recurring tasks with owner approvals; early access | Agents with permissions and approvals | Secondary, [cpapracticeadvisor](https://www.cpapracticeadvisor.com/2026/06/02/gusto-introduces-an-ai-teammate-for-small-businesses/184399/) |
| 2026-07-07 | Rippling | New Rippling Time: AI schedule draft from a prompt, spreadsheet or photo; timesheets flag missed punches, overtime, breaks; one app for staff and managers | Closest match to NEVORA's scope from a large player | Primary, [rippling.com blog](https://www.rippling.com/blog/introducing-the-new-rippling-time) |
| 2026-07-21 | Paylocity | Ignite AI: Time Correction, Payroll Analysis and Data Inspection agents, admin hub to switch agents on or off | Agent oversight UI as a pattern | Primary, [Paylocity press release](https://www.paylocity.com/company/about-us/newsroom/press-releases/paylocity-launches-ignite-ai-redefining-industry-ai-leadership/) |
| 2026-08 | 7shifts | AI Operational Insights daily summary from Log Book, sales and labour | Daily digest for managers | Primary title, [kb.7shifts.com Aug 2026](https://kb.7shifts.com/hc/en-us/articles/54123863560467-What-s-New-August-2026) (403 on fetch; content from search snippet) |
| 2026-08-27 | UKG | Bryte Voice (12 voice actions for frontline staff, in UKG Pro), Agentic Pay, bulk recruiting | First voice actions for hourly staff | Secondary, [businesswire](https://secure.businesswire.com/news/home/20260827017367/en/UKG-Deepens-Workforce-Operating-Platform-with-AI-Built-to-Help-CHROs-Improve-Frontline-Work) (403 on fetch) |
| 2026-08-31 to 09-21 | Homebase | Payroll base fee $49 to $39, then back to $49 with 6 months free Payroll and Plus | Promotional pricing war on payroll | Secondary [pricingsaas](https://pricingsaas.com/companies/homebase); current price primary |
| 2026-09-01 to 09-03 | Gusto | New logo and look in Gusto Mobile; users report broken clock-in, logouts, dark mode removed | A benchmark product breaking muscle memory | User reports only (App Store reviews); vendor notes say "bug fixes" |
| 2026-09-07 | Homebase | Hiring Assistant out of beta, $99/mo | AI sold as an add-on at the SMB tier | Secondary, pricingsaas |
| ~2026-09 (mid) | Deputy | Break Policy for Scheduling open beta: rules by shift length, break windows and location; warnings or hard blocks; auto-loaded breaks on mobile and desktop | Direct overlap with a PR rules pack, but generic | Primary, [whatsnew.deputy.com](https://whatsnew.deputy.com/) ("a month ago") |
| ~2026-09 (mid) | Deputy | Cap on concurrent leave per location; leave documents; leave balances follow working hours | Leave rules deepen | Primary, whatsnew.deputy.com |
| 2026-09-14 to 21 | Deputy | Pricing page adds "Deputy AI included in every plan" | AI moves into base price | Primary, deputy.com/pricing; secondary [pricingsaas](https://pricingsaas.com/companies/deputy/diffs/2026W39) |
| 2026-09 | 7shifts | Employee Training leaves beta, Premium only | Training bundled into scheduling | Primary, [kb.7shifts.com Sep 2026](https://kb.7shifts.com/hc/en-us/articles/55110421916179-Whats-New-September-2026) (snippet) |
| ~2026-09 | When I Work | New app experience; users complain about complexity and crashes, some mention Rippling | Redesign backlash; Rippling's page calls itself a partner, not owner | User reports; [rippling.com/lp/when-i-work](https://www.rippling.com/lp/when-i-work) |
| ~2026-09-24 | Deputy | Job Titles beta | People data deepens | Primary, whatsnew.deputy.com |
| 2026-10-02 | Connecteam | v10.0: clearer location prompts, improved background tracking | Responds to location-privacy complaints | Primary, App Store notes |
| 2026-10-06 | Paylocity | Rebuilt employee-centric native app (login, navigation, notifications) | Incumbents rebuilding for speed | Primary, App Store notes |
| 2026-10-11 | Deputy | Last app version for iOS 17 and below | Old-device users lose updates | Primary, App Store notes |

No 2026 launches found for Square Team or Sling beyond bug-fix releases.

---

## 5. Technology shifts

Readiness: how mature the technology is for an SMB product today. Cost: for NEVORA, given the current code. Trust risk: chance that it makes someone doubt the app with their pay.

| Shift | Market evidence | Readiness | Cost for NEVORA | Trust risk | NEVORA stance |
|---|---|---|---|---|---|
| AI schedule drafts | Rippling (Jul 2026), Homebase Plus, Deputy Core, Paylocity | High | Low to add on top of the existing deterministic generator; medium for photo or spreadsheet import (needs an LLM) | Medium: a wrong draft costs a manager time; keep drafts unpublished with reasons | Keep the explainable generator; add import later |
| AI copilots and agents | Deputy AI (every plan), Gusto Cofounder (early access), Paylocity Ignite agents, Rippling AI plugins (23 Sep 2026) | Medium | High: model hosting, permission checks per action, audit, Spanish quality | High for any action on pay or time | Start with a read-only payroll-readiness check; no agent writes to pay |
| Voice | UKG Bryte Voice, 12 actions (27 Aug 2026), enterprise tier | Low for SMB | Medium to high | Medium: misheard actions | Watch; revisit for Spanish kiosk prompts |
| Offline-first | Weak-signal complaints at Deputy, Rippling, UKG (section 6) | High (IndexedDB queue, background sync) | Medium; punch commands already carry `commandId` and expected revision (`src/lib/clocker/punch-types.ts:15`), so replays can be idempotent | Medium: must show "saved on this phone" apart from "confirmed by NEVORA" | Do B6 with two honest states |
| Passkeys and biometric unlock | Gusto users mention passkeys (review 2026-09-01); sign-in friction tops complaints | High: WebAuthn on iOS 16+, Android 9+, all desktop browsers | Low to medium: WebAuthn server routes plus UI; native biometric unlock via a wrapper plugin | Low; improves safety | Do it, with step-up only for bank or pay changes |
| Geofenced clock-in | Table stakes (Connecteam, Homebase, Paylocity, Rippling) | High | Low to medium: browser Geolocation in the foreground; no background tracking needed | High if tracking runs off shift (Connecteam backlash) | Location only at the punch, shown to the employee |
| Kiosk | All majors; Connecteam and 7shifts ship separate kiosk apps | High | NEVORA already has Clocker | Low | Lock tablets with iOS Guided Access or Android screen pinning; no code |
| Photo or biometric verification | Deputy (Core), Homebase, UKG face unlock | High | Medium | High: biometric privacy laws; PR rules not checked | Avoid biometrics; optional photo later, only with legal review |
| NFC tags | Connecteam (Mar 2026); a 2026-05-19 review reports unstable NFC punches | Medium; Web NFC works only in Android Chrome | Medium | Medium | Skip |
| Earned wage access | Gusto Wallet, Homebase cash out, UKG Wallet; CFPB advisory opinion Dec 2025; H.R. 9330 introduced 18 Jun 2026; about a dozen state laws ([Faegre Drinker, Aug 2026](https://www.faegredrinker.com/en/insights/publications/2026/8/earned-wage-access-regulatory-update-federal-legislation-advances-as-states-continue-to-act)) | Medium | High; NEVORA moves no money | High: fee and eligibility anger in reviews | Avoid |
| E-signature and acknowledgements | Deputy HR, Connecteam HR hub, Homebase onboarding | High | Low: NEVORA has required acknowledgements with receipts | Low | Extend to policy sign-off in Spanish |
| Push notifications | Web push on iOS needs Home Screen install (iOS 16.4+); Declarative Web Push testable from iOS 18.4 ([WebKit](https://webkit.org/?p=16535)) | High | NEVORA has web push (`web-push`, `public/fuel-portal-sw.js:165`); native push needs an APNs/FCM sender (server change) | Medium: over-notifying is a top complaint | Ship per-category controls with any push expansion |
| Live Activities and widgets | Square Team lock-screen widget (review 2026-09-01); lock-screen activity patterns at [American Airlines](https://mobbin.com/screens/1ba8137b-fa15-44d2-aab0-63cdb7260c21) and [Waymo](https://mobbin.com/screens/005286b9-d695-4f28-93df-7078793d80c1) | High on iOS 16.1+ | Medium; needs a native Swift extension, so only through a store app | Low | "On shift / on break" timer after the store app ships |
| Dark mode | Gusto reviews 2026-09-01, 09-20, 09-30 | High | Medium; roadmap Phase 8 after token consolidation (U10) | Low | Keep on the roadmap |

---

## 6. Customer demand themes

Evidence comes from App Store reviews (paraphrased, dated), Capterra and G2. Reddit blocks our crawler, so it is missing.

| # | Theme | Evidence (date, app) | What it asks of NEVORA |
|---|---|---|---|
| 1 | Clock-in must work first time, with no re-login | 2026-09-03 Gusto: new update broke clock-in. 2026-09-15 Gusto: logged out during a 10-minute break. 2026-10-09 Paylocity: random logouts make the reviewer late. 2026-10-13 UKG Ready: username and password every time. 2026-07-21 Rippling: 2FA on a personal phone mid-shift. 2026-09-28 7shifts: cannot sign in | Long employee sessions (NEVORA: 14 days), passkeys, biometric unlock, step-up only for pay changes |
| 2 | Don't move what I already know | 2026-09-02 and 09-30 Gusto: new layout slower, harder. 2026-09-13 and 10-12 When I Work: new app more complicated, crashes. 2026-06-21 and 09-08 Rippling: schedule and time entry buried. 2026-09-18 and 09-29 Homebase: removed hours per shift and decimal time | Keep navigation and action names (TEAM-RULES); ship changes with old paths that still work |
| 3 | Location only while I'm working | 2026-05-15, 08-10, 09-06, 09-21 Connecteam: "always allow" location and tracking off shift. 2026-08-27 Rippling: camera and location to clock in. 2026-10-05 Paylocity: false "wrong location" errors | Foreground location at the punch, a visible record of what NEVORA stored, a manager override with a reason |
| 4 | Works with weak signal | 2025-04-30 Deputy: won't load in a factory. 2026-07-21 Rippling: field work with low connectivity. 2026-08-18 UKG Ready: lockups and missed time | B6 offline queue with honest states |
| 5 | Let me control notifications | 2026-09-08 Deputy: no way to stop shift emails. 2026-06-21 Connecteam: Sunday timesheet nag. 2026-06-05 and 07-17 Connecteam: missed notifications cost extra shifts. 2026-06-12 Rippling: constant break reminders | Per-category controls and quiet hours; reliable delivery for shift offers |
| 6 | Records I can trust | 2026-09-10 Connecteam: forced time edits leave no trail. 2026-08-30 Gusto: confirmed clock-out, then told clocked in 24 hours. 2026-09-17 Rippling: timecard summary hard to check. 2024-11-24 Deputy: automatic breaks removed time | Employee-visible punch receipts and change history with who, when and why |
| 7 | Honest pricing | 2026-10-10 Homebase: free tier misleading. 2026-10-02 Homebase: Basic cut from 20 to 10 staff. 2026-08-22 Connecteam: charged $102 against an expected $23. 2026-08-26 Sling: hidden subscription | Clear tier limits; branding and Spanish in the base tier |
| 8 | Early pay without fees | 2026-10-01, 09-17, 09-18, 10-08 Gusto: transfer fees, advance eligibility pulled. 2026-09-23 and 09-24 Homebase: cash-out problems | Evidence that EWA brings anger; supports "avoid" |
| 9 | Modern basics | 2026-09-01, 09-20, 09-30 Gusto: no dark mode. 2026-09-21 and 08-17 Gusto: iOS 17 requirement locked out older phones | Dark mode (Phase 8); a web app that runs on older phones is an asset |
| 10 | Manager work on the phone | 2026-10-12 Paylocity: app should match the website. Capterra Feb 2026 Deputy: mobile lacks admin features, slow support ([Capterra](https://capterra.com/p/167811/Deputy/reviews/)). 2026-10-07 Rippling: can't find all shifts | Manager approvals and schedule edits on phones (U4 Inbox covers part) |
| 11 | Glitches and payroll flexibility | Capterra summary of ~1,150 Homebase reviews names limited payroll and pricing flexibility and frequent glitches ([Capterra](https://www.capterra.com/p/153076/Homebase/reviews/?page=2)) | Reliability and payroll exports matter more than features |

Spanish demand: we found no review text asking for Spanish, because the US-centred feeds we sampled skew English. Language coverage in section 3 is the indirect evidence. A PR-specific review sample (Google Play es-PR, local Facebook groups) is a gap.

---

## 7. NEVORA's openings

### 7.1 Puerto Rico labour rules (verified against the DTRH compilation)

Source: DTRH's compilation of Ley Núm. 379 de 1948, revised 18 Dec 2023, listing amendments through Ley 4-2017 and Ley 82-2023 ([trabajo.pr.gov PDF](https://trabajo.pr.gov/docs/Libreria_Laboral/Leyes/Ley%20379-1948,%20Ley%20para%20Establecer%20la%20Jornada%20de%20Trabajo%20en%20Puerto%20Rico.pdf), primary; DTRH notes it is not an official compilation). A federal court voided Ley 41-2022 in March 2023 and the First Circuit affirmed in August 2023, so Ley 4-2017 text applies ([Morgan Lewis, 2023-03](https://www.morganlewis.com/pubs/2023/03/amendments-to-2017-puerto-rico-labor-reform-annulled)). Some law-firm pages still describe Ley 41-2022 rules (meal after the 3rd hour, no 6-hour waiver); ignore them.

| Rule | Text in the DTRH compilation | What NEVORA would check |
|---|---|---|
| Overtime, daily | Hours over 8 in any calendar day (Art. 4(a)); employer may give 5 days' written notice of an alternate 24-hour cycle with at least 8 hours between shifts | Daily overtime per calendar day or the notified cycle |
| Overtime, weekly | Hours over 40 in the work week (Art. 4(b)); week is 168 consecutive hours from the start the employer notifies, else 12:01 a.m. Monday (Art. 5) | Week start setting; NEVORA already splits at PR Monday midnight |
| Other overtime | Rest-day hours, legally-closed hours, hours over a collective agreement's daily maximum (Art. 4(c) to (e)) | Rest-day flag (rest-day law itself not checked) |
| Overtime rate | At least 1.5x; staff hired before Ley 4-2017 with better terms keep them (Art. 6(a)) | Per-employee "hired before 26 Jan 2017" flag |
| Alternate week | Written agreement allows up to 10 hours a day within 40 a week; hours over 10 pay 1.5x (Art. 6(b)) | Agreement record and 10-hour check |
| Meal period, timing | Must start no earlier than the end of the 2nd hour and no later than the start of the 6th consecutive hour (Art. 11) | Schedule and timecard warning |
| Meal period, when required | Paying extra applies after more than 5 consecutive hours without a meal; may be skipped if the day's total is 6 hours or less (Art. 11) | Waiver logic for short shifts |
| Second meal period | Required over 10 hours; may be skipped if total is 12 hours or less and the first was taken (Art. 11) | Second-meal check |
| Shorter meal period | Down to 30 minutes by written stipulation; 20 minutes for croupiers, nurses, security guards; stipulation holds a year before withdrawal (Art. 11) | Stipulation record per employee |
| Working through the meal | Pay that time at 1.5x; earlier hires keep higher rates (Art. 11) | "Meal penalty hours" line in payroll export |
| Written schedule notice | Employer must notify daily hours, start and end, and the meal period in writing (Art. 11) | Published schedule as the written notice, in Spanish |

Every one of these needs sign-off from Puerto Rico labour counsel before NEVORA ships it, and payroll and legal copy stay exactly as approved.

### 7.2 Full Spanish

Gusto Mobile, Rippling and Sling list English only on the App Store. Others list Spanish, but we did not test their Puerto Rico wording. NEVORA has reviewed English and Puerto Rico Spanish slots for vocabulary (`src/lib/workspace-presentation/words.ts:2`) and Spanish kiosk lines (U9). B5 would extend this to every employee and manager surface.

### 7.3 Verified, receipt-confirmed data

NEVORA returns a receipt for each punch (`PunchReceipt`), tracks message acknowledgement receipts, keeps CSV import receipts and reversal (`src/lib/capabilities/types.ts:21`), and checks today's punches against published shifts (B4). Competitors' reviews in theme 6 show employees doubt their records. No competitor markets employee-visible receipts.

### 7.4 Safe company branding at small-business tiers

B1 lets an Owner set a logo and one colour, derived under contrast floors. Connecteam only added welcome-screen customisation to Basic in July 2026. Branding with guaranteed contrast is a packaging lever: put it in the entry tier.

---

## 8. App-store route comparison and recommendation

### Facts about today's code

- Next.js 16 App Router with server rendering: 51 pages, 60 route handlers, 125 of 338 `.tsx` files marked client components (repo count, 2026-10-17). A static export (`output: 'export'`) would not work without rewriting server pages, so a Capacitor shell would load the live HTTPS app.
- PWA with manifest, offline page and web push (`public/fuel-portal-sw.js`). No offline punch queue yet (B6).

### Criteria, fixed before comparing (concept-selection)

| Criterion | Type |
|---|---|
| T1. Credible path through Apple guideline 4.2 ("elevate it beyond a repackaged website") | Threshold |
| T2. One UI codebase for desktop web, mobile web, PWA and stores | Threshold |
| T3. Keeps WCAG 2.2 AA, focus and reduced motion we already verify | Threshold |
| Build and upkeep cost, code reuse, push, offline, camera and kiosk, update speed, Live Activities and widgets | Trade-offs |

### Comparison

| | A. Capacitor over the live Next.js app (iOS + Android) | B. Expo / React Native | C. Trusted Web Activity (Android only) |
|---|---|---|---|
| Code reuse | ~95% of UI and all server code; new work is the shell and plugins | Server and pure `src/lib` logic only; every screen rebuilt in RN | 100% |
| Build cost (estimate) | Weeks: shell, push, biometrics, store listings, review account | Months: rebuild employee and manager mobile surfaces, then keep two UIs in step | Days: Bubblewrap project, Digital Asset Links, Play listing |
| Upkeep | Capacitor majors yearly (8 in Dec 2025, 9 planned late Nov 2026); move CocoaPods to Swift Package Manager before 2 Dec 2026 ([Ionic roadmap](https://www.plushcap.com/content/ionic/blog/ionic-the-road-to-capacitor-9)) | Expo SDK cadence; SDK 55 (25 Feb 2026) forces the New Architecture ([expo.dev](https://expo.dev/changelog/sdk-55)); two design systems | Chrome handles it; asset-link fingerprint must match Play signing key |
| Apple 4.2 risk | Medium. Bare web wrappers get rejected; developers report 4.2 rejections even with push and location added ([report](https://scribe.disroot.org/post/7369014), unconfirmed). Mitigate with native push, biometric or passkey sign-in, a clock-in Live Activity and widget, offline punches, Spanish | Low | Not applicable (no iOS). Google Play needs PWA quality: since Chrome 86, failed asset-link checks or 404/5xx navigations count as crashes ([web.dev](https://web.dev/using-a-pwa-in-your-android-app)) |
| Push | Native APNs/FCM through a plugin; NEVORA server needs an APNs/FCM sender next to web push | Native, best tooling | Web push in Chrome works today |
| Offline | Service workers in WKWebView need App-Bound Domains (max 10, no wildcards) or native storage through a plugin; B6 queue applies | Best (SQLite) but rebuilt | Existing service worker |
| Camera | Web `getUserMedia` or Camera plugin | Native | Web |
| Kiosk | iOS Guided Access; Android lock-task needs device-owner (MDM) | Same, plus native lock-task code | Screen pinning only |
| Update speed | Web changes reach users on the next load; shell changes go through review | EAS Update ships JS over the air; native changes through review | Instant (web) |
| Accessibility | WKWebView exposes our ARIA to VoiceOver; Dynamic Type needs CSS work (`-apple-system-body` or a text-size plugin) | Native semantics and Dynamic Type, but every screen needs re-verifying | Chrome plus TalkBack; follows Chrome text size |
| Live Activities, widgets | Possible through a Swift extension target | Possible through config plugins (still Swift) | No |
| T1 / T2 / T3 | Pass with mitigations / Pass / Pass | Pass / **Fail** / Pass after rework | n/a (no iOS) / Pass / Pass |

### Recommendation: Option A, Capacitor for iOS and Android

Reasons:

1. It is the only route that passes all three thresholds. NEVORA keeps one teal design system, one accessibility sweep and one release train across all four platforms.
2. Store presence is table stakes: all eleven competitors ship native apps rated 4.4 or higher. Employees look for an app in the store when their employer tells them "download NEVORA".
3. The native features that clear 4.2 match what users ask for: passkey or biometric sign-in (theme 1), push with controls (theme 5), offline punches (theme 4), and a lock-screen shift timer.
4. Incumbents with fully native apps still get one-star reviews for failed clock-ins and logouts (section 6), so a Capacitor shell with server-confirmed punch receipts can compete on reliability.

What A costs: a native-feeling gap remains in gestures and scrolling, Dynamic Type takes real CSS work, native push needs a server change, and an Apple rejection under 4.2 can still happen. Before building, run a two-week spike on (a) WebAuthn passkeys inside WKWebView with associated domains, (b) App-Bound Domains with our service worker, (c) one Live Activity, and (d) a TestFlight submission with a fictional review workspace. Apple's 5.1.1 account-deletion rule needs a decision for employer-created accounts.

Rejected options:

- **B. Expo / React Native.** It tested whether a fully native app wins on feel and hardware access. It lost on T2: two UI codebases double design and QA work and create the technical debt TEAM-RULES forbids. Bring it back if Apple rejects the Capacitor app under 4.2 twice after native features, or if kiosk or offline needs outgrow a WebView.
- **C. TWA.** It tested the cheapest Play listing. It lost because it covers Android only and adds nothing for iOS, so the team would run two wrapper technologies. Bring it back if NEVORA wants a Play listing before the Capacitor spike finishes; a later Capacitor build can replace it under the same package name and signing key.

---

## 9. Ranked opportunities for NEVORA

Scorecard lines (0 to 2): Usability, Familiarity, Trust, Accessibility, Brand distinctiveness, Durability, Cost, Continuity. Go-ahead needs 12 of 16 and no 0 on Trust, Accessibility or Usability. These are draft scores for the Product Designer to confirm.

| Rank | Opportunity | Business case | U | F | T | A | B | D | C | Co | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Puerto Rico rules pack** (Ley 379 preset: daily and weekly overtime, meal timing, waivers, second meal, 30-minute stipulations, meal-penalty export) | No competitor ships PR presets; Gusto excludes PR payroll; Deputy's break beta is generic. NEVORA's rule engine already holds rest, shift, daily, break and overtime rules | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | **14** |
| 2 | **Full Puerto Rico Spanish (B5)** across employee and manager surfaces | Gusto, Rippling and Sling are English-only apps; NEVORA's first market speaks Spanish; vocabulary slots exist | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** |
| 3 | **Offline punches with honest states (B6)**: "Saved on this phone, sending" vs "Confirmed, receipt" | Weak-signal complaints at Deputy, Rippling, UKG; idempotent punch commands already exist | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** |
| 4 | **Store apps via Capacitor** with native push, biometric unlock and a shift Live Activity | Every competitor is in both stores; prerequisite for 5 and for widgets | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **13** |
| 5 | **Sign-in that stays out of the way**: passkeys, biometric unlock, step-up only for pay and bank changes | Top complaint at Gusto, Paylocity, UKG Ready, Rippling, 7shifts | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** |
| 6 | **Payroll-readiness check** before export: missed punches, meal violations, overtime against history, each with a link to the record | Gusto, Rippling and Paylocity shipped this in 2026; NEVORA has B4 Today accuracy and missed punches; no LLM needed | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** |
| 7 | **My time receipts**: employee-visible punch receipts and change history (who, when, why) | Wage-theft fears in Connecteam, Gusto, Deputy reviews; `PunchReceipt` and time corrections exist | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | **15** |
| 8 | **Location at the punch only**, shown to the employee, manager override with a reason | Geofencing is table stakes; Connecteam and Rippling get backlash for tracking | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **14** |
| 9 | **Notification controls**: per category, quiet hours, email off | Deputy, Connecteam, Rippling complaints | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** |
| 10 | **Dark mode** (roadmap Phase 8) | Gusto complaints; expected by phone users | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **12** |
| Defer | AI schedule import from photo or spreadsheet | Rippling and 7shifts have it; LLM cost and error handling | 2 | 1 | 1 | 1 | 1 | 1 | 0 | 2 | 9 |
| Defer | Chat copilot that acts on schedules or pay | Deputy, Gusto have it in beta or early access | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 2 | 7 (blocked: Trust 0) |
| Avoid | Earned wage access | Fee anger in reviews; regulation in flux; NEVORA moves no money | 1 | 2 | 0 | 2 | 0 | 1 | 0 | 2 | 8 (blocked: Trust 0) |

Ranks weigh business impact in Puerto Rico above raw score: items 1 to 3 are the reasons a PR employer would switch; item 4 unlocks distribution; item 5 fixes the most common complaint in the category.

### Platform notes for the top five

| Opportunity | iOS app | Android app | Desktop web | Mobile web | PWA |
|---|---|---|---|---|---|
| 1. PR rules pack | Warnings on schedule and timecard sheets | Same | Rule settings, warnings in grid and timecards, export line | Same warnings, stacked | Same as mobile web |
| 2. Spanish | Follows the app language setting; `lang` set per page for VoiceOver | Follows system language; TalkBack reads `lang` | Language switch in profile | Same | Same |
| 3. Offline punches | Plugin storage or App-Bound service worker; confirmation after reconnect | WebView service worker | Not needed (managers online) | Service worker queue; state shown on Home | Service worker queue |
| 4. Store apps | Capacitor shell, APNs, Face ID, Live Activity, safe areas | Capacitor shell, FCM, fingerprint, back gesture | No change | No change | Stays as is for users who prefer it |
| 5. Sign-in | Passkeys via associated domains; Face ID unlock | Passkeys via Credential Manager; fingerprint unlock | Passkeys in browser | Passkeys in browser | Passkeys in browser |

---

## 10. Gaps and what we could not verify

- **"Market position" notes:** the brief points to notes at the top of the main plan. The plan (`~/.claude/plans/no-because-this-does-keen-reddy.md`) has no such section, and no file in the repo matches.
- **Deputy Break Policy date:** Deputy's page shows "a month ago" on 17 Oct 2026, so mid-September is approximate.
- **Gusto September redesign and When I Work's new app:** user reports only; vendor release notes say "bug fixes". When I Work reviews mention Rippling, but Rippling's page describes a partnership.
- **Pricing pages blocked:** gusto.com and 7shifts.com returned 403 or empty pages; their prices come from secondary sites that disagree.
- **Puerto Rico payroll support:** confirmed missing for Gusto only. Not checked for Deputy, 7shifts, Rippling, Square, UKG Ready or Paylocity.
- **Google Play ratings:** not retrieved for Gusto, When I Work and Square Team (package IDs not found).
- **Reddit:** our search tool cannot reach reddit.com. G2 returned one comparison page only.
- **Puerto Rico law not checked:** the weekly rest-day law (Ley 289), minimum wage, vacation and sick accrual, Christmas bonus, and biometric privacy rules. The DTRH compilation is unofficial; counsel must confirm.
- **Technical spikes still owed:** passkeys inside WKWebView, App-Bound Domains with our service worker, Declarative Web Push status in shipping iOS, and Apple's 5.1.1 deletion rule for employer-created accounts.
- **Build estimates** in section 8 are this author's estimates, not quotes.
- **Mobbin:** no screens found for Deputy, Homebase, 7shifts, Connecteam or When I Work; Gusto captures predate its September 2026 changes.
