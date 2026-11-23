# Checks blocked by limits — for the solo re-run agent

Collected from each agent's "not checked" list. The solo agent runs ALONE on a fresh app (no parallel agents), so
load, shared-login lockout and slot queueing no longer apply. Items marked (needs data change) may save on the fresh
throwaway database.

## From Agent 1 (visual design)
- [ ] Owner 390 baseline renders (Home, Schedule, Payroll, person page, Rondo) — only failure states rendered under load.
- [ ] Schedule day timeline (`/app/schedule?week=…&day=…`) at 1440 and 390 — failed 3x ("Couldn't check your access" /
      "Schedule unavailable"). Confirm A1-23 is load or a real defect.
- [ ] Re-check A1-10 (Home headline stuck on "Checking today…" after a failed read) and A1-24 (Rondo phone failure
      card) — are they reachable without load? If yes, still findings; if only under failure, judge the failure state design.
- [ ] Success mark (BDoneMark) and confirm blocks in context (needs data change: approve a request, a timecard batch).
- [ ] Manager Rondo — flag `managerAdvisor` off on the live app; check whether a flag exists to enable it in the harness.
- [ ] WebKit render of the six areas; reduced motion; 200% text (overlap with Agent 4 — skip items Agent 4 covered).

## From Agent 5 (product research)
- [ ] Real time-to-answer measurements for jobs 1–4 on an unloaded app (1440 + 390 touch) to replace the modelled times.
- [ ] Manager Find cover at 390 (failed under load) — step count.
- [ ] Employee Home off-shift "Next shift" card (source-only so far) — render it (needs an employee not on shift).
- [ ] Timecards step 2 "Finalize" path via Select + action menu (live click did not run).

## From Agent 2 (responsive/motion)
- [ ] A2-01 (P1) idle access re-check drops Owner content to Loading → "Couldn't check your access": re-verify on an
      UNLOADED app, and if possible a production build (`next build` + `next start`) with throttled phone latency, to
      separate a real resilience defect from dev/load slowness. Idle-watch Schedule, Timecards, Team for 90 s each.
- [ ] A2-02 / A2-03 / A2-04 CLS and Next-week timings — re-measure unloaded (and production build if available).
- [ ] Clocker kiosk in the iOS Simulator (needs a tablet enrolled with an Owner one-time code) and Clocker reduced motion.
- [ ] iPad simulator (skip if another session is using it — check first, never take over its device).
- [ ] Touch context at 900 and 1440; full matrix spot check in WebKit (Home, Schedule, Timecards, Employee Home).
- [ ] Owner "More" sheet and Employee account menu (selectors missed them) — open, scroll, dismiss at 390.

## From Agent 3 (workflows)
- [ ] Re-verify the load-coupled P1s on an UNLOADED app: A3-04 (in-flight save dropped by the access re-check) and
      A3-07 (payroll capabilities read locks the workspace — measure lock waits with one user; does it still time out?).
      A3-01/A3-02/A3-03 were reproduced with forced lost/delayed replies, so they are not load artefacts; one confirming
      run each is enough.
- [ ] Company-wide Manager (Elena): add/edit shift, publish, time off approval, timecards — not run.
- [ ] Location Manager publish with a lost reply (blocked by A3-05 — record as blocked if still so).
- [ ] Clocker: a punch that SAVED but whose reply was lost (route-drop the clock-out response after the server ran it),
      then count punches in the DB — does "Send it again" double it?
- [ ] Rondo (b) "action awaiting approval" and (c) "saved change" rendered in a browser: build a week where every
      location is a draft (fresh app, Owner un-publishes nothing — choose a future week with only draft shifts) so
      "Review draft changes" appears; tick, save draft, see the receipt. Fictional data only, no provider.
- [ ] Invite → activation of the invited person (local activation link path the harness uses, no real mail).
- [ ] Workflows on mobile (390 touch) and WebKit for Add shift, time off approval and Employee time off request.

## From Agent 4 (accessibility/bilingual)
- [ ] Re-scan (axe + keyboard) Owner person page and Owner Timecards — scanned while in a load-error state.
- [ ] Keyboard walk of the Owner Timecards inspector and the Payroll run review page (selectors/load failed).
- [ ] Success toast / result announcement after a real save (role=status / live region; needs data change — do it on
      the fresh throwaway app: approve one request, check what is announced and where focus lands).
- [ ] Unmerged Spanish branch 425bdbf85 live with `NEVORA_SPANISH_PREVIEW=1` — only if the harness can pass the env
      var into the app (check `createOwnedNextApp` options); label everything "unmerged branch 425bdbf85". Specifically
      re-run A4-01 (Employee Home 200% text) on that branch to see whether its fix resolves it.
- [ ] Not doable on this Mac by an agent (stay as human checks): VoiceOver, TalkBack, NVDA, real-device Larger Text,
      Windows High Contrast, Voice Control.

## Environment fixes for the solo run
- Fresh held app on the review tip (Agent 3's mutations discarded), only one capture slot in use.
- One saved session per role (Playwright storageState), sign in once per role to stay under 10 attempts / ID / 15 min.
- Nothing else running: stop Agent 2's own hold (`cap/qa-a2-hold`) and the old live app first.
