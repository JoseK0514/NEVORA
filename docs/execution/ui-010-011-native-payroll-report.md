# UI-010 / UI-011 native payroll UI continuation

Status: implemented and verified against frozen Finance core420; fresh whole-branch review approved without blockers. This is a UI integration candidate, not independent statutory/privacy acceptance, deployment, or production readiness. The original public preview remains unchanged.

## Source and ownership

- Branch: `codex/nevora-native-payroll-ui-20261012` in `ui-native-payroll`.
- Verified code: `5bf85503ebb792877d41208465bcd98e16775d9a`.
- UI-only base: `2360b6012432d776460e7067a32ca06905374f8f` (exact root assembly `bfa3d853e2028e673dff02e89d155d4fac044c43` plus completed UI017).
- Frozen Finance interface: `420daae98ce039cbade7ca2641a141c580243ee8`; manifest SHA256 `591a0d7c19268bd94d17bc612f46405a6262945c7d21be43c0a238399ab05592`. All29 committed source files still match.
- Changes: payroll client response validation, review/operation presentation, existing preference copy, My pay and scoped portal document presentation, payroll styles and UI tests. No backend/types/migrations/packages, calculations, permissions, immutable ledger, PDF generation or publication changes.
- Earlier initial, UI015 and UI017 candidates/evidence remain preserved. No push, merge, release or real sends. The next UI016 interface899 is READY in the separate queue; it has not been blended into these tests.

## Resolution and workflow coverage

| Area | Delivered behavior | Evidence |
| --- | --- | --- |
| Native contract | Accept native capabilities; preserve blocked nulls and actual ready details; reject malformed consumed payloads | Decoder RED6/GREEN12;158 affected tests |
| Prepare / prerequisites | Recorded-time source, understandable missing wage/tax/YTD/timecard guidance; no invented money or native provider import | Real blocked draft in both engines; coverage-guidance RED1/GREEN9 |
| Review | Saved regular/OT/unpaid time, wage earnings, tax bases/results, deductions, net pay, YTD and source details | Real finalized40h fixture; expanded review screenshots; static render tests |
| Approval / publication | Human review of exact opaque token and revision; approval separate from PDFs and automatic publication; no native bank/payment controls | Both real workers, stored manifest/publication and UI states with legacy publish=false |
| Retry / stale state | Interrupted successful recalculation retries identical operation/body once; changed facts reject approval with no ledger; fresh recalculation required | Both engines; no duplicate revision and no stale approval |
| Correction | Confirmed receipt opens the separately reviewed replacement; original approvals/documents remain | Browser RED at1ca6b3a3→GREEN at13336388 and frozen5bf85503; identical original stored hashes/bytes and one current ledger head |
| My pay / portal | Separate protected inline View and attachment Download; published own history and authorized finite-scope portal history | Own Employee, Owner and Manager returned identical stored PDF bytes; current foreign/revoked/deactivated access denied |
| Access / feedback | Loading, offline and failed reads clear private display; confirmed write feedback stays distinct from an uncertain write | Both engines; no duplicate-action invitation after confirmed writes |
| Existing preferences | Native source/automatic-publication explanation; preserve hidden historical provider/bank/rule/publication values; retain pre-adoption provider settings | Source-aware save with exact preserved values and820px screenshots; RED2/GREEN3; Owner-only data freshness gate |
| Branding / responsive | Approved Inter, Phosphor, palette and layout retained; six widths on My pay and payroll, same controls and readable document actions |72 role/screen-width surfaces +6 native settings/blocked/ready surfaces, axe and no overflow |

Manager-scope authoring, native private wage/tax/break/workweek/certificate/deduction/YTD configuration forms belong to the separately queued UI016. Existing legacy grant/rule/bank editors are hidden under native=true because they do not configure native access/calculation. Ordinary company/name/language/schedule/notice preferences remain usable.

## Verification

