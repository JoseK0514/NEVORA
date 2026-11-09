# Independent UI oversight

Date: 2026-10-30. Independent reviewer; no implementation fixes performed.
Candidate: `ecc247062363a8e5b93719ee0c3f26dae4710ae8` (detached).
Entire reviewed change: `1121f24e50190172d1fa40d931fd064715f31554..ecc247062363a8e5b93719ee0c3f26dae4710ae8`.
Independent evidence root: `/workspace/nevora-evidence/owner-ai-validation-20261030/independent-ecc24706`.

This is the bounded private Owner goals/tasks/context increment. The initial 32-case supplement describes additional future capabilities and is not the completed-scope acceptance list. Historical NOT_RUN submissions and the original R1 finding/recheck are preserved. Jose's subsequent authorization permits these isolated fictional tests; it does not authorize paid inference, provider/production changes, notifications, CI, shared integration or deployment.

**UI recommendation: NO-GO for local bounded acceptance at this candidate.** One reproduced Important interaction issue requires correction and independent recheck. No production/hosted acceptance is issued.

| Classification | Assessment and evidence |
| --- | --- |
| VERIFIED | Independent original notebook suite rerun: Chromium/WebKit, real login/Next/API/PostgreSQL, persistence, escaped text, selection, manual question preservation, close/reopen, real concurrent edit/conflict and private draft retirement. `browser-01/vitest.json`: one suite/test passed; report complete; no external requests/page errors. |
| VERIFIED | Six independently generated audits at 320/390/1440px: zero document overflow, zero notebook targets under 44px height, zero axe WCAG2A/AA/2.1AA violations. These are automated checks, not complete accessibility certification. |
| VERIFIED | Viewed actual supplied mobile/desktop full-page images and independent mobile/desktop viewport screenshots. Existing Owner tokens, readable labels and task state distinctions are retained. Viewport screenshots confirm real layout independently of stitched fixed-header artifacts. |
| VERIFIED | UI correctly states that closing records the Owner's choice and does not verify staffing/payroll resolution. Prepared options and unverified payroll readiness remain explicit. |
| ISSUE | **UI-R1 (Important/P2)**: Add/Edit only sets draft state; form below the entire task list is neither revealed nor focused. Reproduced ordinary Edit goal click with one goal/eight short tasks in both engines at 390×844 and 1440×844. Form top is 3352–3787px below viewport origin; focus falls to BODY, next Tab goes to task summary. Source `src/components/owner-advisor/notebook-panel.tsx:42` and `:74`. |
| RISK | Existing automated fill() scrolls offscreen controls into view, so clean happy-path automation/axe did not cover discovery or sensible focus entry. |
| RISK | Browser host cache preflight skipped for the documented user-space native-library case. Actual engines/rendering ran. This is local development runtime evidence, not CI/hosted/mobile-device parity. |

Reproduction artifacts: `probes-01/probe.test.ts`, `ui-observations.json`, concise `ui-observations-summary.json`, all `*-after-edit-click.png` and `*-after-tab.png`. External probe JSON reports 2/2 passed because it tests both SQL safety and the expected defective behavior. It does not turn UI-R1 into a pass.

Required next gate: reveal and appropriately focus the editor on deliberate Add/Edit (or use adjacent placement), preserve draft/conflict/privacy behavior, and independently reproduce goal/task Add/Edit plus save/discard navigation with populated lists, keyboard and mobile/desktop viewport input. The implementation team may fix it; this reviewer has not done so and retains independent closure custody. No other new visual blocker identified within the inspected bounded feature.

Not judged: screen-reader announcements with actual assistive technology, touch-device keyboards, 200% zoom and every maximum-text combination; no claim that axe proves those behaviors. Model answer quality and future task/action monitoring are outside UI evidence here.
