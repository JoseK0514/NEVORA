# Claude to Codex: Rondo AI screens for Owner and Manager (Nov 18, 2026)

Jose wants Rondo AI visible and finished for Owners and Managers on Development. His words:

- "right now we are missing rondo chat and the inteligence we have of AI around nevora which i think development
  currently have that"
- "Push, then build"
- "Make sure to have the same quality of UI when building the new pages"
- "please ensure that the pages we build mantain premium UI and make sure to be consistent no
  /anthropic-skills:stop-slop and not AI generic looking"

This note covers the UI. Codex owns the backend, hosting and the joined release. Development is the acceptance release;
main needs Jose's separate approval.

## What Jose saw

Development has no Rondo switch on. The `nevora` Vercel project lists no `NEVORA_OWNER_ADVISOR_*` or
`NEVORA_MANAGER_ADVISOR_*` setting for `development`, and its newest Development deployment is the failed identity
preflight. The Rondo chat Jose has seen elsewhere is `velani-rondo-development`, Velani's public Rondo, a separate
project with its own AI settings. Claude read setting names only, no values.

## Source

| What | Commit |
| --- | --- |
| Branch before this work, pushed | `f9171d7c6` (premium pass) |
| Rondo UI | `aae7c32fc` |
| Rondo guide text | `97c61303a` |
| Six guides rebuilt and verified | `513396a3f` |
| This note, DESIGN.MD, delivery index | the commit that adds this file |

Claude built against your Development candidate `21fd12352` (from your `nevora-development-publish-20261118`
worktree). The UI commit carries three of your files byte-identical so your join merges them cleanly:
`src/lib/owner-advisor/manager-contracts.ts`, the `managerAdvisor` line in `src/lib/feature-flags.ts`, and the two
`NEVORA_MANAGER_ADVISOR_ENABLED` lines in `.env.example`. It does not carry `src/lib/owner-advisor/manager.server.ts` or
`src/app/api/manager/advisor/route.ts`. Until your join lands, a Manager on this branch with both switches on gets
"Rondo AI is off" (the API answers 404). The screenshots come from a local worktree that added your two backend files
unchanged; the UI files there are the same bytes as `aae7c32fc`.

## Joining this branch with your candidate

A trial merge of `f9171d7c6` with `21fd12352` conflicts in 15 source and test files plus the guides. Claude backed
out and resolved nothing. The source conflicts set your security work against the premium pass's presentation:

- `src/app/activate/activation-invitation.tsx`, `src/components/mobile-access/activation-view.tsx`: your
  `passwordReason` messages and the 15-character rule, against the kit's `BCallout` notes.
- `src/lib/auth-copy.ts`: 15 against 8 characters, "Already activated?" against "Already set up?", your new
  `activationNotFound`.
- `src/components/app-error-screen.tsx`: the refresh glyph and the eslint rule name.

Keep your logic and rules. Keep the premium pass's notes and glyphs. If you take your markup, Claude will dress your
password messages in the kit after the join. Rebuild the guides from the joined commit.

## What changed in the UI

| Area | Change |
| --- | --- |
| Name | "AI manager" is "Rondo AI" in the sidebar, rail, More, page titles, back links, the loading label and the Owner chat's messages. A reply's author is "Rondo". |
| Glyph | Phosphor `ChatsCircle` (two speech bubbles), key `rondo` in `nav-icon.tsx`. Jose asked for nothing that looks AI-generic, so there is no sparkle. Insights keeps its chart; texting a person keeps `ChatText`. |
| Owner entry | Listed under More in the sidebar and on More with `NEVORA_OWNER_ADVISOR_ENABLED`. The plain button under the Owner's Home cards is gone. |
| Manager entry | Listed for a Manager with a current company or location scope when `NEVORA_OWNER_ADVISOR_ENABLED` and `NEVORA_MANAGER_ADVISOR_ENABLED` are both on (`navigation.ts`, `NavContext.managerAdvisorEnabled`, passed from `app/layout.tsx` and `more/page.tsx`). |
| Manager page | `/app/ai-manager` renders the Manager view for a Manager with both switches on, otherwise 404 as before. The Owner path is unchanged. Rondo's other pages stay Owner-only. |
| Manager view | `src/components/owner-advisor/manager/`: location (a select, or a plain line for one location), the Weekly plan's week stepper, four guided questions with Rondo's reply, and the week day by day. Read-only. |
| Owner page | `advisor.tsx` and its parts rebuilt on the corporate kit: teal band, Rondo's tools as rows with their own glyphs (CalendarDots, BookOpenText, CashRegister), issue rows with facts lines, kit stats for the briefing, the two checks as form cards, the conversation card, priorities, goals and tasks in one card. Readable dates and times ("Wed, Nov 18", "9:27 PM", "Puerto Rico time"), correct plurals, no internal location IDs. Handlers, requests, ids and limits unchanged. |
| Kit | `button.b-btn { border: 0 }` in `owner-b.css`: a kit button on a corporate-kit page lost the browser's outset border (Rondo, Weekly plan, the payroll import flows). |
| Guide | `docs/guides/web/rondo.md` names Rondo AI and adds "Rondo AI for Managers". |

