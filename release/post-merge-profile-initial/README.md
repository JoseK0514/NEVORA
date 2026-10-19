# Profile initial server read

Separate candidate commitc34043b changes only src/components/manager-profile/manager-profile.tsx. The authorized read runs beside getWorkspace/currentBrand, is parsed through the existing contract, and passes only a ready snapshot as initial. Rejected reads, parse errors and unavailable responses yield null. Client refresh/save/privacy handling is unchanged.

Locked install/TypeScript/lint pass. Full tests and merged browser checks run on this exact commit, including a wrapping fictional Manager email at320 and no management Profile read for Employee/Lead. The c34043b held-read probe passes8/8 cases at320/360, both roles/browsers:0px Sign out movement and Chromium CLS0.000547 at320. Its source is explicitly supplemental. The published equivalent initial-read commit is4ff37e5 at canonical8e18a95, covered by its own24 views/4 held saves and the recorded full application gates. See [shared validation](../publish-c34043b/README.md).
