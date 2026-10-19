# Wave C complete exit continuation

**Prepared; execution held by root's canonical candidate gate.** The original exact `5f7c166` reports and raw proofs remain unchanged as historical source evidence. They are incomplete and nonzero. Root approved an isolated merged review target: `codex/ready-wave-c`, exact `de8b158`, based on frozen candidate `9ec3adc` plus Wave C `5f7c166` (initial reviewed merge `77784e6`, followed by the single payroll-guidance fix). [Integration and preservation](../../release/readiness/wave-c-b9567ab/integration.md) explain the reviewed merge. Final acceptance must name the full merged review SHA, with no browser CSS injection.

The complete job registry is [plan.mjs](evidence/complete-exit/plan.mjs). [run.mjs](evidence/complete-exit/run.mjs) is serial and resumable, preserving the byte-identical coordinator checker and its raw outputs. [probes.mjs](evidence/complete-exit/probes.mjs) collects separate measurements; captures are never automatic passes. The scripts pass Node syntax checks. [Static fixture/selector contracts](evidence/complete-exit/contracts.md) include twelve in-memory Flight-envelope checks and eighteen client-prop model checks. Their browser execution has deliberately **not** been tested during the hold.

## Remaining work

| Stage | Jobs | Coverage |
|---|---:|---|
| Unchanged checker with axe | 128 | **960 cells, all with `--axe`:** thirteen Owner routes plus both Manager recovery routes × eight widths × four text sizes × Chromium/WebKit. The 390/1440 axe appendix is included in this sweep; no duplicate visits. |
| Passive five-area judgment captures | 0 extra visits | **240 baseline cells**, collected only after the unchanged checker has pushed its result. |
| Passive facts | 0 extra visits | **960 baseline cells**, with all required geometry/type/colour facts; crops on the 240 judgment cells. |
| Judgment sample detail | — | All fifteen route/role pairs; Chromium 320,390,844×390,768,1024,1440 at 100/200%; WebKit 390/1440 at 100/200%. Insets, card gaps, icon first-line alignment, types, colours, words, times, controls, bars and top/middle/bottom viewport captures. |
| Loading and hydration | 150 | All fifteen pairs at four Chromium viewports and both text extremes, plus WebKit390. Native placeholder trace, CLS, before/after hydration. A guarded SSR page alone does not count as loading proof; unavailable native/client-navigation captures remain gaps. |
| Query/back/not-found variants | 117 | Status/no-match filters, unknown location, employee and long-ID Back, Owner/Manager from-settings variants. |
| Form submissions | 124 | Twelve form/role pairs plus four exact ST-13 short-viewport cases; validation, before/pending/locally blocked failure, repeated activation, focus and geometry at four Chromium viewports/text extremes and WebKit390. |
| Dialogs | 70 | All seven dialogs; initial focus, forward/backward Tab, root/body scroll lock, before/pending/blocked failure, single held POST, Escape/focus return; includes landscape and desktop. |
| Recovery state fixtures | 130 | Both management roles; fabricated issued/expired/blur/offline code; empty/ready/100-row/invalid/paused/offline/failed/401/403 receipt states. |
| Signed out during use | 56 | Branding, Features, Policies and both recovery pages; 401/403 at sampled phone/desktop sizes, both management roles where allowed. |
| Refused roles | 345 | All **115** refused route/account pairs, including every brief account, at Chromium390/1440 and WebKit390. Home redirect is decided; verify what is actually shown. |
| Motion, keyboard and field states | 45 | Every allowed route/role pair, phone and desktop, Chromium/WebKit; also open disclosures, Tab order and per-control idle/hover/focus styles on the same visit. |
| Large fixture | 9 | Separate owned `--large` preview, used serially; long-name Locations/list/detail/device pages. The 100-receipt fixture above is browser-only. |
| Signed-out context | 39 | All thirteen routes at phone/desktop/WebKit samples, with no storage state; login redirect, no Sign out request. |

Total: **1,213 checkpoint jobs**, comprising 960 checker/axe cells in 128 batches and 1,085 active supplementary jobs. Passive facts cover all 960 cells and judgment crops cover 240 of them, with **zero duplicate judgment route visits**. Existing 26 checker samples, 16 save-bar cases, 56 flex cases and 28 centering cases are preserved; they do not replace the new merged-SHA sweep.

Initial serial estimate after release: **75–120 minutes for the checker with axe on all 960 cells**, then roughly **2–3 hours for state captures, judgments, fixture adaptation and report completion**. This is an estimate, not a promise; timeouts, new findings or another source change add work. Measured batch durations will replace it. The first runs should use `--limit 8` to confirm selectors and throughput before a longer batch.

## Five-area closure checklist