## Contract use (Manager)

- `GET /api/manager/advisor` with `x-nevora-manager-advisor: 1`, same-origin, `no-store`. One location and one Monday
  per read. Questions come from the context's list.
- 401 shows "Your session ended" with Sign in. 403 shows "No access to Rondo AI" with Return to Home. 404 shows
  "Rondo AI is off". 503 or a network failure shows a retry; the page never shows zero for a failure. 400 shows
  "Rondo can't answer that here" and keeps the page open.
- A reply whose view, week, location or question differs from the request counts as unavailable.
- Leases: each read leaves at `validForMs` from receipt and renews at 70% while the page is in front. Blur, a hidden tab,
  a location or week change and 401/403/404 clear it. A newer request aborts the older one; late replies are ignored.
- Words: hours are "Planned time from the schedule. Timecards show hours worked." Released shifts "followed an approved
  'Can't work' request" and "aren't in the draft or published counts".

## For Codex

1. Join this branch with your candidate (merge note above) and rebuild the guides from the joined commit.
2. Turn on for Development, branch-scoped Preview `development`: `NEVORA_OWNER_ADVISOR_ENABLED`,
   `NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED`, `NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED`,
   `NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED`, then `NEVORA_MANAGER_ADVISOR_ENABLED` on the verified joined source.
   Retrieval and every provider setting stay off: Jose chose paid calls off.
3. The briefing server writes "1 published shifts", "1 planning periods need review" and 24-hour times
   (`src/lib/owner-advisor/briefing.ts`). The Owner page corrects the known sentences on screen; a fix at the source is
   cleaner.
4. Reply with the joined commit, the Development deployment URL and the switches that are on. Claude rechecks the
   screens there.

## For Jose

- Typed questions to Rondo need a paid AI service. Before anyone turns one on, Codex needs your cap, daily limit and
  end date. Until then the Owner page says "Answers to typed questions are off" and the checks work.
- Rondo AI has no card on the Owner's Home. It is in the sidebar and on More. Say if you want a Home card.

## Checks

All on fictional data (Northside Café & Bakery), local loopback PostgreSQL, no AI provider.

- Type check: no errors in `src` on `513396a3f`.
- Lint: clean on every changed source file.
- Tests: 1,033 files, 15,700 tests pass on `513396a3f`. Under the full parallel run, one guides test
  (`manual-publication.test.ts`) hit its 5-second limit; run alone, both guides test files pass (57 tests).
- Guides: rebuilt from `97c61303a` and verified, 6 of 6.
- Screenshots: Manager at 1440, 900, 390 and 320; every forced state (loading, failed, off, no access, signed out,
  no locations, one location, week failed or not accepted, zero and large figures, answer loading, failed and not
  accepted, hidden after stepping away, lease ended); a Manager with one location; 200% text; reduced motion. Owner
  Rondo AI, Weekly plan, Company knowledge and Business records at the same widths, the checks in use (proposals,
  comparison, draft review and acknowledgement, period review, task editor, deferred item), 200% text, More and Home.
  0 accessibility violations in 54 axe runs; no horizontal overflow at any width. The capture runs are `rf-mgr`, `rf-mgr2`, `rf-own` and `rfin-own` (local, not committed).
- Keyboard: Manager order is location, previous week, next week, then the four questions, each with the 2px teal
  ring. Owner order is tools, Check again, each issue's actions, Refresh history, sources, then the checks.
- Not checked: a typed-question answer (no AI provider, by design), a screen reader pass, the screens on hosted
  Development (switches off there).

## Pictures (fictional data, Northside Café & Bakery)

| File | Shows |
| --- | --- |
| `rondo-mgr-open-1440-fold.png` | Manager, before asking |
| `rondo-mgr-ans-hours-1440-fold.png`, `-390.png`, `-320.png` | Manager, hours answer at three widths |
| `rondo-st-one-390-fold.png` | One location: a plain line |
| `rondo-st-empty-390.png`, `rondo-st-off-1440-fold.png`, `rondo-st-ans-failed-390-fold.png`, `rondo-st-hidden-390-fold.png` | No locations, switched off, failed answer, hidden after stepping away |
| `rondo-st-big-320.png` | Large figures at 320 |
| `rondo-scoped-ans-1440-fold.png`, `rondo-scoped-more-390.png` | A Manager with one location: page and More |
| `rondo-text200-390-fold.png` | 200% text |
| `rondo-owner-ai-1440.png`, `-1440-fold.png`, `-390.png`, `-320.png` | Owner Rondo AI page |
| `rondo-ox-compare-1440.png`, `rondo-ox-draft-390-fold.png` | Owner day plans and the draft review |
| `rondo-nav-more-390.png`, `owner-home-1440.png` | Owner More; Owner Home without the stray button |

## Release sequence

Development is the working and acceptance release. Codex integrates and verifies the combined backend and UI there;
the exact verified release goes to main only after Jose approves. This note authorizes no main merge, production
activation, paid provider or copied production data.
