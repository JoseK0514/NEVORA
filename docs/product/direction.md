# NEVORA product direction

- **Cycle:** 1, step 2 (direction). Written 2026-10-17 by the Product Designer.
- **Inputs:** `docs/product/trends-2026-10.md` (cited as **T §n**), `docs/product/competitive-2026-10.md` (**C §n**), `DESIGN.MD` (U0 to U10, B1 to B4, D1 to D6, error pass), `docs/execution/2026-10-15-gusto-roadmap.md`, screenshots in `.claude/evidence/`, and the fictional Home preview viewed live at 1440 and 390 for Owner and Employee.
- **Status:** draft for Checkpoint 1. Jose approves the priorities, the app-store route and the separate approvals in section 5. Nothing here is approved yet.
- **Limits:** I viewed only `/ui-preview/home` live. I did not sign in to the full portal, so every other page comes from the existing screenshots. Nothing ran on a physical phone.

---

## 1. Product summary and design principles

### 1.1 Summary

NEVORA Workforce runs scheduling, time and pay for small and medium businesses, starting in Puerto Rico. Owners and managers work mostly on desktop. Employees work on phones, and they punch only at their location's Clocker (`src/components/employee-time-panel.tsx:59`: "Use your location's Clocker to record punches.").

The UI track is complete (roadmap "UI track complete"; D1 to D6 and the error pass). Screen patterns now match what people expect (T §1, T §4). The next gains sit in four places:

1. **Language.** Spanish reaches only the Clocker today. The root layout hard-codes `<html lang="en">` (`src/app/layout.tsx:22`). Gusto Mobile, Rippling and Sling ship English only (C §3, C §7.2).
2. **Reliability you can see.** Weak signal and lost punches top competitor complaints (C §6 themes 1, 4, 6). NEVORA already returns a receipt for each punch (`PunchReceipt`, `src/lib/clocker/punch-types.ts:17`).
3. **Getting in.** Employees type an ID and password (`src/app/login/page.tsx:49-66`); the repo has no WebAuthn code (T §3.1, confirmed by search).
4. **Reach.** NEVORA has no store app, and the phone ignores the system text size (T §3.3, C §8).

### 1.2 What makes it NEVORA

Protect these five traits. Any proposal that weakens one loses its Brand point.

| Trait | Where it lives today |
|---|---|
| **Teal means "act here"** | Accent #077572 on buttons, links, the active nav item and focus rings only; dark-teal masthead #1C4A47; the status ladder (grey, amber, green, coral) for everything else (D4, Batch 2) |
| **Calm and verified** | "Updated 4:49 PM" stamps, "Published shifts only", failed reads that say "unavailable" and never show zeros (B4, U8), pending labels until the server confirms (Phase 4), "no-show" banned by a test (B4) |
| **Puerto Rico and Spanish-first** | "Puerto Rico time" instead of `America/Puerto_Rico` (D5, D6), bilingual Clocker lines with `lang="es"` (U9), reviewed Puerto Rico Spanish vocabulary slots (B2) |
| **Trustworthy pay** | Payroll stepper tied to one exact revision (U6), no celebration of payroll actions or amounts (U7), no swipe on pay (U4), payroll copy locked as approved (TEAM-RULES) |
| **One brand moment per screen** | The next-shift pass with its perforated stub (U2) and the one-weight line illustrations in `currentColor` (U0) |

Spanish-first is the weakest trait today. Outside the Clocker, you can't use NEVORA in Spanish yet.

### 1.3 What the screens show today (my review)

- **Employee Home, desktop** (`.claude/evidence/errors/employee-home-1440.png`): the pass shows tomorrow's shift first and today's "Scheduled now" shift below it. The shift under way should lead. The line "Scheduled assignment; clock status is shown separately." still reads as audit language (U5 missed it).
- **Phone Timecards** (`.claude/evidence/d12/phone-app-timecards.png`): "Refresh timecards" is a pill that wraps to two lines beside a teal pill. D4 fixed button shape on desktop only, so phones still carry legacy button styles.
- **Schedule, desktop** (`.claude/evidence/d6/owner-app-schedule-1920.png`): "Full week" is a solid teal selected pill. That breaks "teal for actions only". D4 left the day picker alone on purpose; I'd bring it onto the status ladder in the phone-foundations work.
- **Home preview, live:** the preview sidebar still lists the pre-D3 entries (Owner: Availability, Shift requests, Templates, Time off, Payroll export, Scheduling rules; Employee: Availability, Profile). The Owner preview's Today strip says 4 people are clocked in while its rail says "No one is clocked in right now." Reviewers use this preview, so it misleads them.
- **Owner Home, phone, live:** there's no search entry. This confirms T §3.4.

