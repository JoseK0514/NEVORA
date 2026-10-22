# NEVORA product team

Eight specialist agents (definitions in `.claude/agents/`) work in cycles. Their
outputs land in this folder. Shared rules and the trend-and-trust scorecard are
in [TEAM-RULES.md](TEAM-RULES.md).

## The team

| Agent | Role | Writes |
|---|---|---|
| `ux-researcher` | Behavioural trends: how people's expectations are shifting | `trends-<yyyy-mm>.md` |
| `market-strategist-pm` | Competitors, launches, new technology, what customers ask for, the app-store route | `competitive-<yyyy-mm>.md` |
| `product-designer` | End-to-end direction; owns the scorecard and design sign-off | `direction.md` |
| `product-manager` | Requirements: user stories, acceptance criteria, priorities, releases | `prd-<initiative>.md` |
| `ux-designer` | Flows, wireframes, information architecture, usability | `specs/<initiative>/flows.md` |
| `ui-designer` | Visual appearance: colour, type, spacing, icons, motion feel | `specs/<initiative>/visual.md` |
| `ui-ux-designer` | Merges flow and visual into one buildable spec per screen | `specs/<initiative>/spec.md` |
| `ui-engineer` | Builds approved specs in a worktree; makes the live app match | code (worktree) and `specs/<initiative>/build-report.md` |

## A cycle

1. **Discovery, in parallel:** `ux-researcher` and `market-strategist-pm`.
2. **Direction:** `product-designer` writes the direction, then `product-manager`
   writes PRDs for the approved items.
   - **Checkpoint 1:** Jose approves the direction, priorities and app-store route.
3. **Design:** `ux-designer` and `ui-designer` in parallel, then `ui-ux-designer`
   merges, then `product-designer` re-scores.
   - **Checkpoint 2:** Jose approves the specs.
4. **Build:** `ui-engineer` on the fictional runtime (tests, the 156-check sweep,
   flow scripts, screenshots at 375, 390, 1440 and 1920).
5. **Review:** `ui-designer`, `ux-designer` and `product-designer` check the live
   build against the spec. One fix loop, then a report to Jose.
   - **Checkpoint 3:** commit approval.

## Outputs

**Cycle 1 (2026-10-17): whole product, all platforms.**
- [trends-2026-10.md](trends-2026-10.md) (UX Researcher): 26 trends, 10 to adopt
  or adapt, and an avoid list.
- [competitive-2026-10.md](competitive-2026-10.md) (Market Strategist): 11
  competitors, recent launches, Puerto Rico rules, and the app-store route
  (recommends Capacitor).
- [direction.md](direction.md) (Product Designer): 33 opportunities scored, top
  five ranked, the parallel UI track, and the decisions for Checkpoint 1.
- **Checkpoint 1 approved (2026-10-17):** the priority order, the Capacitor
  route as a two-week spike, and the no-backend UI track (items 6, 8, 10, 11,
  12 and 13). Backend, legal and privacy items wait for their own go-ahead.
- PRDs (Product Manager):
  - [prd-phone-search.md](prd-phone-search.md): 3 slices.
  - [prd-phone-foundations.md](prd-phone-foundations.md): 9 slices.
  - [prd-owner-setup-card.md](prd-owner-setup-card.md): 3 slices.
  - [prd-phone-polish.md](prd-phone-polish.md): 7 slices.
  - [prd-capacitor-spike.md](prd-capacitor-spike.md): 6 slices over 10 days, with Jose checkpoints on day 5 and day 10.
- **PRD decisions (2026-10-17):**
  - snapshot script approved as a dev-only tool;
  - desktop type stays px;
  - the weekly deadline stays out of the setup card;
  - the setup card is Owner-only;
  - TestFlight comes after the go decision;
  - the spike's test domain is still open.
- Design: each initiative has `flows.md` (UX), `visual.md` (UI) and
  `spec.md` (merged) under `specs/`, with mock-ups and before-screenshots.
- Review (Product Designer, `review.md` each). All four go, with small required
  changes:
  - phone search 15/16;
  - phone foundations 14/16;
  - Owner setup card 15/16;
  - phone polish 15/16.
- **Checkpoint 2 approved (2026-10-17):**
  - all four specs, with the Product Designer's recommendations (recorded at
    the end of each `spec.md`);
  - the D4 ring is the first desktop item next cycle;
  - the sticky save bar is its own item.
- Build (UI Engineer, in worktrees): run 1 (phone search, the setup card,
  polish A1, A2, B1, B2 and C1) and run 2 (foundations). Each has a
  `build-report.md` in its spec folder.
- Review: [build-review-cycle1-ui.md](build-review-cycle1-ui.md),
  [build-review-cycle1-ux.md](build-review-cycle1-ux.md) and the Product
  Designer's sign-off [build-review-cycle1.md](build-review-cycle1.md)
  (search, setup card and polish 15/16; foundations 13/16). One fix loop:
  [specs/fix-loop-1/build-report.md](specs/fix-loop-1/build-report.md).
  Eight items passed; two (Reports alignment and the desktop setup card
  padding) became follow-ups.
- **Checkpoint 3 approved (2026-10-17):** fix 9 (finder focus rings) and fix
  10 (logo chip 18px from the wordmark) kept. Committed on
  `NEVORA-UI-READINESS` as 3d945d5 (code) and 18dd36a (team docs), not
  pushed. D5 amended to one 44px phone button height.
- Still open: Jose's device pass (A3 Back matrix, iOS swipe-back, the Android
  tap-outside crash, C2 shortcuts, VoiceOver), about 45 minutes, before any
  release. Follow-ups are listed in `build-review-cycle1.md`.
