# AI manager: Owner chat on phone and desktop

Design proposal for Jose's approval. Nothing is built. Board: `mockup.html` / `mockup.png` in this folder.
Contract: `origin/development` f4739751 (contains AI-owner 1e0cf1bf), read with `git show`, unchanged.
Fictional data: Isla Verde Cafés, Carmen Ortiz (Owner), Old San Juan and Condado, Sunday Nov 1 2026.

---

## 1. What the backend supports today

Sources: `docs/execution/owner-ai-intelligence-2026-10-30/CLAUDE-INTERFACE.md` (contract), `src/lib/owner-advisor/contracts.ts`,
`service.server.ts`, `store.server.ts`, `loop.server.ts`, `config.server.ts`, `coverage-actions.ts`, `src/app/api/owner/advisor/route.ts`,
`src/app/app/ai-manager/page.tsx`, `src/components/owner-advisor/*`, migrations 0036, 0044, 0045.

| Question | Answer |
|---|---|
| Streaming? | **No.** One JSON POST per question, no SSE. Up to 60 s (route deadline; 20 s per provider call). No progress events, percentages or typing events exist. The contract forbids inventing them. |
| Conversation history? | **Yes, short and text only.** `profile.history` holds the last 12 messages (6 questions and answers), as `{role, content}`. No timestamps and no sources in history. History is per Owner (`owner_id`), private to that Owner. The model sees the same 12 messages. |
| The latest answer | `answer.text` (plain text, ≤12,000 chars), `answer.sources[]` (`label`, server-owned internal `href`, `observedAt`), and optional `coveragePlans`, `proposals`, `periodReview`, and `context` (saved-notebook revision). Only the latest answer carries these; it lives in browser memory only. |
| Re-reading an older answer with its sources | Only by replaying the exact same `requestId` and message: the 6 latest completed asks keep their result server-side and replay without a new model call or charge. The UI would have to remember request IDs in memory. |
| Which actions can the AI propose? | The model has read-only tools: `company_briefing`, `published_staffing`, `coverage_investigation`, `coverage_proposals`, `coverage_plan`, `attendance_payroll_review`. It can attach (a) **day plans** (`coveragePlans`: jointly checked hypothetical allocations), (b) **coverage proposals** (single replacements, each with a `review` token for `/app/schedule/new?review=…`), (c) a **period review** (timecard and payroll exceptions; payroll readiness always "unverified"). It cannot publish, message, change time or pay, save goals or run in the background. |
| Does the Owner confirm? | **Yes, always, and only through explicit commands the model can never call** (`parseCoverageAction` is "never registered as a model tool"). Day plan → `prepare_coverage_draft` (a server review with its own expiry time) → Owner ticks a checkbox → `apply_coverage_draft` with `acknowledged: true` saves **draft** assignments only. No publishing, no notifications. `check_coverage_draft` reports progress. Proposals hand off to Scheduling's own review page. |
| Other commands | `inspect` (runs `coverage_proposals`, `coverage_plan` or `attendance_payroll_review` **without the model**), `review_briefing` (track, defer 1 hour, dismiss an attention item), `notebook` (goals ≤8, tasks ≤12), `ask_task` (ask in the context of a saved task), `save_priorities` (≤2,000 chars). |
| No provider configured | Page needs `NEVORA_OWNER_ADVISOR_ENABLED=true` and an Owner with company scope, otherwise 404. With no provider/model/key/cap, GET returns `connection: "unavailable"`; `ask` returns `unavailable`. `inspect`, briefing, notebook and priorities still work. **Nothing is billed.** That is the dev preview's state. |
| Limits | Question ≤2,000 chars. Daily cap 1–100 asks per company, reset at UTC midnight (8:00 PM in Puerto Rico). One question at a time per company (`busy`). The cap and remaining count are not sent to the browser. |
| Errors | `disabled` 404, `forbidden` 401/403, `invalid` 400, `conflict` / `busy` / `prior_attempt_failed` 409, `daily_limit` 429, `cancelled` / `limit` / `provider_failed` / `unavailable` 503. |
| Freshness and privacy lifecycle | Every response carries `authority`, `observedAt`, `validForMs` ≤15,000. The controller refreshes at 60% of the window and **clears all private content** on expiry, window blur, tab hidden, pagehide, offline, sign-out (`nevora:signout`) and access change (`lifecycle.ts`, `controller.ts retire()`). The typed question is cleared too. The contract says a redesign must keep these controls. |
| Uncertain results | Keep the original request ID and payload; never silently retry under a new billable ID. Failed or expired IDs can't be rerun. |

### Needs Codex (gaps; the UI does not invent them)