| Area | Earlier/current IDs | Required judgment beyond the checker |
|---|---|---|
| AL | AL-08,13,14,15,16 | Phone page16/card-text20/gap16 measurements; title/meta/pill baselines; carets and links on first lines; wrapped band Add edge; hub footnote; desktop columns/sticky guides, radius and icons. |
| ST | ST-02,05,08,13,14,15,16,17 | Hard/client loading to ready at text extremes; first-font CLS; scroll top/middle/end; measured bar/tabbar/toast gaps; pending bounds and scroll position; long failure feedback fully reachable; guard colour stability; landscape failed dialog rows. |
| TC | TC-10,11,15,16,17,26,27, TC-WC-28 | Every visible type role/floor, text4.5 and icon/field3 contrast including hover/focus; whole words/times/dates; company terms and filter counts; idle/pending/failure consistency; no repeated notice title. Legal/server wording stays under decided items/Suggestions for Jose. |
| IS | IS-6,15 | Every applicable ready/loading/empty/partial/failed/offline/paused/no-access/signed-out/decided/large state; validation and descriptions; keyboard/visible focus; dialogs; one request on repeat; slow pending; reduced motion; issued-code selection/expiry/privacy clear. |
| WR | WR-11,13,21,22,23,24, WR-WC-25 | All matrix results; all allowed and refused roles; long names, back links, not-found and filters; colour-well pixels; final merged dialog label bounds and centering; cross-page search/pill/count/control consistency. |

Thirty ID verdicts must be measured and recorded independently; source presence is not closure. The five supplementary workstreams in the registry still require targeted work: browser-only RSC empty/failed/partial fixtures, branding previews/word presets, all custom policy fields/history states, fictional upload/setup-code results, and human review of every observation. A mock receipt is always labelled fabricated. First-run empty and query no-match are different states. Unsupported fixtures remain explicit blockers until covered; they cannot silently become passes.

## Execution custody and resume

Do not run a preview or browser until root explicitly releases the canonical candidate gate. The runner enforces `NEVORA_WC_EXIT_RELEASE=root-released`, verifies the clean source SHA and open owned-preview identity, and takes one lock per preview. It never starts a preview, seeds data or signs in by itself.

After release, use an owned disk preview with `PREVIEW_SOURCE=/workspace/ready-wave-c`. Adapt `seed-extra.mts` imports to this exact source using the shared runtime helper; seed the ten fictional brief accounts and log in once. Keep credentials in protected `access.json`; do not copy it into reports. The normal dataset and `--large` dataset need separate previews, operated serially. No fixture setup is being run while held.

```bash
source /workspace/nevora-inspections/runtime.env
export PREVIEW_SOURCE=/workspace/ready-wave-c
export PREVIEW_OUT=/workspace/paused-previews/wave-c-complete
export EXPECTED_SOURCE_SHA=de8b15851d6280fd31fba3db63dcbe976a19584a
export NEVORA_WC_EXIT_RELEASE=root-released
node evidence/complete-exit/run.mjs --stage matrix --limit 8
```

Keep `EXPECTED_SOURCE_SHA` equal to the **full** commit ID returned by `git rev-parse HEAD`; the runner rejects a mismatch or abbreviation. Run from this report directory. Continue the same matrix stage without `--limit` before supplementary stages. Every matrix invocation includes `--axe`; there is no separate axe stage. Outputs live under `evidence/complete-exit/<full-sha>/`; completed jobs are skipped. `--job <exact-id> --retry` reruns one case in a new attempt directory, preserving every prior raw artifact and its index history. The runner preserves original checker JSON and one isolated retry for environmental load failures, never rewrites `checks.mjs`, and keeps the after-result passive collector and active state hooks separate. Passive evidence lives in each batch attempt alongside the untouched checker result; collection failures remain gaps.

Pause between bounded batches; stop only the owned runtime, then archive its source/mirror verification and PostgreSQL closure. On restart, re-login because the disposable preview's password and session records change. A new code commit creates a new evidence directory and reopens the affected/full exit gates. Never port fixes to `claude/*`, main or release-candidate from this worker, and do not edit shared STATUS.

## Source ports and zero

Raw `5f7c166` still needs WC25 `flex:0 0 auto` plus dialog-span `align-self:center`, ST13 bounded feedback, and the latest coordinator winning field-edge rules (TC-WC-28). These are now present by construction in isolated merged `de8b158`, but have **not** yet been certified on its actual UI. The legacy assisted CSS was replaced, so its contrast finding needs equivalent coverage on the new DOM. Any further measured P1/P2 gets a separate named candidate/review fix and an exact follow-up SHA; no zero is inherited from a source injection or from the parent candidate's unrelated tests.
