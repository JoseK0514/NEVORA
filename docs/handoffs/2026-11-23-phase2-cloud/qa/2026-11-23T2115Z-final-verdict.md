# Final verdict, 2026-11-23 21:15 UTC

Final app tip `fc6e67f2c` (origin/claude-codex-collab-nevora): `4cf11130` + guides (docs) + `484385e4` (Team filter
rings, CSS). Fictional data, owned throwaway Postgres, production builds over the owned https proxy.

| Check | `8c9c04c93` | `4cf11130` (Payroll export fix) | `fc6e67f2c` (final) |
|---|---|---|---|
| Typecheck | Pass | Pass | Pass |
| oxlint | Pass | — | — |
| Unit | 16,327 pass; manual-publication only | 16,329 pass; manual-publication only | 16,330 pass; manual-publication only (guides rebuilding on this tip) |
| readiness-ui-browser, production | Chromium 3/3, WebKit 3/3 | Chromium 3/3, WebKit 3/3 | Chromium 1/1, WebKit 1/1 |
| readiness-shift-concurrency-browser, development | Chromium 20/20, WebKit 20/20, ×2 | — | — |
| Clocked-in Payroll export: typed text and selection survive 40 s | **Fail**, both browsers (wiped within 10 s; input remounted) | WebKit pass; Chromium probe gap | **Pass**, both browsers (same DOM node, text and "Leave out" kept) |
| Clocked-in Payroll export: loaded history survives 35 s | — | WebKit: region kept, list retired at about 15 s | Both browsers: region kept (same node), list retired at about 15 s |

## Notes
- **History "expires" at 15 s by design.** `src/components/period-close-history.tsx:59,72` retires loaded history 15 s
  after the first page loads ("History expired. Load history again."). The remount bug is fixed: the region is the same
  node throughout. A 35 s survival needs a product decision on that lifetime.
- **Targets (tap reach, `elementFromPoint` ±21.5px, 390, Owner, empty lists):**
  - Team filters: fixed.
  - Time off segments "Waiting", "Approved" and "Declined": the bottom point lands on the empty-state card
    (`div.b-statecard`), which overlaps the ring.
  - "What this measures" on Build and publish: no ring; all four points land on `form.c-publish__go` or the row detail.
  - Both are 36px or more, so they pass WCAG 2.5.8 (24px) and miss the 44pt goal.
- **Team "Search people" axe contrast** is a false positive: rendered text is about `#e3ffff` on `#1d6c67`, about 5.9:1.
- **WebKit** logs "access control checks" page errors on background reads (inbox count, notifications, operational
  authority) when the Payroll export page is opened with someone clocked in: 6 in the probe on `fc6e67f2c`. Same family
  as G69; the readiness tests stayed at 0.
- **Production mechanism found earlier** (trace on `13509ca2`): on-sight prefetch refills after each access-renewal
  refresh raced the refresh and remounted the "Choose who's included" disclosure content. Intent prefetch (`8c9c04c93`)
  and the Payroll export view-key fix (`4cf11130`) remove both causes.

**Verdict: release-ready from QA's side** once the guide rebuild lands (manual-publication). Open items above are minor
(two 36px targets, the 15 s history lifetime) and none blocks the flows tested.