### 1.4 Design principles (each one testable)

| # | Principle | Test |
|---|---|---|
| P1 | **Teal means you can act.** Status, selection and decoration use the ladder or ink. The next-shift pass is the one exception. | An inventory script finds no teal fill or text on a non-interactive element, on any page, at 390 and 1440. |
| P2 | **Say what we know and how fresh it is.** Server-read numbers carry a scope or an "Updated" time. A failed read says unavailable. Time and pay never show as done before the server confirms. | Block each API in the browser: no page shows 0, "all caught up" or an empty list. Each decision control shows a pending label until the response arrives. |
| P3 | **Spanish is a first language.** Each screen works in Puerto Rico Spanish with the right `lang`, and layouts hold the longer strings. | Every page in the 156-check sweep runs in Spanish too: no English left outside proper nouns and approved legal text, no clipping at 390 or at 200% text. |
| P4 | **Pay and time stay serious.** No swipe, celebration, optimistic state or generated text on payroll or time records. | A grep and a flow script confirm none of these on `/app/payroll*`, `/app/timecards*` or `/app/my-time`. Payroll copy diffs empty against the approved text. |
| P5 | **Familiar first, NEVORA in the details.** Each new pattern names its reference (an app on Mobbin or a platform guideline). Anything moved keeps a working old path for at least one release. | Each spec lists its reference and its migration note. Old URLs and menu entries still reach the moved page. |

---

## 2. Adopt, adapt, avoid

### 2.1 How I score

Lines in TEAM-RULES order: **U** Usability, **F** Familiarity, **T** Trust, **A** Accessibility, **B** Brand distinctiveness, **D** Durability, **C** Cost, **Co** Continuity. Go needs 12 of 16 and no 0 on T, A or U.

Two lines need a fixed rubric, because the reports used them differently:

- **Brand:** 2 strengthens one of the five traits in 1.2. 1 keeps the look and adds nothing distinct. 0 makes NEVORA look generic.
- **Cost:** 2 is small and UI-only, with no new upkeep. 1 builds on existing patterns or a bounded new piece, with bounded upkeep. 0 needs infrastructure NEVORA doesn't have, or creates lasting debt.

