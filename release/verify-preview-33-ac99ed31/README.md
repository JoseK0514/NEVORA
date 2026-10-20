# Merge and named-ID rechecks — ac99ed31

Pinned coordinator commit **4f666237** is merged without conflicts into **codex/verify-preview-33**, including the four approved candidate-only fixes. The pushed head is **ac99ed311a4ef07b61175fa9f926c0862121a1e5**. All four ports have the same stable patch IDs as the approved commits. [Lineage, port mapping and gates](merge-and-gates.json).

Local code gates pass: locked install, typecheck, lint, **7,364 tests / 0 failures** (801 skipped, 55 pending), production build and development-marker absence across 2,325 artifacts. [Gate receipts](gates/). CI validate also passes, but the aggregate remains blocked by two browser jobs; two PostgreSQL jobs were still running at the last observation. [CI custody and follow-ups](ci.json).

**The five full exits remain open.** This packet completes the requested named-ID rechecks and bounded regressions. It does not replace the complete matrices, historical-ID ledgers, all states, large-data checks or real-device gates.

## Findings returned by owner

| Owner | Finding / current result | Handoff |
| --- | --- | --- |
| Phase 3 / coordinator | **TC-P3-09, retained P2:** Availability context range still splits `Nov 1` at 390px / 200% in both engines. The Last updated line is fixed. | [Phase 3](owners/phase-3.md) |
| Wave A | **TC-WA-3, retained P2:** shared ShiftBlock on Manager Shift requests still starts a line with `· 8h` at 390px / 200% in both engines. Add shift, Coverage and genuine replacement summaries pass. | [Wave A](owners/wave-a.md) |
| Desktop | **TC-P4-25, new P2:** Availability's context label and explanation remain 12px at desktop width, below the 14px floor, and do not scale at 200%. | [Desktop](owners/desktop.md) |
| Wave B | Company Save height and pending contrast pass; no additional finding confirmed in this bounded scope. | [Wave B](owners/wave-b.md) |
| Wave C | Settings hub, Company profile and Branding pass the bounded baseline; no additional finding confirmed in this scope. | [Wave C](owners/wave-c.md) |
| Codex CI / Phase 3 coordinator | Home exact-text label mismatch; Attendance stale-label assertion remains unresolved in CI. These are separate gate follow-ups, not additional counted UI defects. | [CI follow-ups](ci.md) |

## Requested IDs

| ID | Fresh checked result |
| --- | --- |
| IS-WA-12 | Exact names pass on Employee details, Owner New employee and Employee More details. Actual Status help remains a description. |
| IS-P4-11 | Four complete Owner/Manager Inbox → review → Inbox round trips retain the filter and selected item. |
| TC-P3-09 | **Partly fixed:** Last updated passes; context week range remains open. |
| TC-P3-32 | Zero split date/time atoms in eight Home observations: Employee/Lead, 320/390, 200%, both engines. |
| TC-P3-34 | Notifications deliberately wraps `Notifi-` / `cations`; no title overflow in checked cells. |
| AL-47 | Both selected controls stay visible after text reflow and eight portrait/landscape/width changes. |
| P3-ST-01 | Chromium compact card 155 → 155px, CLS 0.000567 for both payroll actors. WebKit 154.5 → 154.5px; its CLS observer is unsupported. |
| AL-WA-10 / approved 0caadb35 | 24 genuine replacement geometry samples meet the recorded 16px phone gutter / 720px desktop reading-width criteria. |
| TC-WA-16 / approved 2ddb833f | Four painted pending transitions retain minimum text contrast 5.13895:1. |
| ST-RC-PAYROLL-SAVE-01 / approved e7ee28a2 | Company Save remains 88 → 88px at 320/390 and 200%, both engines; double Enter sends one intercepted request. |
| TC-WA-3 / approved 08159520 | Three rendered sites pass; the shared Manager ShiftBlock retains the defect. |

These are source-bound criterion results, not blanket independent closure of each finding's broader historical scope.

## Automated and judgment evidence

The unchanged `checks.mjs` ran with axe in Chromium and WebKit:

- Phase 3 named routes: **44/48 pass**; four observations represent the one Desktop text-floor finding.
- Genuine eligible replacement: **24/24 pass**; actor-bound review query values are withheld from public derivatives, with original hashes retained.
- Owner regressions across Insights, Rules, Settings, Company profile, Branding and Inbox: **72/72 pass**.
- Combined: **140/144 pass**. This is a bounded matrix at 100/200%, not the complete exit matrix.

Judgment evidence includes [initial named observations](evidence/named-rechecks.json), [corrected probes, 16/16](evidence/corrected-named-rechecks.json), [replacement geometry](evidence/replacement-qualified.json), [resize and desktop measurements](evidence/supplementary.json), and [Coverage/shared ShiftBlock](evidence/coverage-separators.json). The latter initially labels the first manager block a callout; the actual first match is the visible pending **swap** block shown in the crop. The measured shared component and retained TC-WA-3 finding are the same; no callout-specific claim is made.

Initial harness gaps are retained: a nonexistent Access role hint; a payroll button locator whose accessible name changes while pending; a duplicated Shift summary label; and a callout summary that uses a different component from ShiftBlock. Corrected probes keep the intended criteria and identify the actual rendered elements. The initial desktop band-edge assertion was outside AL-WA-10's published reading-width criterion; the retained boxes satisfy the 720px criterion. These are not product failures and are not added to severity counts.

Fresh fixtures were initialized before listen on two owned loopback PostgreSQL 17.11 databases. All action requests during inspection were intercepted; no inspection save reached the server. [Both previews closed with source/mirror verified and PostgreSQL stopped](closure.json). Source and derived harnesses are preserved under [executed-scripts](executed-scripts/); original application source stayed clean.

Engineering: the requested merge is complete and passes local code validation. Program delivery: all five full exits remain open. Governance/release impact: **BLOCKER** while UI findings and mandatory CI browser gates remain open. The next gate belongs to the named owners and the CI owner; no new Jose decision is required for those handoffs.

## Concurrent source-owner follow-ups

While this packet was publishing, the inspection branch advanced with separate release-candidate work. That handoff is preserved. Candidate `0f0cd372` already includes `560f2e8e` for the Availability date wrapper and `0f0cd372` for the shared ShiftBlock carrier; their fresh proof is still pending there. These are existing owner repairs for the retained IDs, not additional fixes applied to this pinned target. See [the separate RC packet](../preview-integration-33/candidate-0f0cd37/README.md).
