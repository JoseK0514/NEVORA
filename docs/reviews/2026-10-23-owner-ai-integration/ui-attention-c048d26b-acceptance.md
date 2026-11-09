# Independent UI acceptance — c048d26b

**UI recommendation: NO-GO. Readiness interaction verified locally; visual blocker remains.**

Independent execution: 12 actual-component/style fixture cells, then 8 actual-parent SSR cells, then 8 corrected complete-cascade actual-parent cells. All functional assertions passed; this is separate from visual acceptance. All runtimes closed, contexts/browsers/server awaited, no external requests, page/console/hydration errors, or source changes. Exact source at closure: c048d26b5bee0ba888ce1c66f3af253524ada0b7.

**VERIFIED:** held hydration shows status without command fields/control; release arms the listener and reveals original intent; native keyboard reaches visible focus; no autofocus/submission before activation; explicit fictional unavailable result retains operation; armed pagehide removes authority. Full Next/PostgreSQL was independently run by QA, not this UI reviewer. I personally inspected QA's actual Next Chromium320 review and WebKit1024 review screenshots as contextual evidence.

**BLOCKER — preparing copy collides/clips at large text.** Corrected actual EmployeeMySchedule server render, actual confirmation, root/app/schedule stylesheet cascade, relevant shell selectors, Chromium and WebKit, 320/390 width and200% root font: copy column computes0px; preparing action width310.84375px. At320 the text runs from x49.0039 to359.84375 beyond viewport and is clipped by shell; it also intersects the review text. At390 the text remains within viewport but overlaps review copy. This reproduces a candidate preparing-state defect. Historical32882297 ready baseline also has narrow large-text overlap; that does not excuse the new preparing-state failure.

**ISSUE — mobile preparing→ready reflow.** At320/100%, corrected cascade card changes178→158px, following document content moves up20px. Desktop1440/100% remains78px high. Earlier incomplete-cascade reports measured41px and360px document scrollWidth: those are preserved but superseded by the corrected measurements. The final shell clips overflow rather than increasing document scrollWidth; scrollWidth alone would miss the defect.

Evidence: ui-readiness-parent-full-cascade/ui-report.json and geometry-summary.json; webkit-320-200-preparing.png; webkit-320-100-preparing.png; matching ready/baseline screenshots; parent-ui-control.mjs/native-controls.js/baseline-confirmation.tsx and run.log. Source-faithful parent SSR is used; no live Next/PG in this fixture, no physical-device/screen-reader/OS text-setting claim.

Fidelity history: ui-readiness-acceptance reconstructs the review row; ui-readiness-parent imports actual parent but omitted nested route CSS (screen-reader text appeared). Final ui-readiness-parent-full-cascade corrects styles and class-substring mapping. Prior attempts are unchanged. Surrounding app shell is a scaffold; navigation/server reads are not certified by the fixture.

Source diagnosis supports a scoped wrap + consistent responsive action allocation: existing flex-wrap:nowrap and flex:none reserve the status's intrinsic width and squeeze the copy to zero. Height reservation alone cannot repair horizontal collision. Stable allocation across preparing/ready should remove reflow, with wrapping when the copy and action cannot coexist. No clipping, font shrink or fake button should be used to conceal it. This is a remediation direction, not closure.

Historical QA-AT01/QA-AT02 are separate; this local readiness control does not establish the cloud failure cause. A fresh source and independent visual closure are required.