- Full frozen suite: **7906 passed**, **801 console-skipped**, **55 held**, exit0;428 passed/27 skipped files. Skipped and held cases are not certified.
- Affected payroll and notification UI/data tests: **158 passed**, exit0. Typecheck and scoped payroll ESLint: exit0, no diagnostics.
- Chromium and WebKit production HTTPS with unchanged secure cookies: **43/43 each**, **78 screenshots total**, all tested axe WCAG2A/AA/2.1AA/2.2AA rules and horizontal-overflow checks passed. Employee/Lead My pay and Owner/Manager My pay+payroll tested at320,390,768,820,1024,1440px. Native settings save/mode covered at820px in both engines.
- Keyboard approval uses Enter; private document focus progression uses Chromium Tab and Safari Option-Tab as documented by [Apple](https://support.apple.com/en-lamr/guide/safari/cpsh003/mac). No browser errors were suppressed.
- Both runs verified source/mirror custody and stopped their owned PostgreSQL cluster. Synthetic loopback data, normal service commands, only database transport substitution; all non-owned network origins aborted and real notice delivery disabled.
- Evidence: `native-ui-evidence/command-exits.json`, `browser-freeze.json`, `final-source-custody.json`, final-02 reports/screenshots/build/source manifests, and all RED/GREEN and failed-attempt logs. Fresh review approved bounded code quality, independently119 payroll tests and matching custody hashes.

## Preserved failed attempts and diagnosis

1. Initial fixture setup failed alias/server-only resolution; corrected only fixture-process loading.
2. Recalculation stayed genuinely BLOCKED because three zero-timecard sources lacked normal finalization. Fixed through non-self Owner/Manager APPROVE/FINALIZE and fresh population attestation; no guards bypassed, immutable data deleted, or amounts invented.
3. Coverage-01 showed the real correction-selection bug plus fixture errors: nested summary locator, reading undecorated snapshot documents, string instead of RegExp, and revocation before the current page read settled. Application fix is limited to receipt-based navigation; corrected fixture assertions retain their intended behavior.
4. WebKit's first corrected run caught two canceled RSC prefetches during immediate login→direct navigation; settling the actual login network removed them without application changes or filtering pageerrors. The next run's plain Tab-to-link assertion failed; the same focus assertion passes with the platform's documented Option-Tab shortcut.
5. Restricted full suite had40 failures in three existing subprocess runner files (`listen EPERM`/process access); the identical suite passed with required local process access. Both reports remain available.

## Remaining gates and limitations

The conditional fixture uses explicit fictional wage2500/hour,40h finalized punches, PR certificate/employer-exemption facts and attested zero opening balances. Its midnight workweek is **conditional**, not a lawful default or proof of statutory accuracy. It exercises UI transport/presentation and real local workflow guards; it is not independent calculator or privacy certification. Nonzero OT/unpaid-break/statutory boundary matrices remain Finance/independent QA responsibilities. The frozen source exposes the server-authoritative excluded zero row in its roster/count; the client does not recalculate or silently filter it.

The Finance420 activation NO-GO, employer-counter statutory issues, future workweek/profile increments and whole-assembly acceptance remain separate. UI016 has a new READY899 interface and will be implemented on a separate adopted-source continuation after this freeze. Physical devices, manual screen-reader assessment,200% zoom, independent combined application QA/UI/security, hosted worker/storage verification and release authorization are not completed by this handoff.

## Review and decisions

Fresh reviewer APPROVE/WATCH, no blockers. The raw report, disposition and exhaustive execution ledger are preserved at `native-ui-evidence/CODE_REVIEW.md`, `REVIEW_DISPOSITION.md`, `EXECUTION_LEDGER.md` and committed execution documents. One deferred Minor: bind a native employee lookup once instead of duplicated lookups/non-null assertion; the current stable render has no demonstrated defect. No mandatory fix pass or second review was needed.

### Rulings and costs

- keep approved Inter/Phosphor/current layout and restrained motion rather than gpt-taste random hero/font/AIDA instructions — Owner explicitly preserves existing application identity/workflow — cost: no decorative landing-page reinterpretation.
- preserve local source clones and original public preview — Owner withholds release authorization — cost: separate disk/integration increment.
- READY core permits bounded native UI integration, not native activation — frozen employer/workweek/daily/profile follow-ups and independent acceptance remain held — cost: conditional fixture cannot establish lawful defaults or customer readiness.
- consolidate real hook/lifecycle/operation browser verification into Task3 owned production fixture after shared statement UI is ready — same exact source/authority contracts and no hook weakening — cost: Task2 unit checkpoint is not full workflow acceptance until Task3 browser evidence.
- make existing company preferences source-aware and preserve hidden legacy fields; hide ineffective native legacy grants/rule/bank editors — native true otherwise misstates provider authority; UI016 profile and finite Manager-scope authoring remain DRAFT — cost: those setup workflows remain an explicit integration dependency, not invented here.
- UI016/profile authoring from later READY899 remains a separately queued continuation after this frozen420 candidate — the bounded native review/history spec does not invent those fields — cost if wrong: native configuration setup is pending that continuation.
- Employer/YTD counter correctness stays with frozen Finance and independent QA — the UI displays authoritative saved values and cannot fix statutory accounting — cost if wrong: native activation remains NO-GO until the responsible workstream is accepted.
- Legal workweek/default/notice and daily-boundary invariance remain separate gates — conditional midnight fixtures cannot establish legal policy or invariance — cost if wrong: real policy/device-boundary acceptance remains required.
- Statutory calculations and independent activation are not self-certified — fresh code approval is not statutory or release approval — cost if wrong: this candidate alone is not customer ready.
- Conditional fixture facts remain fictional — normal local actions verify transport and workflow, not customer payroll facts — cost if wrong: real authorized facts and independent accuracy tests are still needed.
- Live payment/remittance/notices remain excluded or unverified — no bank integration or real sends are authorized; delivery stays disabled — cost if wrong: no live settlement/remittance/notice-delivery claim.
- Physical devices, manual screen readers and200%zoom remain unverified — automated browser/axe coverage cannot substitute for these checks — cost if wrong: customer device/accessibility readiness remains open.
- Production credentials/data/deployment remain excluded — Owner approved isolated implementation without production release — cost if wrong: hosted execution and production state are not verified.
- Browser-artifact inspection is not independent UI/QA acceptance — the reviewer verified custody, not every visual/workflow certification — cost if wrong: whole-assembly independent acceptance remains required.
