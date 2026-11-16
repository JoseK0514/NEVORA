# Whole Phase D remaining driver, 10442eb

Reviewed scripts/phase-d-browser-qa.mjs from line 417 through teardown against current source. The previously reported focus check remains open in the separate subtitle report. Two additional concrete incompatibilities follow.

**HIGH — desktop published-week navigation, line 438.** The preceding viewport loop ends at 1440px. At this width src/app/app/employee-b-desktop.css:90 hides the Direction B days nav and line 27 hides the legacy sibling. Counting the visible nav links will return zero. The desktop rendering in src/components/employee-b/schedule-b.tsx:53–65 supplies seven columns in the visible .eb-wkc week card. For this published-empty week each column has one a.eb-wsh--off. Assert the seven visible primary links, seven distinct exact week/day destinations, and absence of assigned-shift links. src/components/employee-schedule-corp.tsx:104,187–190 constructs those dates and URLs. Retain the published-empty text, private draft exclusion and separate unavailable-state assertions.

**HIGH — successful password-reset wording, lines 539 and 543.** Both successful reset paths wait for retired “Password reset. All portal sessions” text. src/components/account-recovery.tsx:45 now sets “Password reset. You’re signed out on every device. Sign in with your new password.” src/components/recovery-reset.tsx:42–46 renders it inside a success status with the real sign-in link. Use that exact current success text in both paths. Preserve previous-session invalidation, one-use/expired proof refusals, identical known/unknown responses, real sign-in and expiry checks.

CRITICAL, MEDIUM and LOW each have zero additional findings. The programming and remove-ai-slops perspectives identified both mismatches as assertions against retired markup/copy. Code quality BLOCK. Recommendation REQUEST_CHANGES. No additional blockers found in the current ID/PIN and receipt UI contracts. No browser tests were run. This is source review only.

## Follow-up at c1b5fbd64

Verified the seven desktop off-day links against all seven expected calendar dates and the absence of assigned links. Both reset paths now check the exact current success copy while retaining the original session, sign-in, ledger and expiry controls. The desktop focus check now scopes the employee opener to its visible tr#timecard-D3-E and accepts focus inside that row, including the fragment target itself. This closes the earlier subtitle report's HIGH finding as well.

The driver scrolls the real first primary link into view and retains the 44px gate. It records the actual engine, width, bounding dimensions and all nine hit-test points before the assertion. These samples can distinguish actual pointer ownership from visual size; the earlier failure alone does not settle that result. No browser run was started for this review. Final status CLEAR. Recommendation APPROVE. No blockers.
