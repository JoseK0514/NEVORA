# PR36 development merge custody

Jose authorized finishing CI and merging PR36 into development on October 27, 2026. Production is explicitly excluded.

The appearance implementation at `32ce3b5c69234cd0d1bb5bb8f0f8f1eda8ee7ffd` passed all 12 hosted CI jobs in run `40455123994`. The protected Preview at https://fuel-scheduler-rfwif57au-josekarlo-5933s-projects.vercel.app/welcome passed 19 hosted appearance checks across Chromium, WebKit and Firefox. Explicit preferences remain available; the default is Light. The working tree was clean when merge preparation started.

The required live source inventory subsequently reported stale held heads, the new PR36 branch, and seven active branches against the existing six-branch ceiling. Reconciliation preserves the ceiling and checker:

- Development is `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`, including merged PR35.
- PR33 remains held at `341680bbbc3620a7f357309464961dfa845c1b64`: its head merged PR35/development; its separate Home feature stays excluded.
- PR34 remains held at `5b82c3cb4836ba61415cef1d6f3cd918c019a385`: it merged PR35/development, then changed Refresh rendering during private-access checks. This and its other separate application work stay excluded.
- The already-merged PR35 head `574a90c9d6add697fb23298e24c1e1c981c365c8` was verified as an ancestor of development and archived at `refs/tags/archive/branches/2026-10-27/codex/mobile-access-onboarding-20261026` before removing its remote branch. Local branches and worktrees were preserved.
- PR36 is the current assembly branch. The inventory now has 61 classified sources and six active branches.

The inventory follow-up initially changed documentation only. Run 40502882568 then exposed a D2 test-driver race in WebKit: after the tracked RSC set briefly drained, a queued follow-up RSC began; the driver hard reload cancelled it and Next fell back to another same-address navigation, interrupting the driver navigation. The fix waits for observed RSC quiescence within the existing recovery deadline before the separate hard reload. It preserves that reload, every data/focus assertion, and strict runtime/console checks. Regression controls cover queued follow-up requests, requests completed between polls, and deadline failure. The same run exposed a Navigation test race at restored notification membership: enabled filter controls still belonged to the preceding empty snapshot. Restoration now correlates the actual refresh response, requires the exact expected own IDs, and waits for its rendered row count under one bounded deadline. Delayed-render and negative response/deadline controls cover this ordering. No application runtime, CSS, frozen mobile screen, authentication, permissions, migration or deployment configuration changes are added after the tested appearance commit. Hosted appearance evidence is reusable only after confirming that application-byte identity. The final new head requires its own successful CI before merge; an older green run does not substitute for it.

Merge conditions: verify the new exact head and all required checks, rerun the live source gate, confirm the remote development base, compare the final merge tree with the tested candidate, and leave main and production unchanged. Do not enable automatic deployment, promote a deployment, run migrations or mutate customer data. The existing verified Preview stays available; this task does not authorize production.

The final merge receipt and updated CI/provider metadata are recorded in the task's referenced `work/integration-evidence` handoff alongside `light-default-state-20261027.json`. This record does not independently close UI/QA audit findings or approve held work.
