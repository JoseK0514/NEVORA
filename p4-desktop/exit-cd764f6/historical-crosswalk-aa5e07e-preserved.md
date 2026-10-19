# Desktop historical and latest-report crosswalk

**Two confirmed historical P2s had surviving uncovered implementations: IS-P4-19 and IS-P4-11.** Both are now separate external proposals for root; neither was applied or browser-tested here. No additional uncovered P1 is established by this read-only crosswalk. Missing final-SHA coverage remains incomplete, never zero.

Latest five source reports are snapshotted verbatim from inspections `aa5e07e` in source-reports/. They refer to Desktop `8012d9790e72987140f939c7d70e1df9612ea009`. The latest reports newly confirm only header **TC-P4-24**, which is implemented on ready-desktop by `28266eb` (stable TC-DESKTOP-KBD-01). The four other latest reports explicitly say incomplete; their zero newly verified counts are not exit certificates.

The complete historical inventory has **102 IDs** (AL30/ST12/TCD21/IS21/WR18), last exact source table rows and line citations in historical-all-ids.json. Historical source reports and immutable candidate code snapshots are preserved separately. Historical implementations were compared with candidate33 `b68f250`, candidate34 `56570fd` and ready-desktop `724b430`; current proposals additionally preserve root changes through `6aed3ea`. No application source/worktree/branch was edited, no test/CI/browser/preview was run, and no independent finding was self-closed.

## Surviving unfinished findings and disposition

| Historical IDs | Disposition / concrete implementation | Final acceptance |
|---|---|---|
| **IS-P4-19 P2** | Original source interaction-states:150,229: Lead1024 Enter on Refresh recorded time natively disables it and focus falls to BODY. Candidate34 and ready retain `employee-time-panel.tsx:63`; live Home reviewed footer also disables on refreshing. Candidate IS-74 excludes these files. Accessible pending name is already corrected; native focus loss remains. Proposed 2 application files + updates to 3 existing tests in proposals/IS-P4-19.patch, now based on **6aed3ea**. | Root review/apply; actual Enter/held-read/focus/deduped-request/privacy proof pending. |
| **IS-P4-11 P2** | Original source interaction-states:43,137,230: browser Back restores selected TIME_OFF:audit-timeoff, but in-page Inbox link only returns filter and selects first row. Candidate34 and ready withFilter/backTo still omit selection. Proposed source patch in proposals/IS-P4-11.patch against56570fd; root reported current apply-check passes. | Root review/apply; real pending item→review→band Inbox loop, valid/mismatched item/filter negatives and ready selected-row proof pending. |
| AL4-12→AL4-28, AL4-21,22,23,25,26→29,28,29 | Source Desktop **a2d9823** implements employee export inset,1100 chip fade,rounded My time cards,Employee timecard20px inset,Pay-band alignment,36rem Request-pages threshold. Present in ready8dd92eb merge: premium-desktop.css:435,439,443,455,508,516 and exports selectors. | Re-measure source fixes on final review; not newly uncovered from old table. |
| AL4-30 | Candidate coordinator **646939c**, exact shared premium CSS retained in ready; portal-premium.css:502–505 scales desktop summary once, phone rule separately. | Final geometry pending. |
| ST-P4-12 / WR4-17 | Source **5ed5929**, premium-desktop.css:62 scrolls view chips at every desktop width. Present ready. | Final keyboard/width/text check pending. |
| ST-P4-03/05/09/10/11 | Source Round4 measures fixed; source1ae1946 and later placeholder heights preserved by ready source integration. New selected-group collapse is separately ST-P4-13 below. | Full exact-review states/placeholder/scroll rechecks pending. |
| ST-P4-08 transferred font issue | Latest candidate WOFF2 preload and Inter fallback metric overrides retained byte-for-byte in ready both layouts/typeface. | Controlled final font-swap proof pending. |
| TCD-14 | Source **3957c05**, higher specificity export legend row role at premium-desktop.css:329, present ready. | Final16/22 measurement pending. |
| TCD-16 | Source3957c05 + candidate **31f87cd** include updates-row-action and reported legacy roles in desktop floor. Ready inherits both. | Full roles/states and computed floor proof pending. |
| TCD-17/18/19/20/21 | Source Round4 reports fixed. Ready preserves capped header name,callout menu heading,My pay/My time tabs (**bf095ce**),Scheduled until Home summary and short place NBSP (**408b603**/latest coordinator). | Final final-SHA proof pending; do not reopen from older rows alone. |
| IS-P4-06/20/21 | Source **176200c** implemented hidden-group keyboard filtering (`row-navigation.ts:16–21`),deep-page section current (`app-shell.tsx:212`),sticky status/focus. Ready retains. | Exact-review keyboard/scroll/state proof pending. |
| IS-P4-05 / WR4-02 | Profile session/backend already merged and independently reported zero earlier; ready has management Profile route + account navigation. | Final integrated menu/route check pending. |
| IS-P4-18 backend count | Actual candidate includes backend inbox-count route; source's standalone404 is a known merge dependency, not retained missing candidate endpoint. Ready imports hook as intended. | Final UI read/count/error smoke pending. |
| WR4-06/14/18 | Source5ed5929/a2d9823 implement all sibling-title/band rows,position own line at1100–1279,and Request-pages word-safe list threshold. Ready CSS:455,508,525,530. | Exact-review widths/text proof pending. |
| WR4-16 | Latest coordinator shorter month/date wrapping rules retained in candidate and ready; no year glue reintroduced in resolved keepWhole conflict. |320/200 date glyph check pending. |
| WaveC **WR-14** cross-owner Clocker meta | Root asked disposal: source **c232432** changes premium-home.tsx:328 to **“Check a saved Clocker action”**. It is actually present in ready724b via approved8dd92eb integration. Actual candidate still has old reconnect-device wording. | Implemented ready-only; preserve source entry at final merge; no duplicate new repair. |
| Phase3 **TC-P3-24** roster timezone | Phase3 crosswalk separately found still-retained Manager roster “Times in Puerto Rico.” at manager-weekly-roster.tsx:179; original type report:1199. | Parent/Phase3 owns separate external patch; no duplicate Desktop patch. |
| Phase3 **P3-WR-11** Inbox ShiftRow time range | Phase3 original widths report:1060 prescribes removing whole-stamp nv-nowrap; source/current Inbox retains it. | Parent/Phase3 owns patch; Desktop port must update newer shiftEntry meta as well. No duplicate finding count. |