| # | Gap | Why the chat needs it | Without it |
|---|---|---|---|
| C1 | Sources and attachments for earlier answers (history entries with `sources` and `observedAt`, or the latest completed answer in GET) | After any pause (even a window blur) the latest answer comes back as plain text with no source links. | Fallback inside the contract: keep `{requestId, message}` of this tab's asks in memory and replay the newest one after a pause (no charge). Older answers stay plain text, labelled "Earlier". |
| C2 | A time on each history message | To show "Yesterday, 4:10 PM" on earlier answers, and to label stale answers. | Earlier answers show no time. |
| C3 | A "start a new conversation" command | Owners will want a clean slate; history keeps 12 messages forever. | No "New conversation" item in the menu. |
| C4 | Questions left today (and the cap) in the GET snapshot | To show "3 questions left today" before the limit hits, not after. | Only the `daily_limit` error tells the Owner. |
| C5 | Ruling: may the Owner's unsent typed question survive a pause in memory? | A window blur on desktop wipes a half-typed question. That text is the Owner's own words, not company data. | The question is cleared, as today. |
| C6 | Ruling on load: GET (briefing + attention + notebook queries) runs about every 9 s while the chat is open. | The desktop panel can stay open across pages. | The panel polls only while open and visible; it stops when closed. |
| C7 | Provider and retention statement for "What AI manager can see" (with Jose). | Owners will ask where questions go. | Copy says only "the AI service your company set up". |
| C8 | Only if Jose picks option B in §3.3: a Schedule entry point that accepts a prepared coverage review | To confirm drafts on the Schedule page itself. | Drafts are saved from the Review draft sheet (option A). |
| C9 | The current pay period's dates | So "What blocks payroll this week?" can check the real period. | The starter checks the last 7 days and says so. |

UI-M1 (observation clock and time-zone labels) stays open from Codex's validation; this design shows company-time with the zone label when the device zone differs (§6).

---

## 2. Placement

### Decision

- **Phone:** a **top-bar icon** (Phosphor `ChatCircleText`, regular, 22px, accessible name "AI manager"), left of the bell, on the five tab pages. It opens `/app/ai-manager` as a **pushed full page** with "‹ Home" (or the tab it came from). **More › AI manager stays** (continuity).
- **Desktop and tablet:** a **top-bar button** "AI manager" left of Search ⌘K opens a **420px right-hand panel** available on every page. At **≥1440px** it docks beside the page (the page keeps 788px, the width pages already handle at a 1024px laptop); from **768 to 1439px** it overlays as the kit's right sheet with the kit backdrop. The sidebar's **More › AI manager** opens the same chat as a full page, which also holds Briefing, Goals and tasks, Priorities and Records checks.
- **⌘K finder (phase 2):** when the Owner types a query, one extra row "Ask AI manager: ‘…’" opens the panel with the text in the box, not sent.

### Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Sixth phone tab | Rejected | Owner tabs are fixed at five (Home, Schedule, Time, Payroll, Team) by the approved boards; >5 breaks the bottom-nav limit and muscle memory. |
| Replace a tab | Rejected | Every tab is a daily job; the AI is an assistant to them, not a section. |
| Floating action button | Rejected | Collides with the tab bar and Find cover; Jose's rules put icons only in the top bar and tab bar; FABs read "consumer". |
| Home card / sheet from Home | Rejected | Home is at its 3-card limit; the chat needs the full height and the keyboard. |
| More entry only (today) | Kept, not enough | Two taps deep from every page; the question usually starts on Schedule, Time or Payroll. |
| Phone bottom sheet | Rejected | Long answers, the keyboard and a nested Review draft sheet fight a sheet; a pushed page gives back-swipe and a deep link. |
| Desktop full page only | Rejected as primary | Opening a source would leave the chat. The panel keeps the conversation beside the page it cites (Linear Asks, Causal Copilot). |
| Desktop: ⌘K only | Rejected as primary | The finder is for going places; answers need room. Kept as a shortcut into the panel. |

Migration note (TEAM-RULES "navigation structure stays"): the route, the name "AI manager" and More › AI manager are unchanged; the top bar gains one entry point. More's row icon changes from `Sparkle` to `ChatCircleText` so the product uses one symbol.

---

## 3. Flows

### 3.1 Ask

1. Owner taps the top-bar icon (phone) or "AI manager" (desktop). The chat loads (GET); a skeleton shows if it takes >300 ms.
2. Empty: three starters fill the box ("Who can cover Saturday at Condado?", "What blocks payroll this week?", "Who's late today?"). A tap **fills and focuses the box; it does not send**. Every ask spends one of today's capped questions, and the Owner may want another day or location.
3. Send → the question appears at once as a bubble; the box clears; Send becomes Stop; "Working on your answer" (§5).
4. Answer → plain text, then **Sources** (server rows), then at most one attachment card (Draft plan, Cover options, or Period exceptions). Focus stays in the box; a polite announcement says "Answer ready. 2 sources. A draft plan is attached."