Merged items: passkeys and sign-in (T §3.1, C #5); notifications (T §3.2, C #9); offline (T §3.6, C #3); phone search and manager phone work (T §3.4, C theme 10); store apps and native extras (T §3.9, C §8, C #4); dark mode (T §3.10, C #10); voice (T §2, C §5); AI (T §3.8, T §5, C §5, C §9 defers). Variants that the reports list as "avoid" fold into their parent row: the first-launch notification prompt into A7, pay on the lock screen into A12, the in-app theme switch into A16, and a custom pull inside a browser tab into A15.

### 2.2 Scores

| ID | Item (sources) | Call | U | F | T | A | B | D | C | Co | Total | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Full Puerto Rico Spanish, B5 (C §7.2, C #2) | Adopt | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go |
| A2 | Puerto Rico rules pack, Ley 379 (C §7.1, C #1) | Adopt | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | **14** | Go, gated on counsel |
| A3a | Offline Clocker punches with two honest states, B6 (C §5, C theme 4, C #3) | Adopt | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go |
| A3b | Employee's own week readable offline (T §3.6) | Adapt | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | **13** | Go after A3a and privacy sign-off |
| A4 | Passkeys and Face ID / fingerprint sign-in (T §3.1, C §5, C theme 1, C #5) | Adopt | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | Go |
| A5 | Payroll-readiness check before export (C §1, C #6) | Adopt | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go |
| A6 | My time receipts and change history (C §7.3, C theme 6, C #7) | Adopt | 2 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | **14** | Go |
| A7 | Notifications: prompt in context, per-category controls, quiet hours, icon badge (T §3.2, C theme 5, C #9) | Adopt | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | Go |
| A8 | Search on phones for owners and managers (T §3.4, C theme 10) | Adapt | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** | Go |
| A9 | Phone foundations: type in `rem` that follows text size, legacy CSS retired page by page, D4 shapes on phones (T §3.3, DESIGN.MD U10) | Adopt | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | Go |
| A10 | Owner setup progress card (T §3.7, roadmap Phase 6) | Adapt | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** | Go |
| A11 | Store apps through Capacitor over the live Next.js app (C §8, C #4) | Adopt | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **12** | Go for the spike; build decision after it |
| A12 | Shift Live Activity, Android Live Update, Next shift widget (T §3.9, C §5) | Adapt | 2 | 1 | 2 | 1 | 1 | 2 | 0 | 2 | **11** | Revise: re-score once the store app exists |
| A13 | Android icon shortcuts in the manifest (T §3.9) | Adopt | 1 | 1 | 2 | 2 | 1 | 2 | 2 | 2 | **13** | Go |
| A14 | Plain-language questions in the finder, rules-based (T §3.8) | Adapt | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | **13** | Go after A8 and A1 |
| A15 | Pull to refresh (T §3.5) | Adapt | 1 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | **12** | Revise: store app only, native control |
| A16 | Dark mode that follows the system (T §3.10, C §5, C #10) | Adapt | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 2 | **10** | Revise: after A9 retires legacy CSS |
| A17 | Back gesture closes sheets and dialogs, verified on devices (T §4) | Adopt | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** | Go |
| A18 | Policy sign-off with receipts, in Spanish (C §5) | Adapt | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **14** | Go after A1 and legal copy approval |
| A19 | Haptics on confirmed actions (T §2) | Watch | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **12** | Go inside the store app only |
| A20 | Location recorded at the punch, geofence (C §5, C theme 3, C #8) | Adapt | 1 | 2 | 1 | 2 | 1 | 2 | 0 | 1 | **10** | Revise: needs a phone clock-in decision first |
| A21 | Kiosk lock help: iOS Guided Access, Android screen pinning (C §5) | Adopt | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **14** | Go |
| A22 | AI schedule import from photo or spreadsheet (C §5, C §9 defer) | Watch | 2 | 1 | 1 | 1 | 1 | 1 | 0 | 2 | **9** | Reject for now |
| X1 | AI that acts on schedules, approvals or pay; open chat bubble (T §5, C §9 defer) | Avoid | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 2 | **7** | Reject (Trust 0) |
| X2 | Earned wage access (C §5, C theme 8, C §9) | Avoid | 1 | 2 | 0 | 2 | 0 | 1 | 0 | 2 | **8** | Reject (Trust 0) |
| X3 | More glass chrome; a CSS capsule tab bar (T §2, T §5) | Avoid | 0 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | **4** | Reject (U 0, A 0) |
| X4 | Face or voice clock-in; photo verification (T §5, C §5) | Avoid | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | **5** | Reject (T 0, A 0) |
| X5 | Custom voice screens or voice actions (T §2, T §5, C §5 Bryte Voice) | Avoid | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 2 | **7** | Reject |
| X6 | Streaks, points or badges for attendance (T §5) | Avoid | 0 | 2 | 0 | 2 | 0 | 0 | 2 | 2 | **8** | Reject (U 0, T 0) |
| X7 | Full-swipe instant commit; any swipe on pay (T §5) | Avoid | 1 | 2 | 0 | 1 | 1 | 2 | 2 | 1 | **10** | Reject (T 0) |
| X8 | Onboarding carousels and coach marks (T §5) | Avoid | 0 | 2 | 1 | 1 | 0 | 0 | 2 | 1 | **7** | Reject (U 0) |
| X9 | Infinite scroll on Timecards, Payroll, Employees (T §5) | Avoid | 0 | 2 | 1 | 0 | 1 | 1 | 1 | 0 | **6** | Reject (U 0, A 0) |
| X10 | NFC tag punching (C §5) | Avoid | 1 | 0 | 1 | 1 | 1 | 1 | 0 | 1 | **6** | Reject |
| X11 | Hyper-real 3D, heavy gradients, ultra-light type (T §5, TEAM-RULES) | Avoid | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | **3** | Reject |

### 2.3 One line of reasoning per score

Order: U · F · T · A · B · D · C · Co.

- **A1** People read pay and shifts in their own language · a language setting in Profile is standard · native-language pay text removes doubt · per-element `lang` lets VoiceOver pronounce Spanish · Spanish-first is a core trait · languages don't go out of style · large job: dictionaries for 51 pages plus string upkeep · English stays the same, same layout.
- **A2** Warns before a schedule publishes or pay exports · warnings use the existing grid and timecard patterns · scores 2 only with counsel sign-off, 0 without · warnings carry text, never colour alone · no competitor ships Puerto Rico presets (C §2) · the law changed in 2017 and 2022 (C §7.1) · the rule engine exists (`src/lib/scheduling/operational-rules.ts`), new rule types are large · managers keep today's screens.
- **A3a** A punch still records on weak Wi-Fi · offline-pending is familiar from messaging apps · "Saved on this tablet, sending" differs visibly from "Confirmed" with its receipt · state shown in text and a live region · the verified-feeling trait in action · offline queues last · `commandId` and expected revision make replay idempotent (`punch-types.ts:15`), queue and states are medium work · the Clocker flow and PIN stay the same.
- **A3b** Employees see next week in a basement · ticket and airline apps teach it · stale data and personal data on the device lower trust · the stamp and banner read as text · neutral · lasting · service-worker storage and clear-on-sign-out are new · Schedule opens the same way.
- **A4** One tap instead of ID and password · bank and shopping apps use it (T §3.1) · system sheets look safe, fallback stays · system sheets are accessible; password remains · neutral · passkeys are the direction of the platforms · WebAuthn routes, a credential table and recovery rules · password sign-in stays.
- **A5** Catches missed punches and open timecards before export · Gusto, Rippling and Paylocity shipped it in 2026 (C §4) · each flag links to its record · a text list with counts · trustworthy pay is a NEVORA trait, so I raise C's Brand 1 to 2 · checks before pay will last · a new read route across timecards, B4 data and hours history, so I lower C's Cost 2 to 1 · it sits inside the existing Review step (U6).
- **A6** Employees check a punch or an edit themselves · change history is less familiar than a receipt, so 1 · who, when and why on the record · text rows · verified-feeling trait · lasting · `PunchReceipt` exists, but I haven't confirmed the correction history reaches the employee response, so I lower C's Cost 2 to 1 · My time keeps its layout.
- **A7** People get the alerts they want and silence the rest · Cash App and Luma ask in context (T §3.2) · no marketing pushes, ever · system prompts and settings rows are accessible · neutral · lasting · the prompt and badge are UI work, but per-category controls need stored preferences and server filtering, and the badge needs a count on every page (U4 deferred it), so I lower both drafts' Cost 2 to 1 · nothing moves.
- **A8** A manager finds a person without More › Employees · HIG Search fields, Jobber, Shopify (T §3.4) · same authority-checked route · the finder already has combobox semantics (U8) · neutral · lasting · reuses `command-finder.tsx` and `/api/manager/finder` · four tabs plus More stay; a header button adds an entry.
- **A9** Large-text users read without pinching · follows the phone's own setting · one button shape on phones reads finished · App Store "Larger Text" label (T §3.3) · neutral at default size, so I lower T's Brand 2 to 1 · lasting · 2,272 `px` sizes (T §2) moved page by page against the U10 baseline · zero visual change at default size.
- **A10** An Owner sees how much setup is left · Square, Klaviyo, HoneyBook (T §3.7) · uses existing configuration checks · text plus an aria-hidden bar, as Home already does · neutral · lasting · existing checks and the existing 4px bar · setup items move from Tasks into the card on the same screen.
- **A11** The shell alone speeds no task, so I lower C's 2 to 1 · employers tell staff "download NEVORA" · store presence reads as legitimate · VoiceOver works in WKWebView but Dynamic Type needs A9 · neutral · Capacitor ships yearly majors (C §8) · bounded: shell, plugins, two listings · the web app and PWA stay.
- **A12** Start time on the lock screen saves opening the app · common in delivery apps, rare in work apps · start time and location only, never pay · lock-screen surfaces need their own VoiceOver checks · neutral, so I lower T's Brand 2 to 1 · HIG updated 2026-10-13 · needs a native shell and a Swift extension · Home card stays.
- **A13** Saves two taps on Android · long-press shortcuts are less known · harmless · system menu · neutral · lasting · a manifest change · nothing moves.
- **A14** "Who's off Friday" answers in one step · a typed question in a search box is still new in work tools · answers only from authority-checked reads, each with source and time · same finder semantics · neutral · lasting as search, not as chat · needs parsing in two languages and new filters · the finder keeps working as it does.
- **A15** Refresh buttons and 30-second polling (B4) already cover it, so I lower T's U 2 to 1 · Mail and Instagram teach it · a hand-built pull in a web view can misfire against the More sheet's swipe, so T 1 · buttons stay · neutral · lasting · native refresh control needs the shell · buttons stay.
- **A16** Comfort, not speed · HIG says people expect it · a half-dark product looks broken · the ladder and B1 floors need dark versions · neutral · lasting · 165 `!important` rules and a light-only B1 ladder (T §3.10), so I lower C's Cost 1 to 0 and its Trust 2 to 1 · follows the system, no switch.
- **A17** People expect Back to close a sheet · NN/g and Android Back · leaving the page by accident feels broken · predictable for switch and keyboard users · neutral · lasting · test on devices, then small fixes in `app-shell.tsx` · nothing changes when it already works.
- **A18** A new Owner task, so U 1 · acknowledgements already exist · receipts per person · text-based · Spanish policy text fits the Puerto Rico trait · lasting · extends required acknowledgements (`src/lib/capabilities/types.ts:17`), legal text needs approval · Updates stays.
- **A19** A light tap confirms an approval landed · system controls use it · confirmed actions only · never the only cue, follows system settings · neutral · lasting · plugin in the shell · nothing moves.
- **A20** Location adds little when punches happen at a fixed Clocker · geofencing is standard elsewhere · collecting location from personal phones raises the Connecteam backlash (C theme 3) · text messages · neutral · lasting · needs a whole new punch channel on personal phones plus privacy review, so Cost 0 · changes how managers and staff record time, so Co 1. I disagree with C's 14: C §9 assumes phone punching that NEVORA doesn't have.
- **A21** Stops staff leaving the Clocker on a shared tablet · OS features owners can look up · no code · system features · neutral · lasting · help text only · nothing moves.
- **A22** Saves typing an old schedule · Rippling and 7shifts have it · wrong imports cost time and trust · image parsing has no accessible review path yet · neutral · import models change fast · needs a language model and error handling · the generator stays. Agree with C's 9.
- **X1** Fewer clicks in theory · chat is familiar · a wrong answer about pay or an action taken without a person pressing the button breaks trust · chat output is hard to review · neutral · chat-bubble fashion · model hosting and per-action authority checks · nothing removed. Agree with C's 7.
- **X2** Early pay helps some · Gusto and Homebase offer it · fee anger in reviews and changing regulation (C §5) · forms are accessible · moves NEVORA into lending, off-brand · law in flux · NEVORA moves no money · nothing removed. Agree with C's 8.
- **X3** Speeds nothing · iOS 26 users know it, Android users don't · looks trendy · text over moving content loses contrast; U1 had to raise the bar to 92% white · generic iOS imitation · Material 3 went the other way · CSS blur costs paint time · today's frosted bars stay with solid fallbacks (Phase 3), no more glass.
- **X4** Faster than a PIN in theory · face unlock is known · biometric data employees can't easily refuse · voice fails in noisy rooms · neutral · law unclear in Puerto Rico (C §10) · new hardware paths and legal review · the PIN flow would change.
- **X5** Small gain · voice exists in AI apps · misheard actions · keyboard dictation already works in English and Spanish · neutral · custom voice screens date fast · high · nothing removed.
- **X6** Speeds nothing · games use it · shames people who are late · fine technically · erases the calm trait · fad · cheap · nothing removed. U7 already excludes streaks.
- **X7** Saves a tap · Mail uses it · one accidental swipe approves time off or pay · needs a precise gesture · neutral · lasting pattern · cheap · would replace the half-row threshold managers know (U4).
- **X8** NN/g measured no gain (T §3.7) · familiar · feels like a template · coach marks trap focus · generic · fad · cheap · adds steps returning users skip.
- **X9** People lose their place in work they must finish · familiar from feeds · counts become unclear · keyboard users can't reach the footer · neutral · lasting in feeds only · medium · replaces "Show all N".
- **X10** Saves a PIN · few people know NFC punching · a 2026-05-19 review reports unstable punches (C §5) · needs a phone near a tag · neutral · uncertain · Web NFC works only in Android Chrome · changes the Clocker.
- **X11** Speeds nothing · seen in marketing sites · looks experimental · low contrast · erases teal · fad · costly to render · breaks the current look.

---

## 3. Top opportunities, prioritised

**How I ranked them.** I fixed the criteria before comparing. Thresholds: pass the scorecard (12+, no 0 on T, A, U) and keep every constant. Trade-offs, in this order: wins a Puerto Rico employer (C §7), protects one of the five traits (1.2), reaches employees on phones, unlocks later items, cost.

Priority sets the order of value. It doesn't block parallel work: items 6 to 12 are UI-only, so the UI Engineer can start them while items 1 to 5 wait for backend or legal approval.

### 3.1 The top five

| # | Opportunity | Problem | Who benefits | Platforms | Expected effect | Cost | Score | Dependencies | Approval needed | Users keep |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Full Puerto Rico Spanish (B5)** | Spanish reaches only the Clocker; `lang="en"` everywhere else (`src/app/layout.tsx:22`) | Employees first, then managers and Owners in Puerto Rico | All five. iOS and Android: follow the app's language setting; desktop, mobile web, PWA: a language choice in Profile, default from the browser | NEVORA's first market reads the whole product in its language; the trait in 1.2 becomes true; unlocks A2, A14, A18 copy | L | 15 | Backend phase B5; B2 vocabulary slots (`words.ts`); Spanish payroll and legal copy approved like the English | **Backend (B5) + legal copy** | English screens unchanged; the Clocker toggle stays; every route, label position and script-pinned English string stays |
| 2 | **Offline Clocker punches with two honest states (B6)** | No offline punch queue exists yet (C §8), and weak signal costs competitors trust (C theme 4) | Employees at the Clocker; managers reading timecards | Clocker in a browser on tablets and phones; employee Home shows the confirmed state only. Needs no store app. If the Clocker later runs inside the shell, App-Bound Domains apply (C §8) | Punches never lost to a dropped connection; "Saved on this tablet, sending" vs "Confirmed" with the receipt | M to L | 15 | Backend phase B6; idempotent `commandId` exists; privacy check on what the tablet stores | **Backend (B6)** | Same PIN, buttons, bilingual lines and receipt screens (U9) |
| 3 | **Passkeys and Face ID / fingerprint sign-in** | ID plus password on a phone; sign-in failures top competitor complaints (C theme 1) | Employees on personal phones; managers on laptops | iOS and Android: system passkey sheet; desktop: Touch ID, Windows Hello or phone QR; mobile web and PWA: same sheet, PWA asks once more because storage differs (T §3.1) | Faster sign-in; FIDO reports 93% success and 73% less time (T §3.1). Also helps the store app clear guideline 4.2 | M | 14 | Auth change: WebAuthn routes, a credential table (a new migration after 0032), recovery rules; sign-in pages move into the teal system (roadmap Phase 1 lists them; DESIGN.MD Batch 2 says auth keeps blue until reviewed) | **Backend (auth) + privacy (shared phones)** | Employee ID and password stay as the fallback; activation and forgot-access stay; the Clocker keeps its PIN |
| 4 | **Payroll-readiness check** | Problems surface after export; Gusto, Rippling and Paylocity check first (C §1) | Owners and payroll owners | Desktop first, inside the U6 stepper's Review step; phones get the same list stacked | Fewer corrections after pay; each flag links to its record (P2) | M | 15 | B4 Today and missed-punch data; a read-only route (no migration); meal checks wait for item 5 | **Backend (read route) + payroll copy approval** | The five-step stepper, exact revision and "Approval recorded" stay; "Approve revision" button name stays |
| 5 | **Puerto Rico rules pack (Ley 379)** | Rules are generic; NEVORA covers only the Puerto Rico time zone and Monday split (C §2), and no competitor checked ships Puerto Rico presets | Owners in Puerto Rico; employees through correct pay | Desktop: rule settings, warnings in grid and timecards, export line; phones: same warnings stacked | The main reason a Puerto Rico employer switches (C §9 note) | L | 14 | **Puerto Rico labour-counsel sign-off on every rule in C §7.1**; backend rule types; per-employee records (hired before 26 Jan 2017, stipulations) likely need a migration; B5 for Spanish warning text | **Legal first, then backend** | Existing rule settings and warnings keep their names and places; presets are opt-in per workspace |

Start counsel review for item 5 at Checkpoint 1. Build starts only after sign-off.

### 3.2 The parallel UI track and later items

| # | Opportunity | Problem | Who benefits | Platforms | Expected effect | Cost | Score | Dependencies | UI-only? | Users keep |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 | **Search on phones** (A8) | Phones give managers no search (live preview, 390) | Owners, managers | iOS and Android apps, mobile web, PWA: header search button opens the finder full screen, field above the keyboard at 17px; desktop: no change | Find a person in two taps | S | 15 | None | **Yes** | Four tabs plus More; "Search" also listed first in More |
| 7 | **My time receipts and change history** (A6) | Employees doubt their records (C theme 6) | Employees | All five, on My time | Employees check punches and edits themselves | M | 14 | Confirm which correction fields reach the employee; may need a read change | Probably UI, maybe a read route | My time layout and record details |
| 8 | **Phone foundations** (A9) | Fixed `px` type ignores text size; phone pages still use legacy buttons (`d12/phone-app-timecards.png`); teal selection on Schedule (`d6/owner-app-schedule-1920.png`) | Everyone on phones, low-vision users most | Phones and PWA; desktop unchanged at default size; the store app later maps the OS text size to the root size | Text grows with the phone setting; one button shape; unlocks dark mode | M | 14 | U10 baselines; page-by-page legacy retirement | **Yes** | Zero visual change at default size, checked against the U10 snapshot |
| 9 | **Notifications done right** (A7) | No prompt in context, no badge, no per-category control found in Profile or device setup | Employees, managers | iOS and Android apps: native prompt and badge; PWA: web push and badge after install; mobile web tab: show install path; desktop: browser prompt after a click | People turn alerts on when they see the value and keep them on | M | 14 | Prompt and badge are UI; per-category controls need stored preferences; native push needs an APNs/FCM sender | Split: prompt UI-only; controls and sender need backend | Existing push keeps working |
| 10 | **Owner setup progress card** (A10) | Setup items mixed into Home Tasks (`d3/home-1440.png`) | New Owners | Desktop above Tasks; phones above the Today strip | Setup finishes without a tour | S | 15 | Existing configuration checks | **Yes** | Each step links to the same page; the card disappears when done |
| 11 | **Back closes sheets** (A17) | Unverified on devices (T §4) | Phone users | iOS standalone PWA, Android Chrome, later the shell | No accidental page exits | S | 15 | A physical iPhone and Android phone | **Yes** | Same sheets |
| 12 | **Small fixes from my review** | Pass order, audit sentence, stale preview (section 1.3) | Employees; reviewers | Employee Home all widths; `/ui-preview/home` | Today's shift leads; reviewers see the real sidebar | S | n/a (fixes) | None | **Yes** | Script-pinned strings in DESIGN.MD U2 stay |
| 13 | **Android icon shortcuts** (A13) | No shortcuts | Android employees | Android PWA and app | Two taps saved | S | 13 | None | **Yes** | Nothing moves |
| Later | A3b own week offline (after B6, privacy); A14 finder questions (after A8, B5); A18 Spanish policy sign-off (after B5, legal); A11 store build, A12, A15, A19 (after the spike); A16 dark mode (after A9) | | | | | | | | | |

---

## 4. What stays fixed, and why

**Constants (TEAM-RULES).** The NEVORA wordmark. Teal as the action colour and the grey, amber, green, coral ladder. Inter and Phosphor. 44px targets, WCAG 2.2 AA, visible focus, reduced motion. B1 contrast floors for company branding (`derive.ts`). Payroll and legal copy as approved. Navigation structure and key action names.

**Also protected, with the reason:**

| Protected | Why |
|---|---|
| Four phone tabs plus More per role (U1); the 10-entry desktop sidebar (D3) | Muscle memory. Gusto, When I Work and Rippling lost users with September 2026 redesigns (C §6 theme 2). New entries go in headers or More, never a fifth tab |
| The ⌘K finder and its rule that an empty query never lists the team (U8) | Privacy and speed |
| The next-shift pass as the single brand moment on employee Home (U2) | The clearest NEVORA trait on a phone; any gradient elsewhere stays banned (X11) |
| Pending labels until the server confirms; no optimistic approvals or pay (Phase 4) | Trust in authority-checked actions (P2, P4) |
| Half-row swipe threshold with visible buttons; no swipe on pay (U4) | Prevents accidental approvals (X7) |
| The celebration gate (U7) | Delight stays rare and never touches money |
| Factual attendance words; "no-show" and "absent" banned (B4) | Calm, non-accusing tone |
| "Unavailable", never zero or empty, on failed reads (B4, U8, error pass) | P2 |
| Clocker PIN, English labels with the Spanish second line, per-tablet toggle (U9) | Shared tablets must not hold personal passkeys; scripts press the English names. B5 may change which line leads, with a spec |
| Place-name time zones (D5, D6) | Puerto Rico trait |
| Script-pinned strings listed in DESIGN.MD U2 and U5 | QA scripts depend on them |
| Payroll revisions visible (U5, error pass) | Each approval belongs to one exact revision |
| Today's frosted bars at 92% white with solid fallbacks (U1, Phase 3) | Verified contrast; no further glass (X3) |
| Web app and PWA stay supported after store apps ship | Older phones locked out by iOS 17+ apps is an advantage for NEVORA (C §6 theme 9) |

**Continuity rule for every spec this cycle.** Each spec states what existing users keep and where a moved item lives now, and keeps the old path working for at least one release (P5).

---

## 5. Open decisions for Jose at Checkpoint 1

| # | Decision | My recommendation |
|---|---|---|
| 1 | **Priority order** | Approve section 3 as ranked: B5 Spanish, B6 offline Clocker, passkeys, payroll-readiness check, Puerto Rico rules pack. Let the UI Engineer run items 6, 8, 10, 11, 12 and 13 in parallel, since they need no backend change |
| 2 | **App-store route** | Approve **Capacitor loading the live Next.js app** for iOS and Android (C §8: the only route that passes all three thresholds and keeps one UI). Approve **only the two-week spike** now, on fictional data with a fictional review workspace: (a) passkeys in WKWebView with associated domains, (b) App-Bound Domains with the service worker, (c) one Live Activity, (d) a TestFlight submission. Add three checks: OS text size reaching the web view (needs item 8), Back closing sheets in both web views, and Apple's 5.1.1 account-deletion answer for employer-created accounts. Decide the build after the spike. Reject Expo / React Native (two UIs). Keep a Trusted Web Activity in reserve only if a Play listing is needed before the spike ends |
| 3 | **Separate backend approvals** | Each needs its own go-ahead: B5 Spanish; B6 offline punches; the auth change for passkeys (new table and migration); the read route for the payroll-readiness check (no migration); stored notification preferences; an APNs/FCM push sender (needed only once store apps exist) |
| 4 | **Legal review** | Engage Puerto Rico labour counsel now on every rule in C §7.1, plus the rest-day law and items C §10 lists as unchecked. Decide who approves Spanish versions of payroll and legal copy, since that copy is locked as approved in English. Policy sign-off text (A18) needs the same approval |
| 5 | **Privacy review** | Approve or reject, one by one: the employee's week stored on the device (A3b); what the Clocker tablet stores while offline (B6); passkey offers on shared family phones (A4); lock-screen content for any Live Activity (start time and location only); Apple 5.1.1 account deletion |
| 6 | **Phone clock-in** | Keep punches on the Clocker only for now. That parks geofencing (A20). Revisit if Owners ask for field or remote crews |
| 7 | **Migrations 0031 and 0032** | Confirm they apply to every existing database before any release, including the first TestFlight or Play build that points at a real workspace (roadmap "Next") |
| 8 | **Dark mode** | Keep it on the roadmap, after phone foundations retire legacy CSS. No in-app switch (A16) |

---

## Not verified

- I didn't sign in to the full portal; pages other than Home come from `.claude/evidence/` screenshots.
- Whether correction history reaches the employee's My time response (A6) and whether per-category notification settings exist outside Profile and device setup (A7): I searched only `src/app/app/profile` and `src/components/portal-device-setup.tsx`.
- No physical iPhone or Android phone, no VoiceOver run, no INP numbers (T §7).
- Build sizes (S, M, L) are my estimates; the UI Engineer should confirm before Checkpoint 2.

---

## Checkpoint 1 decision (Jose, 2026-10-17)

- **Approved as recommended:** the priority order in section 3.1.
- **Approved:** the app-store route, **Capacitor loading the live Next.js app**,
  but **only the two-week spike** for now, on fictional data. The build decision
  comes after the spike. Anything that needs Jose's own accounts (an Apple
  Developer or Google Play account, a TestFlight or Play submission) waits for
  him to do it or to authorise it explicitly.
- **Approved to start:** the no-backend UI track, items 6 (phone search),
  8 (phone foundations), 10 (Owner setup card), 11 (Back closes sheets),
  12 (small fixes) and 13 (Android shortcuts). Item 11 needs Jose's physical
  phones for its final check.
- **Not yet approved; each needs its own go-ahead:**
  - backend phases: B5 Spanish, B6 offline Clocker, the passkey auth change,
    the payroll-readiness read route, stored notification preferences, and a
    push sender;
  - legal: Puerto Rico labour counsel, and who approves Spanish payroll and
    legal copy;
  - privacy items (section 5, decision 5).