Other historical IDs are retained individually in the102-row ledger. Their prior fixed/source implementation status does not close their final exit recheck. There is an unresolved **AL4-31 inventory reference** in the latest report range, but no AL4-31 finding row/measurement in source8012; it is an ID reconciliation gap, not an invented defect.

## Explicit kept decisions

Preserve **ST-P4-06** two-line196px Inbox band; **WR4-05/AL4-09** Home data-dependent column ends; coordinator **AL4-27** intended layout decision. Source Round4 accepts **Workforce13px as logo artwork**,avatar initials12 and number badges12; brief exceptions remain. WR4-09 More-sheet Close was reported fixed in Round2 and current coordinator sticky Close is retained. None of these is turned into a new repair.

## Candidate / ready mapping

- TC-P4-22 Availability: candidate7386c45; TC-P4-23 payday:3918350,filename portionTC-B-32:ed62b42. Ready inherits them.
- ST-P4-13: ready-only5b66aa3, bounded original-source proof8 openings+4 guards passes; exact-review acceptance pending.
- TC-P4-24 header: ready-only28266eb, original colliding header TC-P4-22 snapshot retained; exact-review acceptance pending.
- Root candidate33 HomeST-RC-HOME-01=b68f250 and34 TC-P3-25 plus subsequent root candidate fixes are newer than ready724b. The ready target needs normal integration of final root head later; no branch mutation is authorized in this crosswalk.

## Complete desktop scope mapping

phase3-desktop-scope-crosswalk.json enumerates all **2,976 normal Desktop cells** from Phase3's source plan (2,688 E/L +288 M/O). Exactly **1,320** literal cells are already planned inside the unchanged **9,888** Desktop baseline; **1,656** supplemental normal cells remain required:480 primary-role query variants,1080 LONG/ON/BREAK full-route cases,96 M/O Notifications/focused-request cases. No query variant is silently aliased to its plain route. The552 missing1440 axe cases are a subset of1656 because all final Desktop cells request axe.

Phase3 also requires **192 separate large-data Desktop cells**, eight M/O role-route pairs×3widths×4texts×2engines. Those require a different --large fixture lineage after the normal preview closes; they are not normal-row duplicates. Thus normal unique plan is11544, plus192 large and all original manual/state/font/collapsed/reduced-motion obligations. The existing9888 plan is preserved unchanged. Mapping is a commitment to run on the same exact final source/fixture identity, never cross-SHA acceptance inheritance. No mapped cell has run on final review.