### 3.2 Sources

Each `answer.sources[]` item is one row: title = server `label` ("Schedule coverage and eligibility"), detail = page name from the href path ("Schedule", "Timecards", "Payroll", "Home") + "Checked 2:14 PM" or the range it covers. Tapping opens the href in the app (phone: the chat stays in history, Back returns to it; desktop ≥1440: the page changes beside the open panel). Only server-owned internal hrefs are rendered (`public-response.ts` already validates them). Model text is never turned into links, buttons or HTML.

### 3.3 A proposed action (coverage draft)

The AI never saves. A `coveragePlans` attachment shows as a **Draft plan** card (date, people, times, "Not saved") with one secondary button **Review draft**. Only plans whose assignments are all drafts get the button (same rule as `coverage-plans.tsx`); others say "This plan includes a published schedule. Review it in Schedule." with a link.

- **Option A (recommended, works today):** Review draft opens the **Review draft sheet** (phone bottom sheet; desktop: a pushed view inside the panel). It calls `prepare_coverage_draft`, then shows the exact shifts, what stays the same, the checkbox "I reviewed this exact shift and want to save it as a draft.", and the one teal button "Save 1 draft shift" (`apply_coverage_draft`). Saved shifts are drafts: nothing is published, no one is notified. Publishing happens only in Schedule, through its normal Publish changes flow.
- **Option B (needs Codex C8):** Review draft opens Schedule with the plan preloaded and the Owner saves there.

Single-replacement **proposals** already hand off: their row button "Review in Schedule" opens `/app/schedule/new?review=…`, Scheduling's own review page.

**Period review** (payroll, timecards): an "Exceptions · Oct 26 – Nov 1" card with up to 5 rows (person, issue) and "See all in Timecards". The existing payroll wording stays exactly as approved ("Payroll readiness is unverified…", Spanish included); it is shown as the card's note.

### 3.4 Saved goals and tasks (`ask_task`)

Goals and tasks lives under the menu. Each open task has "Ask about this", which returns to the chat with a context row above the box: "About: Cover Saturday opener" with "Clear". Send uses `ask_task` with the notebook revision. A `conflict` shows "Your saved goals or tasks changed" (§5).

### 3.5 Records checks (no AI)

