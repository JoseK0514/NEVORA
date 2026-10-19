# Profile initial server read

Separate candidate commitc34043b changes only src/components/manager-profile/manager-profile.tsx. The authorized read runs beside getWorkspace/currentBrand, is parsed through the existing contract, and passes only a ready snapshot as initial. Rejected reads, parse errors and unavailable responses yield null. Client refresh/save/privacy handling is unchanged.

Locked install/TypeScript/lint pass. Full tests and merged browser checks run on this exact commit, including a wrapping fictional Manager email at320 and no management Profile read for Employee/Lead. The browser evidence is pending; no load-shift result is inferred from source changes. See [shared validation](../publish-c34043b/README.md).
