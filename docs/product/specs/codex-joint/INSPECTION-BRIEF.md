# Inspection brief for cloud inspectors

October 19, 2026. This is the same bar and method that Claude's five local inspectors have used all day, written for an inspector working in the cloud. Jose's bar for demanding clients: **every page, every role, every state, every device**. The bar doesn't drop. Find every defect before Jose does. A finding is a measurement, not an impression: "Looks fine" is not a result; a number is.

## The five areas

Inspect each one separately. Prefix each finding ID with the area and the chat, for example `AL-WA-12` for alignment on Wave A.

| Area | Prefix | What it covers |
|---|---|---|
| **Alignment and geometry** | AL | Edges and insets (page edge 16px on phones; text 20px inside cards; 16px between band and first card and between cards), card widths, gaps, baselines of titles against meta and pills, icon-to-text alignment, radius consistency, icon-led titles (20px icon + 12px gap, or 40px tile + 12px gap) |
| **Bars and stability** | ST | Layout shift while loading (placeholders the same height as the page; above 0.01 is a finding), font-swap shift, held heights while a read runs, sticky and action bars, the tab bar and safe areas, toasts not covering actions, nothing moving on hover, focus or pending, scroll that goes over nothing |
| **Type, colour and copy** | TC | Kit type roles only, nothing under 15px on phones (tab labels 13, number badges 12), 14px floor on desktop, contrast of at least 4.5:1 for text and 3:1 for icons and field edges, words (below), dates, times and durations never split across lines, sentence case, curly apostrophes |
| **Interaction and states** | IS | Every state (loading, ready, empty, partial, offline, paused, failed read, no access, signed out mid-use, decided, large data), focus order and visible focus, keyboard use, dialogs and sheets (focus in, Escape, focus back), submitting on screen (before, pending, failure, double tap sends exactly one request, slow network), reduced motion, accessible names |
| **Widths, roles and consistency** | WR | Every width and text size without overflow, clipping or overlap; every role that can open the page; the same thing looking and reading the same on every page |

## The matrix

- **Widths:** 320, 360, 390, 430 (phone: `isMobile`, `hasTouch`), landscape 844×390 (`isMobile`, `hasTouch`), 768, 1024, 1440.
- **Text size:** 100, 125, 150 and 200%. Set the root font size after the page loads: `document.documentElement.style.fontSize = '150%'`.
- **Browsers:** Chromium and WebKit. Firefox is out of scope.
- **Roles:** `QAOWNER` (Owner), `AUDIT-M` (Manager), `AUDIT-LEAD` and `payroll-qa-b` (Lead), `AUDIT-E` and `payroll-qa-a` (Employee), `AUDIT-LONG` (long name), `AUDIT-ON` (clocked in), `AUDIT-BREAK` (on break), `AUDIT-SWAP` (works next weekend only).
- **States:** produce them in your own browser only. Block or answer the page's own requests with `page.route` (for example a 503, a 401, a held response, or offline). Never change server data to get a state.

**The script does the sweep; you do the judgment.**
1. Run `scripts/ui-checks/checks.mjs` first, over every route, width, text size and both browsers. It covers overflow, the text floor, targets, layout shift, errors and axe. Attach its results file to the round.
2. Then spend your time on what it can't judge: alignment and spacing, wording, states, focus and keyboard, behaviour, consistency.
3. Judge at 320, 390, landscape and 1440 (plus 768 and 1024 for desktop work) in Chromium, with spot checks in WebKit.

## How the design must look

Read `DESIGN.MD` and `.21st/DESIGN.md` in the repo. The kit (`src/components/kit/`) and the Phase 2 and Phase 3 pages are the precedent. Gusto is the benchmark.
- **Page:** the kit `PageBand`, then kit cards (radius 20, no border).
- **Pills and links:** pills state a condition; teal links state an action.
- **Buttons:** `.nv-btn`, 52px tall, radius 12, primary teal `#077572`. Touch targets are at least 44px on phones and 24px with a mouse.
- **Forms:**
  - Labels above fields; fields 48px (they grow with text size), radius 12, 3:1 edges; help text muted, 8px under the field.
  - Errors in urgent ink with an icon and a word, never colour alone.
  - 16px between fields. The main action is a primary button, full width at the bottom on phones or in the kit action bar.
  - Pending: the button says what it's doing ("Saving…"), is disabled, and the page doesn't move.
- **Icons:** Phosphor only.
- **Words:**
  - Plain sentence case, curly apostrophes (’).
  - No blame or system words: missing, missed, denied, rejected, callout, cutoff, exception, "could not be confirmed".
  - Use instead: not sent yet, declined, withdrawn, waiting, Unable to work, availability deadline, issue.
  - Failures read "Couldn’t load {thing}." with a "Try again" button. An ended session reads "Your session ended" with a "Sign in" link.
  - **Payroll and legal wording needs Jose's approval:** list it under "Suggestions for Jose" and don't count it.
- **Times and dates:** "Oct 19 – Oct 25", "8:00 AM – 4:00 PM", "3h 40m", "Mon, Oct 19". They never split inside, and a range breaks only after its dash. Every browser writes them the same way.

## What isn't yours

- **The shared shell:**
  - The phone header, tab bar, More sheet and section tabs belong to the coordinator (`claude/premium-phase-1`).
  - The desktop sidebar, account menu and header belong to the Desktop chat.
  - When you inspect another chat, file a shell defect once, under "Shell (for the coordinator)", not as that chat's finding.
- **Backend behaviour:** what a submission saves, sends or returns is joint testing. File only what the screen does.
- **Load:** 500s and 503s caused by load aren't defects. Retry once, then list them under Gaps.

## Rules

- **Read only.** Don't edit app code, CSS or tests on any `claude/*` branch.
- **Don't change data.** No Approve, Decline, Publish, Save, Submit, Delete, Copy week, Send, Add or Sign out reaching the server. Test submitting by answering the request in your own browser (`page.route`).
- **No real data, no secrets.**
  - Fictional data only; nothing leaves the machine.
  - Never print the preview password, or write it into a report or a URL. Read it from `access.json`.
- **Known limits, not defects:**
  - Playwright has no native blur.
  - A full-page screenshot draws sticky bars in the middle of the image. Check sticky bars with viewport screenshots while scrolled.

## How to report

One file per area per round. Keep it short and complete:
1. **Verdict:** one paragraph at the top. Zero, or not zero, with counts by severity.
2. **Status of earlier findings** by ID: fixed, not fixed, or partly fixed (with what remains).
3. **Findings table, worst first.** For each finding:
   - ID
   - screen, role and width
   - element (selector or visible text)
   - what is wrong, **measured** ("card edge 16px, next card 20px")
   - a screenshot crop path
   - likely cause at `file:line`
   - a specific fix (values, not "align it")
   - severity:
     - **P0:** broken, unreadable or unusable
     - **P1:** visibly wrong to a careful user
     - **P2:** a precision issue a designer would catch
4. **Checked and correct:** a short bullet list with the measurement, so the next re-check knows what passed.
5. **Gaps:** what you couldn't see, and why.

Don't pad, and never invent a finding. If something is a judgment call, say so and why.

**Rounds:** round 1 on a chat is a full sweep. Later rounds re-check open findings by ID, plus anything the round's fixes touched. The script re-runs in full every round. A chat's exit round is one full sweep by all five areas.