Menu › Records checks (and the AI-off screen) run `inspect`: "Cover options for Saturday" (`coverage_proposals`, next Saturday in company time), "Compare plans for tomorrow" (`coverage_plan`), "Time and payroll exceptions" (`attendance_payroll_review`, last 7 days, in the Owner's language). Results appear in the conversation labelled **"Records check"**, never "AI manager". They use no model and cost nothing.

---

## 4. Screens

### Phone (390; also 320 and landscape)

| Area | Spec |
|---|---|
| Top bar (tab pages) | Kit header: lockup left; right `ChatCircleText` 44×44 (22px glyph, ink `#1A1C1E`), bell, avatar. 0 between icons (44px hit areas abut). |
| Chat page header | `CorpNav`: "‹ Home" (teal 15/500), title "AI manager" 17/600, right `CorpMenuButton` "…" (44, ink2), menu: Briefing · Goals and tasks · Your priorities · Records checks · What AI manager can see. |
| Tab bar | **Hidden on the chat page** (decision D3). Back link and edge swipe return. |
| Transcript | Column, 16px side padding, 12px between items, bottom-anchored, scrolls; `--c-bg` canvas. |
| Owner bubble | Right-aligned, max 296px (phone) / 320px (panel), white, radius 12, `--c-shadow-card`, padding 10/14, 15/20 ink. |
| Answer meta | 13/18 grey: "AI manager · Checked 2:14 PM"; "Records check · Checked 2:14 PM"; "From earlier" when the newest source is >10 min old (a replay is historical). |
| Answer text | No container, 15/22 ink, paragraphs 10px apart; lines starting "- ", "• " or "1." render as a list (4px dot, 16px indent). Text nodes only. Over 16 lines (phone) / 20 (panel): clamp with a fade and "Show full answer" (button, `aria-expanded`). |
| Sources card | `CorpCard` label "Sources" (13/500 grey head, 44px), `CorpRow` 56px rows with chevron. |
| Draft plan card | `CorpCard` label "Draft plan · Sat, Nov 7", aside "Not saved"; rows with `CorpAvatar` (32, neutral), name 15/500, "7:00 AM–3:00 PM · Condado · Barista"; footer `CorpButton kind="secondary"` full width "Review draft". |
| Composer | White bar, `0 -1px 0 #E3E5E6`, padding 8/16 + `max(12px, env(safe-area-inset-bottom))`. Field 48px min, grows to 5 lines (max 132px) then scrolls; radius 8; ring `#D5D8DA`; focus ring 2px teal; 16px text (no iOS zoom); placeholder `#6B7075` "Ask a question" / "Ask a follow-up". Send 40×40 inside the field (4px inset, 44px hit), radius 6, teal with white `ArrowUp`, grey `#EDEEEF` / `#A7ACB1` when empty. While waiting: white Stop (`Stop` glyph, ring). Counter appears only from 1,800 chars: "1,850 of 2,000". Note under it, 13px grey centred: "Answers can be wrong. Check the sources." |
| Review draft sheet | Kit sheet (QuietSheet + `.c-sheet`): grabber, "Cancel · Review draft". Cards: "Adds 1 shift · Sat, Nov 7" (rows); facts card (52px one-line rows with soft values: Existing shifts / Stay as they are, Saturday's needs / Met or "2 gaps remain", Employees / Not notified); consent card (22px teal checkbox + label); full-width primary "Save 1 draft shift" (disabled until ticked); 13px centred note "Your rules are checked again when you save. Publish from Schedule. This review expires at 2:29 PM." |

### Desktop and tablet

| Area | Spec |
|---|---|
| Top bar trigger | 32px utility like Search: `ChatCircleText` 18px + "AI manager" 15px, ring `#D5D8DA`, radius 8. While the panel is open: tint `#E6F1EF`, teal text, `aria-expanded="true"`. Hidden on `/app/ai-manager`. |
| Panel | 420px, below the 52px top bar, `--c-bg`, left hairline `#E3E5E6`. Header 56px white: "AI manager" 17/600 at 20px; right "…" menu and Close (`X`), each 40px visual in a 44px hit area. Content padding 16/20. Composer padding 12/20; field 48px; note "Enter sends · Shift+Enter adds a line · Answers can be wrong". |
| Docking | ≥1440: main area right edge moves in by 420px (no backdrop, non-modal, `aside` landmark "AI manager"). 768–1439: overlay right sheet with backdrop `rgb(16 24 32 / .24)`, modal, focus-trapped; a source tap closes it and navigates; reopening shows the same conversation. |
| Full page `/app/ai-manager` | Same chat in a 720px column (`c-page--narrow`), title row "AI manager" with the "…" menu; Briefing, Goals and tasks, Priorities, Records checks are sub-pages under the same guards. |

### PWA standalone and iOS/Android

Safe areas on the header (`--q-safe-top`) and composer bottom. Keyboard: the composer rides the keyboard (layout `100dvh` column; on iOS use `visualViewport` height). Back gesture returns from the pushed page; the Review draft sheet closes with drag-down or Cancel (drag has the Cancel button as its alternative).

---

## 5. Every state, with exact copy

Copy is English; Spanish strings go through the app's words system at build (Jose's es review). Error states use `CorpErrorCard` under the question they belong to; full-screen states use `CorpEmpty`.

| State | Trigger | What shows | Copy |
|---|---|---|---|
| Loading | first GET, or reload after a pause | Kit skeleton (3 grey bars), composer disabled | (no text; SR status "Loading AI manager") |
| Empty, ready | `connection: available`, no history | Heading, intro, "Try asking" card (3 rows with details), note, link | "Ask about Isla Verde Cafés" · "Schedules, time and payroll. Every answer links to the records it used." · rows: "Who can cover Saturday at Condado?" / "Checks availability, hours and your rules"; "What blocks payroll this week?" / "Checks timecards and payroll for Oct 26 – Nov 1"; "Who's late today?" / "Checks today's shifts and clock-ins" · "Tap a question to put it in the box. Nothing is sent until you tap Send." · "What AI manager can see" |
| With history | history present | Divider label "Earlier", plain-text history, then the box | "Earlier" |
| Working, 0–20 s | POST in flight | Bubble, 3 bars (pulse), Stop | "Working on your answer" |
| Working, ≥20 s | elapsed time only | Same | "Still working. Answers that check several records can take up to a minute." |
| Answer | `answered` | Meta, text, Sources, attachment | meta "AI manager · Checked 2:14 PM"; no sources: note "This answer doesn't cite any records. Check before you act." |
| Long answer | >16/20 lines | Clamp + button | "Show full answer" / "Show less" |
| Saved context changed after answer | `context.notebookRevision` ≠ current | 13px note above the answer | "Your goals or tasks changed after this answer. Ask again before deciding." |
| Stopped (Owner tapped Stop) or timed out (`cancelled`) | | Error card | "Stopped waiting" · "The answer may still finish. Check again in a moment before asking again." · [Check again] |
| `provider_failed` | | Error card | "The AI couldn't answer" · "Nothing was changed. Try again, or ask about one location or fewer days." · [Try again] (new request ID, same words) |
| `limit` | | Error card | "This question needs too many checks" · "Ask about one day, one location or a shorter period." · [Edit question] (puts the words back in the box) |
| `busy` | | Error card | "Another question is still running" · "Only one question runs at a time for your company. Wait a moment, then check again." · [Check again] |
| `daily_limit` | | Error card | "You've reached today's question limit" · "You can ask again after 8:00 PM. Records checks in the menu still work." (time = next UTC midnight in company time) |
| `prior_attempt_failed` | | Error card | "That question didn't finish" · "Ask it again as a new question." · [Ask again] |
| Uncertain (network drop mid-request) | | Error card | "We couldn't confirm the answer" · "Your connection dropped. Check again to see if it finished." · [Check again] |
| `invalid` | | Error card | "Check your question" · "Questions can be up to 2,000 characters." |
| `conflict` on `ask_task` | | Error card | "Your saved goals or tasks changed" · "Your question is still in the box. Check the current tasks, then ask again." · [Open goals and tasks] |
| AI not set up | `connection: unavailable` | Heading, intro, Checks card, note; **no composer** | "AI answers aren't on yet" · "You can still run these checks. They read your records directly and don't use AI." · rows "Cover options for Saturday" / "Sat, Nov 7 · both locations"; "Compare plans for tomorrow" / "Mon, Nov 2 · both locations"; "Time and payroll exceptions" / "Last 7 days · Oct 26 – Nov 1" · "To turn on AI answers, contact NEVORA support." (Jose to confirm who turns it on) |
| Turned off | 404 / `disabled` | Trigger hidden; if it happens mid-session, full-screen | "AI manager is turned off" · "Contact NEVORA support to turn it back on." |
| Offline | `offline` event | Full-screen card, composer disabled ("Offline") | "You're offline" · "AI manager needs a connection. Your conversation comes back when you reconnect." |
| Paused | blur / hidden / pagehide | Content cleared (contract); on return a skeleton, reload is automatic | Only if reload takes >1 s: "Loading your conversation again" |
| Access changed | authority changed | Full-screen card | "Your access changed" · "Refresh to continue." · [Refresh] |
| Access ended | 401/403 | Full-screen card | "Your Owner access ended" · "Sign in again to continue." · [Sign in] |
| Draft: preparing | `prepare_coverage_draft` busy | Sheet skeleton | (SR "Preparing the review") |
| Draft: review | `coverage_review` | Sheet as in §4 | button "Save 1 draft shift" / "Save 3 draft shifts"; while saving "Saving…" |
| Draft: saved | `coverage_saved` | Sheet result | "Saved as a draft" · "1 shift saved at 2:16 PM. Nothing was published and no one was notified." · rows "In the schedule 1 of 1", "Published 0 of 1" · [Open schedule] (primary) [Check progress] (secondary) |
| Draft: changed / expired (409) | | Sheet result | "This review changed or expired" · "Nothing was saved. Ask again for current plans." · [Close] |
| Draft: uncertain | network | Sheet result | "We couldn't confirm the save" · "It may already be saved. Check the original request before doing anything else." · [Check original request] |
| Draft: expired before save | client clock | Sheet result | "This review expired" · "Ask again for current plans." |
| Draft: paused | lifecycle | Sheet content hidden | "Draft details are hidden until your access refreshes." |

**Privacy sheet "What AI manager can see"** (kit sheet; desktop: pushed view in the panel):
- "It reads: today's shifts and clock-ins; published and draft schedules, availability and your scheduling rules; scheduled and target hours; timecard and payroll exceptions for the period you ask about; your saved priorities, goals and tasks; your last 6 questions and answers."
- "It can't: publish schedules, message employees, change time records or pay, or calculate pay. It can prepare draft shifts that you review and save yourself."
- "Only you see your questions. Your question and the records needed to answer it are sent to the AI service your company set up." (C7 adds retention.)

---

## 6. Components, mapped to the corp kit

| Piece | Built from | New or existing |
|---|---|---|
| Phone chat header | `CorpNav` + `CorpMenuButton` | existing |
| Starters, sources, checks, facts | `CorpCard`, `CorpRows`, `CorpRow` (`one` for 52px) | existing |
| Draft plan card | `CorpCard` + `CorpRow` + `CorpAvatar` + `CorpButton` secondary in `.c-card__foot` | existing |
| Error card | `CorpErrorCard` (live) | existing |
| Offline, access, turned off | `CorpEmpty` in a card | existing |
| Skeleton | `.c-skel__bar` (bars `#E3E5E6` on the grey canvas) | existing tokens |
| Review draft, privacy sheet | QuietSheet + `.c-sheet` / `.c-sheet__nav` | existing |
| Owner bubble | `.c-chat-q` | new (card radius and shadow tokens) |
| Answer text renderer | `AiAnswerText` (text → paragraphs/lists, text nodes only) | new |
| Composer | `.c-chat-composer`, field on `.c-in` tokens, send inside the field | new |
| Desktop panel | `.c-chat-panel` aside; overlay mode reuses the kit's 420px `dialog.q-sheet` rules | new + existing |
| Top-bar triggers | phone `.c-top` icon slot; desktop utility like `.command-finder-trigger` | new |
| Times | `CorpTime`, `corp-format.ts`; company zone, zone label ("AST") when the device differs | existing |

Icons (Phosphor regular, one weight): `ChatCircleText`, `ArrowUp`, `Stop`, `DotsThree`, `X`, `CaretLeft`, `CaretRight`, `Check`. No `Sparkle`, no gradient, no colour tiles.

### Tokens and measurements

Page `#F5F6F6` · card `#FFFFFF`, radius 12, `--c-shadow-card` · ink `#1A1C1E` / `#4A4F54` · grey `#6B7075` · faint `#A7ACB1` · field ring `#D5D8DA` · teal `#0B6E69` (Send, Save, the one primary per screen; links) · tint `#E6F1EF` (panel trigger while open) · red `#B42318` only as the kit error colour, not used in these states.
Type: 24/30 (page title) · 20/26 600 (chat heading) · 17/22 600 (nav, panel) · 15/20 (rows, bubble) · 15/22 (answer text) · 13/18 (details, notes) · 11 (tab labels). Inter, tabular numbers.
Sizes: rows 56 / 52 · card head 44 · field 48 · buttons 44 phone, 40 in a 44 hit area at ≥768 · send 40 in 44 · icon buttons 44 · panel 420, header 56 · gaps 12 within a group, 16 page padding phone, 20 panel padding · bubble max 296/320.
Motion (kit): press 120 ms; panel and sheet 360 ms in / 240 ms out, `cubic-bezier(.32,.72,0,1)`; bars pulse opacity .6↔1 over 1.6 s; new messages fade/slide 8px over 200 ms.

---

## 7. Accessibility and motion

- **Landmarks:** phone page `main` "AI manager"; desktop panel `aside` "AI manager". Transcript is a list of `article`s; each answer has an sr-only heading "Answer to: {question}".
- **Announcements:** one polite `role="status"` region, short phrases only: "Working on your answer", "Answer ready. 2 sources. A draft plan is attached.", "Records check ready". Errors use `CorpErrorCard` (alert). The transcript itself is not a live region, so 12,000-character answers are never read out unasked.
- **Focus:** opening the chat focuses the box. After an answer, focus stays in the box. Esc closes the desktop panel and returns focus to the trigger; the overlay mode traps focus. Review draft moves focus to the sheet title; closing returns it to "Review draft". After saving, focus goes to "Saved as a draft".
- **Keyboard (desktop):** Tab order: panel header (menu, close) → transcript links and buttons → box → Send. Enter sends, Shift+Enter adds a line, no send while an IME is composing. Stop is reachable by Tab and Esc does not stop a request (Esc only closes).
- **Names:** top-bar icon "AI manager"; Send "Send question"; Stop "Stop waiting"; menu "More AI manager options"; source rows "Open Schedule: Schedule coverage and eligibility, checked 2:14 PM".
- **Targets:** every control ≥44×44.
- **Contrast:** body ink on `#F5F6F6` and white passes AA; grey `#6B7075` passes AA for 13px text; placeholders use `#6B7075`.
- **Gestures:** sheet drag-down has Cancel; back-swipe has "‹ Home".
- **Reduced motion:** no bar pulse (static bars), no slide on new messages, panel and sheets fade (160 ms in, 120 ms out, kit rule), no smooth scroll.
- **200% zoom:** desktop at 200% falls under 768 CSS px and uses the phone layout; the composer stays visible; nothing scrolls sideways.
- **Language:** a Spanish period review keeps `lang="es"` on its card.

---

## 8. Decisions log

| # | Conflict | Decision | Why |
|---|---|---|---|
| D1 | Placement on phone: discoverable vs. Jose's calm header and five tabs | Top-bar icon + keep More | Icons belong in the top bar (rule 1); one tap from any tab page; tabs untouched. |
| D2 | Icon: `Sparkle` (the common AI sign, already on More) vs. `ChatCircleText` | `ChatCircleText` everywhere | The brief and Jose's rules discourage sparkles; a chat glyph says "ask" and NEVORA has no Owner messaging icon it could be confused with. |
| D3 | Kit rule "pushed pages keep their tab bar" vs. a composer that must sit on the keyboard | Hide the tab bar on the chat page | Two bottom bars plus a keyboard leave ~300px for answers; ChatGPT, Claude and Copilot all hide it. |
| D4 | Starter tap: send at once (convention) vs. fill the box | Fill the box | Each ask spends a capped question; "Saturday" and "Condado" are often wrong; a 13px note explains it. |
| D5 | Where the Owner confirms a draft | Review draft sheet (option A), publish only in Schedule; option B needs Codex | The contract's explicit apply command, checkbox and expiry already exist; the AI never saves; publishing and notifications stay in Schedule. Jose decides. |
| D6 | Answer in a card vs. plain on the canvas | Plain text; cards only for sources and the action | Keeps ≤2 cards per answer and makes the action the only boxed thing to act on. |
| D7 | "Thinking" animation vs. contract (no invented progress) | Static bars + time-based words, no dots, no steps | Honest: the wording changes by elapsed time, never by fake events. |
| D8 | Desktop: dock vs. overlay | Dock ≥1440, overlay below | Docked, a source opens beside the chat; 788px is a width every page already handles. |
| D9 | AI off: hide the feature vs. show checks | Show the no-AI records checks; no box | Useful in the dev preview and before setup, with nothing billed and nothing pretending to be AI. |
| D10 | Attention briefing, notebook, priorities on the chat screen (today's page) vs. "don't overwhelm" | Move them to sub-pages from the menu | One job per screen: the chat. |

---

## 9. Build plan (Claude, on `development`)

Files (all UI; no route, service, migration or contract change):

| File | Change |
|---|---|
| `src/components/owner-advisor/ai-manager-provider.tsx` (new) | Client provider in the app shell (Owner, flag on). Owns one `createAdvisorController` and one `createCoverageActionController`; starts `bindAdvisorLifecycle` only while the chat is open (page or panel) and stops it on close. Holds the pending bubble text and, for C1's fallback, this tab's `{requestId, message}` list in memory. |
| `src/components/owner-advisor/chat/ai-chat.tsx`, `ai-chat-composer.tsx`, `ai-answer-text.tsx`, `ai-chat-states.tsx`, `ai-draft-review.tsx`, `ai-privacy-sheet.tsx`, `ai-chat.css` (new) | The shared conversation, used by the page and the panel. `ai-draft-review` restyles `CoverageActionPanel`'s logic on the kit. History dedupe: when the latest `answer.text` equals the last assistant history message, hide that pair from "Earlier". |
| `src/components/owner-advisor/ai-manager-panel.tsx` (new) | Desktop dock/overlay. |
| `src/app/app/ai-manager/page.tsx` | Same guards; renders the chat. Sub-pages `briefing/`, `goals/`, `priorities/`, `checks/` with the same guards, reusing `AttentionSection`, `NotebookPanel` and the priorities form restyled on the kit. |
| `src/components/app-shell.tsx`, `src/app/app/corp-shell.css` | Phone top-bar icon and desktop trigger (Owner + flag); mount provider and panel. |
| `src/app/app/more/page.tsx` | Row icon `Sparkle` → `ChatCircleText`. |
| `src/components/command-finder.tsx` (phase 2) | "Ask AI manager" row. |
| Reused unchanged | `controller.ts`, `lifecycle.ts`, `public-response.ts`, `coverage-actions-controller.ts`, `coverage-actions-response.ts`, `public-coverage-plans.ts`, `workflow-contracts.ts` labels and the approved payroll strings. |

Tests (fictional data, injected `request` stubs, no provider, no paid calls):
- Keep green and untouched: `controller.test.ts`, `lifecycle.test.ts`, `coverage-actions-controller.test.ts`, `coverage-actions-response.test.ts`, `client.test.ts`, `signout.test.tsx` (proves the contract and lifecycle are intact). Update `render.test.tsx`, `page.test.tsx`, `coverage-plans.test.tsx`, `attention.test.tsx`, `notebook-panel.test.tsx` and `src/test/integration/owner-advisor-browser.integration.ts` for the new markup.
- New unit tests (vitest): answer renderer (no HTML or links from model text; lists; 12,000 chars); every `AdvisorErrorCode` maps to copy; working copy by elapsed time (fake timers 0 s, 20 s); starter fills but never sends; composer Enter / Shift+Enter / IME / 2,000 cap / counter at 1,800; AI-off hides the box and dispatches `inspect` with company-time dates; history dedupe; daily-limit reset time in company zone; sign-out and blur clear the panel; panel Esc returns focus; dock ≥1440, overlay below.
- Browser (one isolated run when the release gate is free): 390, 320, 1024, 1440 and 200% zoom; keyboard-only ask, review and save; reduced motion; offline toggle; window blur pause and recovery; axe on each state; the AI-on states through a stubbed fetch only.

Order: provider + page chat (phone) → states → Review draft sheet → desktop panel → sub-pages → finder row. Each step stays behind `NEVORA_OWNER_ADVISOR_ENABLED`.

---

## 10. Acceptance checks for the build

1. No change to `src/lib/owner-advisor/**`, `src/app/api/owner/advisor/**` or migrations (`git diff --stat`).
2. With no provider, the chat shows "AI answers aren't on yet", runs all three checks and makes no `ask` POST.
3. With a stubbed provider: question bubble at once; Stop works and shows "Stopped waiting"; answer shows sources from `answer.sources` only.
4. No answer text becomes a link, button or HTML (injection fixture with `<a>`, markdown links and URLs).
5. A draft is saved only after the checkbox and "Save 1 draft shift"; the receipt says nothing was published or notified.
6. Blur, hidden tab, offline and sign-out clear private content in both the page and the panel; it reloads on return.
7. Every state in §5 renders with its copy at 390 and 1440, with no overflow and no wrapped row titles.
8. Keyboard, screen-reader names and announcements as in §7; axe has 0 violations.
9. Reduced motion removes the pulse and slides; 200% zoom has no sideways scroll.

---

## 11. Draft scorecard (for the Product Designer)

| Line | Score | Note |
|---|---|---|
| Usability | 2 | One tap from any page; answers carry proof and one action. |
| Familiarity | 2 | Chat pattern from ChatGPT/Claude; side panel from Linear, Causal. |
| Trust | 2 | No sparkles or gradients; "Answers can be wrong"; nothing saves without a checkbox; drafts never publish. |
| Accessibility | 2 | Designed for it (§7); unproven until the browser run. |
| Brand distinctiveness | 1 | Pure corporate kit: calm and NEVORA, but a chat looks like a chat. |
| Durability | 2 | Plain text, rows and cards; no trend styling. |
| Cost | 1 | Shell-level provider and a docked panel are real work; pages need a check at 788px. |
| Continuity | 2 | Tabs, route and More entry unchanged; one new top-bar entry. |
| **Total** | **14 / 16** | No zero on Trust, Accessibility or Usability. |

---

## 12. References

Mobbin (searched Nov 1, 2026):
- Origin "Ask Sidekick": starter questions as plain rows in a list, ask box at the bottom → our "Try asking" card. https://mobbin.com/screens/c759f1aa-5c8a-46d2-a265-f2260a873275
- ChatGPT iOS: the box at the bottom, starters above it, no tab bar → D3. https://mobbin.com/screens/deb44228-0b99-4043-a100-24216b218b08
- Gorgias AI Agent: "used the following sources" under the answer, and "Actions disabled – no changes will be made to live data" → sources card and the Records check / AI-off honesty. https://mobbin.com/screens/e077aad0-3aaa-4244-8c91-452d0f9e7b5f
- Linear Asks and Causal Copilot: assistant panel on the right of a working page → desktop panel. https://mobbin.com/screens/51c2bd60-f22d-4879-8c28-c5800ac1f4b6 · https://mobbin.com/screens/86c4a7d6-c70e-4eba-8688-453870b957db
- ChatGPT web citations panel: sources as a list of rows, not inline chips. https://mobbin.com/screens/88d5e839-cf2b-447b-887c-a4beeead8040
- Descript "Approve plan" and Confluence AI "Discard / Replace": the AI proposes, a separate explicit control applies → Review draft. https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080 · https://mobbin.com/screens/048344a5-3f3c-4740-b41f-c8ca1e34b23f
- Not found on Mobbin in these searches: Intercom Fin, Notion AI, Rippling AI, Shopify Sidekick, Gusto. Nothing is borrowed from them.

21st.dev (search only, no code fetched, nothing generated): "Cited Answer AI Chat Input" (dhxwhy) for short sentence-level announcements and reduced motion (its colour chips rejected); "AI Sources" (educalvolpz) collapsible sources (rejected: sources stay open for trust).

Skills: `ui-ux-pro-max` (its search data isn't installed here; its priority table was used as the fallback), `tastemaker` (KB files not installed; method and IDs from its SKILL.md), `design:design-critique`. Self-critique fixes applied before the final render: skeleton bars darkened to `#E3E5E6` (they vanished on the grey canvas), placeholders moved to `#6B7075`, the annotation moved off the title, truncated rows shortened, the answer frame re-scrolled so its action isn't clipped, the sheet note re-broken to avoid a one-word line.

## 13. Questions for Jose

1. Draft confirmation: option A (Review draft sheet, works today) or B (save on the Schedule page, needs Codex)?
2. AI off: who turns AI answers on, so the copy can say so?
3. Phone header: approve the new AI manager icon beside the bell?
