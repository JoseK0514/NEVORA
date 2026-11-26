import { wholeSpanishTimes } from '@/lib/i18n/whole-spanish-times';
import { copy as approvedTimecardsOwn } from './timecards-own-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

export const copy = {
  en: {
    // src/components/timecards.tsx:49
    unknowntitleItMayAlreadyBeSaved: "{unknownTitle}. It may already be saved.",
    // src/components/timecards.tsx:62
    periodIsStillOpen: "Period is still open",
    // src/components/timecards.tsx:62
    noClockOutYet: "No clock-out yet",
    // src/components/timecards.tsx:62
    openBreak: "Open break",
    // src/components/timecards.tsx:62
    correctionAwaitingReview: "Correction awaiting review",
    // src/components/timecards.tsx:62
    overlappingRecordedTime: "Overlapping recorded time",
    // src/components/timecards.tsx:72
    timesInTimeZoneHoursIncludeBreaksShownSeparatelyTheseAren: "Times in {timeZone}. Hours include breaks, shown separately. These aren’t payroll hours.",
    // src/components/timecards.tsx:75
    missingTimeAdjustment: "Missing-time adjustment",
    // src/components/timecards.tsx:75
    correctedEntry: "Corrected entry",
    // src/components/timecards.tsx:75
    recordedPunch: "Recorded punch",
    // src/components/timecards.tsx:76
    effectiveTime: "Effective time",
    // src/components/timecards.tsx:76
    startatInProgress: "{startAt} → In progress",
    // src/components/timecards.tsx:77
    originalPunches: "Original punches",
    // src/components/timecards.tsx:77
    rawstartatNoClockOut: "{rawStartAt} → No clock out",
    // src/components/timecards.tsx:77
    noDeviceCapturedPunches: "No device-captured punches",
    // src/components/timecards.tsx:78
    corrected: " · Corrected",
    // src/components/timecards.tsx:79
    originalRawStartAtRawEndAt: "Original: {rawStartAt} → {rawEndAt}",
    // src/components/timecards.tsx:79
    originalRawStartAtInProgress: "Original: {rawStartAt} → In progress",
    // src/components/timecards.tsx:81
    noHoursRecordedInThisPeriod: "No hours recorded in this period.",
    // src/components/timecards.tsx:82
    correctionsCorrectionsCount: "Corrections ({correctionsCount})",
    // src/components/timecards.tsx:83
    waiting: "Waiting",
    // src/components/timecards.tsx:83
    approved: "Approved",
    // src/components/timecards.tsx:83
    rejected: "Rejected",
    // src/components/timecards.tsx:97
    inProgress: "In progress",
    // src/components/timecards.tsx:104
    anotherManagerApprovesYourOwnTimecard: "Another manager approves your own timecard.",
    // src/components/timecards.tsx:104
    resolveOpenTimeOverlapsAndPendingCorrectionsBeforeApproval: "Resolve open time, overlaps and pending corrections before approval.",
    // src/components/timecards.tsx:104
    approveTheLatestVersionOfThisTimecardBeforeFinalizing: "Approve the latest version of this timecard before finalizing.",
    // src/components/timecards.tsx:104
    refreshThePeriodAndChooseAnActionForItsCurrent: "Refresh the period and choose an action for its current state.",
    // src/components/timecards.tsx:104
    thisPeriodOverlapsFinalizedTimeReopenThatPeriodFirst: "This period overlaps finalized time. Reopen that period first.",
    // src/components/timecards.tsx:104
    payrollForThisPeriodIsApprovedStartAPayrollCorrection: "Payroll for this period is approved. Start a payroll correction for it first, then reopen.",
    // src/components/timecards.tsx:105
    thisPeriodChangedRefreshAndReviewTheLatestTimeBefore: "This period changed. Refresh and review the latest time before acting.",
    // src/components/timecards.tsx:107
    theActionCouldNotBeCompletedRefreshYourCurrentSession: "The action could not be completed. Refresh your current session and try again.",
    // src/components/timecards.tsx:108
    timecardApproved: "Timecard approved.",
    // src/components/timecards.tsx:108
    timecardFinalized: "Timecard finalized.",
    // src/components/timecards.tsx:108
    periodReopenedEarlierVersionsAreKeptInTheHistory: "Period reopened. Earlier versions are kept in the history.",
    // src/components/timecards.tsx:125
    noClockOut: "No clock-out",
    // src/components/timecards.tsx:125
    correction: "Correction",
    // src/components/timecards.tsx:128
    missingClockOut: "Missing clock-out",
    // src/components/timecards.tsx:128
    checkBreaks: "Check breaks",
    // src/components/timecards.tsx:128
    correctionWaiting: "Correction waiting",
    // src/components/timecards.tsx:134
    finalized: "Finalized",
    // src/components/timecards.tsx:138
    onBreakNow: "On break now",
    // src/components/timecards.tsx:138
    clockedInNow: "Clocked in now",
    // src/components/timecards.tsx:140
    readyToFinalize: "Ready to finalize",
    // src/components/timecards.tsx:141
    readyToApprove: "Ready to approve",
    // src/components/timecards.tsx:142
    noTimeYet: "No time yet",
    // src/components/timecards.tsx:176
    signIn: "Sign in",
    // src/components/timecards.tsx:176
    tryAgain: "Try again",
    // src/components/timecards.tsx:222
    theseTimecardsAreOutOfDateRefreshToSeeThe: "These timecards are out of date. Refresh to see the latest.",
    // src/components/timecards.tsx:229
    checkingPeriodTimecards: "Checking period timecards…",
    // src/components/timecards.tsx:234
    timecardsUnavailableTryRefreshing: "Timecards unavailable. Try refreshing.",
    // src/components/timecards.tsx:242
    yourSessionEndedSignInAgainToViewYourTimecards: "Your session ended. Sign in again to view your timecards.",
    // src/components/timecards.tsx:242
    yourAccessChangedSignInAgainToCheckYourTimecards: "Your access changed. Sign in again to check your timecards.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisWeekOne: "{cardsCount} timecard this week.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisPeriodOne: "{cardsCount} timecard this period.",
    // src/components/timecards.tsx:254
    cardscountTimecardInThisPeriodOne: "{cardsCount} timecard in this period.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisWeekOther: "{cardsCount} timecards this week.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisPeriodOther: "{cardsCount} timecards this period.",
    // src/components/timecards.tsx:254
    cardscountTimecardInThisPeriodOther: "{cardsCount} timecards in this period.",
    // src/components/timecards.tsx:255
    couldnTLoadTimecardsCheckYourConnectionThenTryAgain: "Couldn’t load timecards. Check your connection, then try again.",
    // src/components/timecards.tsx:255
    youReOfflineReconnectToSeeTimecards: "You’re offline. Reconnect to see timecards.",
    // src/components/timecards.tsx:261
    timecardsPausedReturnToThisWindowToCheckTheCurrent: "Timecards paused. Return to this window to check the current period.",
    // src/components/timecards.tsx:282
    chooseAValidPeriod: "Choose a valid period",
    // src/components/timecards.tsx:291
    saving: "Saving…",
    // src/components/timecards.tsx:297
    yourSessionEndedSignInAgainBeforeReviewingTimecards: "Your session ended. Sign in again before reviewing timecards.",
    // src/components/timecards.tsx:297
    yourAccessChangedSignInAgainBeforeReviewingTimecards: "Your access changed. Sign in again before reviewing timecards.",
    // src/components/timecards.tsx:310
    this: "This",
    // src/components/timecards.tsx:322
    refreshAndReviewTheSelectedTimecards: "Refresh and review the selected timecards.",
    // src/components/timecards.tsx:328
    someTimecardsChangedRefreshAndCheckThemAgain: "Some timecards changed. Refresh and check them again.",
    // src/components/timecards.tsx:329
    savingReviewedTimecardsOneAtATime: "Saving reviewed timecards one at a time…",
    // src/components/timecards.tsx:337
    signInAgainBeforeReviewingTimecards: "Sign in again before reviewing timecards.",
    // src/components/timecards.tsx:342
    eachTimecardShowsItsOwnResult: "Each timecard shows its own result.",
    // src/components/timecards.tsx:346
    signInToSeeTimecards: "Sign in to see timecards",
    // src/components/timecards.tsx:346
    couldnTLoadTimecards: "Couldn’t load timecards",
    // src/components/timecards.tsx:346
    couldnTLoadYourTimecard: "Couldn’t load your timecard",
    // src/components/timecards.tsx:347
    youReOffline: "You’re offline",
    // src/components/timecards.tsx:347
    timecardsPaused: "Timecards paused",
    // src/components/timecards.tsx:347
    timecardsArenTShowing: "Timecards aren’t showing",
    // src/components/timecards.tsx:448
    thisWeek: "This week",
    // src/components/timecards.tsx:448
    lastWeek: "Last week",
    // src/components/timecards.tsx:483
    you: "You",
    // src/components/timecards.tsx:520
    approveEachTimecardThenFinalizeTheWeekToLockIt: "Approve each timecard, then finalize the week to lock it for payroll.",
    // src/components/timecards.tsx:520
    approveEachTimecardThenFinalizeThePeriodToLockIt: "Approve each timecard, then finalize the period to lock it for payroll.",
    // src/components/timecards.tsx:546
    finalizeAfterTheWaitingCorrectionIsReviewed: "Finalize after the waiting correction is reviewed.",
    // src/components/timecards.tsx:546
    finalizeAfterTheOpenTimeIsClosed: "Finalize after the open time is closed.",
    // src/components/timecards.tsx:546
    finalizeAfterTheOverlappingTimeIsFixed: "Finalize after the overlapping time is fixed.",
    // src/components/timecards.tsx:546
    finalizeAfterTheIssuesAboveAreResolved: "Finalize after the issues above are resolved.",
    // src/components/timecards.tsx:546
    approveAfterTheWaitingCorrectionIsReviewed: "Approve after the waiting correction is reviewed.",
    // src/components/timecards.tsx:546
    approveAfterTheOpenTimeIsClosed: "Approve after the open time is closed.",
    // src/components/timecards.tsx:546
    approveAfterTheOverlappingTimeIsFixed: "Approve after the overlapping time is fixed.",
    // src/components/timecards.tsx:546
    approveAfterTheIssuesAboveAreResolved: "Approve after the issues above are resolved.",
    // src/components/timecards.tsx:551
    requestTimeCorrection: "Request time correction",
    // src/components/timecards.tsx:556
    timecard: "Timecard",
    // src/components/timecards.tsx:557
    done: "Done",
    // src/components/timecards.tsx:572
    thisWeekIsnTOverHoursCanStillChange: "This week isn’t over. Hours can still change.",
    // src/components/timecards.tsx:572
    thisPeriodIsnTOverHoursCanStillChange: "This period isn’t over. Hours can still change.",
    // src/components/timecards.tsx:572
    thisWeekIsnTOverHoursCanStillChangeYou: "This week isn’t over. Hours can still change. You can approve from {approvalDate}.",
    // src/components/timecards.tsx:572
    thisPeriodIsnTOverHoursCanStillChangeYou: "This period isn’t over. Hours can still change. You can approve from {approvalDate}.",
    // src/components/timecards.tsx:576
    needsAttention: "Needs attention",
    // src/components/timecards.tsx:581
    days: "Days",
    // src/components/timecards.tsx:582
    daysWithRecordedTime: "Days with recorded time",
    // src/components/timecards.tsx:586
    noHoursThisWeek: "No hours this week",
    // src/components/timecards.tsx:586
    noHoursThisPeriod: "No hours this period",
    // src/components/timecards.tsx:587
    clockInsAndFixes: "Clock-ins and fixes",
    // src/components/timecards.tsx:625
    approveWithNoHours: "Approve with no hours",
    // src/components/timecards.tsx:625
    approveTimecard: "Approve timecard",
    // src/components/timecards.tsx:627
    reopened: "Reopened",
    // src/components/timecards.tsx:647
    aDifferentManagerMustReview: "A different manager must review",
    // src/components/timecards.tsx:647
    resolveTimecardIssuesFirst: "Resolve timecard issues first",
    // src/components/timecards.tsx:655
    select: "Select",
    // src/components/timecards.tsx:667
    eachTimecard: "Each timecard",
    // src/components/timecards.tsx:668
    selectedTimecardReview: "Selected timecard review",
    // src/components/timecards.tsx:678
    timecardsInThisSet: "Timecards in this set",
    // src/components/timecards.tsx:687
    selectedcountSelected: "{selectedCount} selected",
    // src/components/timecards.tsx:690
    selectedAction: "Selected action",
    // src/components/timecards.tsx:690
    approveSelected: "Approve selected",
    // src/components/timecards.tsx:690
    finalizeSelected: "Finalize selected",
    // src/components/timecards.tsx:692
    refreshTimecards: "Refresh timecards",
    // src/components/timecards.tsx:692
    refresh: "Refresh",
    // src/components/timecards.tsx:693
    reviewSelectedTimecards: "Review selected timecards",
    // src/components/timecards.tsx:701
    week: "Week",
    // src/components/timecards.tsx:705
    earlierPeriodShowTheWeekBefore: "Earlier: {period}. Show the week before",
    // src/components/timecards.tsx:705
    earlierWeeks: "Earlier weeks",
    // src/components/timecards.tsx:705
    earlier: "Earlier",
    // src/components/timecards.tsx:716
    needsReview: "Needs review",
    // src/components/timecards.tsx:725
    allCardsCountFinalized: "All {cardsCount} finalized",
    // src/components/timecards.tsx:725
    allCardsCountApproved: "All {cardsCount} approved",
    // src/components/timecards.tsx:725
    approvedcountOfCardsCountApproved: "{approvedCount} of {cardsCount} approved",
    // src/components/timecards.tsx:725
    youCanApproveFromPeriod: "You can approve from {period}",
    // src/components/timecards.tsx:725
    notApprovedYet: "Not approved yet",
    // src/components/timecards.tsx:739
    periodOverview: "Period overview",
    // src/components/timecards.tsx:742
    approveEligibleCountReadyTimecards: "Approve {eligibleCount} ready timecards",
    // src/components/timecards.tsx:744
    youCanApproveTheRestFromPeriod: "You can approve the rest from {period}",
    // src/components/timecards.tsx:744
    recordedtotalSoFar: " · {recordedTotal} so far",
    // src/components/timecards.tsx:745
    recordedtotalRecordedSoFar: "{recordedTotal} recorded so far",
    // src/components/timecards.tsx:746
    eligiblecountReady: "{eligibleCount} ready",
    // src/components/timecards.tsx:746
    noTimeRecorded: " · no time recorded",
    // src/components/timecards.tsx:746
    notimereadyWithNoTime: " · {noTimeReady} with no time",
    // src/components/timecards.tsx:746
    attentionCountOne: " · {attention} needs attention",
    // src/components/timecards.tsx:746
    attentionCountOther: " · {attention} need attention",
    // src/components/timecards.tsx:746
    recordedtotalRecorded: " · {recordedTotal} recorded",
    // src/components/timecards.tsx:749
    awaitingapprovalToApproveAwaitingFinalizationToFinalize: "{awaitingApproval} to approve · {awaitingFinalization} to finalize",
    // src/components/timecards.tsx:757
    everyTimecardForPeriodIsFinalized: "Every timecard for {period} is finalized.",
    // src/components/timecards.tsx:758
    preparePayroll: "Prepare payroll",
    // src/components/timecards.tsx:759
    allDoneYourOwnerRunsPayroll: "All done. Your Owner runs payroll.",
    // src/components/timecards.tsx:760
    downloadHoursForPayroll: "Download hours for payroll",
    // src/components/timecards.tsx:761
    nextStep: "Next step",
    // src/components/timecards.tsx:767
    checkYourConnectionThenTryAgain: "Check your connection, then try again.",
    // src/components/timecards.tsx:770
    timecards: "Timecards",
    // src/components/timecards.tsx:770
    noTimecardsThisWeek: "No timecards this week",
    // src/components/timecards.tsx:770
    noOneHasATimecardInThisPeriod: "No one has a timecard in this period.",
    // src/components/timecards.tsx:774
    downloadApprovedHours: "Download approved hours",
    // src/components/timecards.tsx:775
    timeTools: "Time tools",
    // src/components/timecards.tsx:779
    timeExports: "Time exports",
    // src/components/timecards.tsx:781
    timeCorrections: "Time corrections",
    // src/components/timecards.tsx:781
    fixesPeopleAskedFor: "Fixes people asked for",
    // src/components/timecards.tsx:798
    thisPeriod: "This period",
    // src/components/timecards.tsx:815
    eligiblecountTimecardToApproveOne: "{eligibleCount} timecard to approve",
    // src/components/timecards.tsx:815
    eligiblecountTimecardToApproveOther: "{eligibleCount} timecards to approve",
    // src/components/timecards.tsx:817
    review: "Review",
    // src/components/timecards.tsx:818
    approval: "Approval",
    // src/components/timecards.tsx:820
    team: "Team",
    // src/components/timecards.tsx:822
    timecardsThatNeedAttention: "Timecards that need attention",
    // src/components/timecards.tsx:822
    timecardsInThisPeriod: "Timecards in this period",
    // src/components/timecards.tsx:867
    selectAllEligibleTimecards: "Select all eligible timecards",
    // src/components/timecards.tsx:868
    selectAllEligible: "Select all eligible",
    // src/components/timecards.tsx:873
    selectName: "Select {name}",
    // src/components/timecards.tsx:903
    teamCardsCount: "Team ({cardsCount})",
    // src/components/timecards.tsx:941
    show: "Show",
    // src/components/timecards.tsx:944
    all: "All",
    // src/components/timecards.tsx:955
    person: "Person",
    // src/components/timecards.tsx:955
    role: "Role",
    // src/components/timecards.tsx:955
    recorded: "Recorded",
    // src/components/timecards.tsx:955
    breaks: "Breaks",
    // src/components/timecards.tsx:955
    status: "Status",
    // src/components/timecards.tsx:967
    none: "None",
    // src/components/timecards.tsx:972
    noRecordedTimecardsNeedReview: "No recorded timecards need review.",
    // src/components/timecards.tsx:972
    noApprovedTimecardsYet: "No approved timecards yet.",
    // src/components/timecards.tsx:974
    idlecountPersonWithNoTimeYetOne: "{idleCount} person with no time yet",
    // src/components/timecards.tsx:974
    idlecountPersonWithNoTimeYetOther: "{idleCount} people with no time yet",
    // src/components/timecards.tsx:979
    total: "Total",
    // src/components/timecards.tsx:1006
    chooseAPeriod: "Choose a period",
    // src/components/timecards.tsx:1007
    periodStart: "Period start",
    // src/components/timecards.tsx:1008
    periodEnd: "Period end",
    // src/components/timecards.tsx:1009
    viewPeriod: "View period",
    // src/components/timecards.tsx:1015
    yourTimecard: "Your timecard",
    // src/components/timecards.tsx:1016
    recordedTime: "Recorded time",
    // src/components/timecards.tsx:1016
    breakTime: "Break time",
    // src/components/timecards.tsx:1018
    openPeriodTotalsCanStillChangeUntilItCloses: "Open period. Totals can still change until it closes.",
    // src/components/timecards.tsx:1019
    reviewYourRecordedEntriesRequestCorrectionsInMyTime: "Review your recorded entries. Request corrections in My time.",
    // src/components/timecards.tsx:1020
    dailyPunches: "Daily punches",
    // src/components/timecards.tsx:1020
    closeDailyPunches: "Close daily punches",
    // src/components/timecards.tsx:1023
    historicalRevisionsHistoryCount: "Historical revisions ({historyCount})",
    // src/components/timecards.tsx:1024
    revisionRevisionApproved: "Revision {revision} · Approved",
    // src/components/timecards.tsx:1024
    revisionRevisionFinalized: "Revision {revision} · Finalized",
    // src/components/timecards.tsx:1024
    revisionRevisionReopened: "Revision {revision} · Reopened",
    // src/components/timecards.tsx:1031
    somethingWrong: "Something wrong?",
    // src/components/timecards.tsx:1032
    requestACorrection: "Request a correction",
    // src/components/timecards.tsx:1036
    managerTimecards: "Manager timecards",
    // src/components/timecards.tsx:1036
    yourPeriodTimecard: "Your period timecard",
    // src/components/timecards.tsx:1038
    pickTheDatesToReview: "Pick the dates to review",
    // src/components/timecards.tsx:1047
    needAttention: "Need attention",
    // src/components/timecards.tsx:1048
    requestACorrectionInMyTime: "Request a correction in My time →",
    // src/components/timecards.tsx:1048
    continueInMyTime: "Continue in My time",
    // src/components/timecards.tsx:1054
    timecardsNeedingAttentionAppearFirstResolveCorrectionsBeforeApprovalFinalize: "Timecards needing attention appear first. Resolve corrections before approval; finalize after the period ends.",
    // src/components/timecards.tsx:1055
    eligiblecountEligibleCardsCountExcludedSelectUpTo100CurrentTimecards: "{eligibleCount} eligible · {cardsCount} excluded · Select up to 100 current timecards below.",
    // src/components/timecards.tsx:1058
    reviewedApprovalSet: "Reviewed approval set",
    // src/components/timecards.tsx:1058
    reviewedFinalizationSet: "Reviewed finalization set",
    // src/components/timecards.tsx:1058
    startdateEndDateEachCardCommitsSeparatelyAStoppedSetLeaves: "{startDate} – {endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.",
    // src/components/timecards.tsx:1059
    employeenameRevisionExpectedRevision: "{employeeName} · Revision {expectedRevision}",
    // src/components/timecards.tsx:1060
    iReviewedThisExactSelectedSetAndItsRecordedTime: "I reviewed this exact selected set and its recorded time for approval.",
    // src/components/timecards.tsx:1060
    iReviewedThisExactSelectedSetAndItsRecordedTime2: "I reviewed this exact selected set and its recorded time for finalization.",
    // src/components/timecards.tsx:1060
    confirmReviewedTimecards: "Confirm reviewed timecards",
    // src/components/timecards.tsx:1063
    perCardResults: "Per-card results",
    // src/components/timecards.tsx:1063
    refreshTimecardsBeforeReviewingAnotherSet: "Refresh timecards before reviewing another set.",
    // src/components/timecards.tsx:1064
    retryOriginalAttemptedAction: "Retry original attempted action",
    // src/components/timecards.tsx:1067
    noTimecardsToShow: "No timecards to show",
    // src/components/timecards.tsx:1067
    noEmployeesAreAvailableForThisPeriod: "No employees are available for this period.",
    // src/components/timecards.tsx:1067
    chooseAnotherDateRangeToCheckRecordedTime: "Choose another date range to check recorded time.",
    // src/components/timecards.tsx:1071
    employee: "Employee",
    // src/components/timecards.tsx:1071
    attention: "Attention",
    // src/components/timecards.tsx:1071
    actions: "Actions",
    // src/components/timecards.tsx:1083
    issuescountMore: " +{issuesCount} more",
    // src/components/timecards.tsx:1084
    noIssuesFound: "No issues found",
    // src/components/timecards.tsx:1086
    retryPendingAction: "Retry pending action",
    // src/components/timecards.tsx:1087
    reopenInDetails: "Reopen in Details",
    // src/components/timecards.tsx:1088
    needsADifferentManager: "Needs a different manager",
    // src/components/timecards.tsx:1089
    approveAfterEndDate: "Approve after {endDate}",
    // src/components/timecards.tsx:1091
    finalizePeriod: "Finalize period",
    // src/components/timecards.tsx:1094
    details: "Details",
    // src/components/timecards.tsx:1094
    forName: " for {name}",
    // src/components/timecards.tsx:1095
    periodInformation: "Period information",
    // src/components/timecards.tsx:1095
    totalsCanChangeUntilThePeriodEndsApprovalOpensAfter: "Totals can change until the period ends. Approval opens after {endDate}.",
    // src/components/timecards.tsx:1095
    reviewTheEntriesAndResolveOpenTimeOrCorrectionsBefore: "Review the entries and resolve open time or corrections before approval.",
    // src/components/timecards.tsx:1096
    notSelectableForApprovalSelf: "Not selectable for approval: {self}.",
    // src/components/timecards.tsx:1096
    notSelectableForFinalizationSelf: "Not selectable for finalization: {self}.",
    // src/components/timecards.tsx:1098
    reopenReason: "Reopen reason",
    // src/components/timecards.tsx:1099
    reopenPeriod: "Reopen period",
    // src/components/timecards.tsx:1116
    totalsCanChangeUntilThePeriodCloses: "Totals can change until the period closes.",
    // src/components/timecards.tsx:1117
    reviewTimecard: "Review timecard",
    // src/components/timecards.tsx:1117
    closeTimecardReview: "Close timecard review",
    // src/components/timecards.tsx:1120
    selectForApprovalExcludedSelf: "Select for approval · Excluded: {self}",
    // src/components/timecards.tsx:1120
    selectForApproval: "Select for approval",
    // src/components/timecards.tsx:1120
    selectForFinalizationExcludedSelf: "Select for finalization · Excluded: {self}",
    // src/components/timecards.tsx:1120
    selectForFinalization: "Select for finalization",
    // src/components/timecards.tsx:1120
    selectEmployeeName: "Select {employeeName}",
    // src/components/timecards.tsx:74
    positionNotCaptured: "Position not captured",
    // src/components/timecards.tsx:77
    noClockOut2: "No clock out",
    // src/components/timecards.tsx:197
    loadingTimecards: "Loading timecards…",
    // src/components/timecards.tsx:546
    finalize: "Finalize",
    // src/components/timecards.tsx:546
    approve: "Approve",
    // src/components/timecards.tsx:568
    clockIns: "Clock-ins",
    // src/components/timecards.tsx:577
    reviewCorrection: "Review correction",
    // src/components/timecards.tsx:983
    value0Min: "0 min",
    // src/components/timecards.tsx:1004
    checkingYourTimecard: "Checking your timecard…",
    // src/components/timecards.tsx:1004
    notAvailableRightNow: "Not available right now",
    // src/components/timecards.tsx:1120
    aDifferentManagerMustReview2: "a different manager must review",
    // src/components/timecards.tsx:1120
    resolveTimecardIssuesFirst2: "resolve timecard issues first",
    // src/components/timecards.tsx:1120
    incompatibleCurrentState: "incompatible current state",
    // src/components/owner-b/moments-copy.ts:83
    cancel: "Cancel",
    // src/components/owner-b/moments-copy.ts:63
    notConfirmed: "Not confirmed",
    // src/components/owner-b/moments-copy.ts:68
    checkAgain: "Check again",
    // src/components/owner-b/moments-copy.ts:60
    batchApprovedOne: "1 timecard approved",
    // src/components/owner-b/moments-copy.ts:60
    batchApprovedOther: "{count} timecards approved",
    // src/components/owner-b/moments-copy.ts:61
    batchFinalizedOne: "1 timecard finalized",
    // src/components/owner-b/moments-copy.ts:61
    batchFinalizedOther: "{count} timecards finalized",
    // src/components/owner-b/moments-copy.ts:63
    blocked: "Blocked",
    // src/components/owner-b/moments-copy.ts:63
    changedReviewItAgain: "Changed. Review it again",
    // src/components/owner-b/moments-copy.ts:63
    notAvailable: "Not available",
    // src/components/owner-b/moments-copy.ts:63
    notAllowed: "Not allowed",
    // src/components/owner-b/moments-copy.ts:63
    notStarted: "Not started",
    // src/components/owner-b/moments-copy.ts:66
    yourApprovalIsnTConfirmedYet: "Your approval isn’t confirmed yet",
    // src/components/owner-b/moments-copy.ts:66
    finalizingIsnTConfirmedYet: "Finalizing isn’t confirmed yet",
    // src/components/owner-b/moments-copy.ts:66
    reopeningIsnTConfirmedYet: "Reopening isn’t confirmed yet",
    // src/components/owner-b/moments-copy.ts:67
    theAnswerDidnTArriveSoItMayAlreadyBe: "The answer didn’t arrive, so it may already be saved.",
    // src/components/owner-b/moments-copy.ts:69
    checkAndContinue: "Check and continue",
    // src/components/owner-b/moments-copy.ts:70
    oneUnsentAndUnconfirmedOne: "1 timecard isn’t confirmed, 1 wasn’t sent",
    // src/components/owner-b/moments-copy.ts:70
    manyUnsentAndUnconfirmedOne: "1 timecard isn’t confirmed, {waiting} weren’t sent",
    // src/components/owner-b/moments-copy.ts:70
    batchUnknownOne: "1 timecard isn’t confirmed",
    // src/components/owner-b/moments-copy.ts:70
    oneUnsentAndUnconfirmedOther: "{unknown} timecards aren’t confirmed, 1 wasn’t sent",
    // src/components/owner-b/moments-copy.ts:70
    manyUnsentAndUnconfirmedOther: "{unknown} timecards aren’t confirmed, {waiting} weren’t sent",
    // src/components/owner-b/moments-copy.ts:70
    batchUnknownOther: "{unknown} timecards aren’t confirmed",
    // src/components/owner-b/moments-copy.ts:72
    doneOfTotalApproved: "{done} of {total} approved",
    // src/components/owner-b/moments-copy.ts:73
    doneOfTotalFinalized: "{done} of {total} finalized",
    // src/components/owner-b/moments-copy.ts:74
    askBatchApprovalOne: "Approve 1 timecard?",
    // src/components/owner-b/moments-copy.ts:74
    askBatchApprovalOther: "Approve {count} timecards?",
    // src/components/owner-b/moments-copy.ts:75
    askBatchFinalizationOne: "Finalize 1 timecard?",
    // src/components/owner-b/moments-copy.ts:75
    askBatchFinalizationOther: "Finalize {count} timecards?",
    // src/components/owner-b/moments-copy.ts:76
    approveBatchOne: "Approve 1 timecard",
    // src/components/owner-b/moments-copy.ts:76
    approveBatchOther: "Approve {count} timecards",
    // src/components/owner-b/moments-copy.ts:77
    finalizeBatchOne: "Finalize 1 timecard",
    // src/components/owner-b/moments-copy.ts:77
    finalizeBatchOther: "Finalize {count} timecards",
    // src/components/owner-b/moments-copy.ts:78
    iCheckedTheseHours: "I checked these hours",
    // src/components/owner-b/moments-copy.ts:79
    ifSomethingStopsTheRestStayAsTheyAre: "If something stops, the rest stay as they are.",
    // src/components/owner-b/moments-copy.ts:80
    noTime: "No time",
    // src/components/owner-b/moments-copy.ts:81
    seeAllCount: "See all {count}",
    // src/components/owner-b/moments-copy.ts:85
    readyReadyRestCanTBeApprovedYet: "{ready} ready · {rest} can’t be approved yet",
    // src/components/owner-b/moments-copy.ts:85
    readyReady: "{ready} ready",
    // src/components/owner-b/moments-copy.ts:86
    readyReadyRestCanTBeFinalizedYet: "{ready} ready · {rest} can’t be finalized yet",
    // src/components/owner-b/moments-copy.ts:87
    alreadyApproved: "Already approved",
    // src/components/owner-b/moments-copy.ts:88
    alreadyFinalized: "Already finalized",
    // src/components/owner-b/moments-copy.ts:89
    approveItFirst: "Approve it first",
    // src/components/owner-b/moments-copy.ts:91
    firstSTimecardIsApproved: "{first}’s timecard is approved",
    // src/components/owner-b/moments-copy.ts:91
    timecardApproved2: "Timecard approved",
    // src/components/owner-b/moments-copy.ts:92
    firstSTimecardIsFinalized: "{first}’s timecard is finalized",
    // src/components/owner-b/moments-copy.ts:92
    timecardFinalized2: "Timecard finalized",
    // src/components/owner-b/moments-copy.ts:93
    nextTimecard: "Next timecard",
    // src/components/owner-b/moments-copy.ts:94
    finalizeTimecard: "Finalize timecard",
    // src/components/owner-b/moments-copy.ts:96
    finalizeFirstSTimecard: "Finalize {first}’s timecard?",
    // src/components/owner-b/moments-copy.ts:96
    finalizeThisTimecard: "Finalize this timecard?",
    // src/components/owner-b/moments-copy.ts:97
    itLocksThisTimecardForPayrollReopeningItNeedsA: "It locks this timecard for payroll. Reopening it needs a reason.",
    // src/components/owner-b/moments-copy.ts:98
    notYet: "Not yet",
    // src/components/owner-b/moments-copy.ts:99
    reopen: "Reopen",
    // src/components/owner-b/moments-copy.ts:100
    reopenTimecard: "Reopen timecard",
    // src/components/owner-b/moments-copy.ts:101
    reasonForReopening: "Reason for reopening",
    // src/components/owner-b/moments-copy.ts:102
    earlierVersionsCount: "Earlier versions ({count})",
  },
  es: {
    // src/components/timecards.tsx:49
    unknowntitleItMayAlreadyBeSaved: "{unknownTitle}. Puede que ya esté guardado.",
    // src/components/timecards.tsx:62
    periodIsStillOpen: "El período sigue abierto",
    // src/components/timecards.tsx:62
    noClockOutYet: "Aún sin salida",
    // src/components/timecards.tsx:62
    openBreak: "Descanso abierto",
    // src/components/timecards.tsx:62
    correctionAwaitingReview: "Corrección pendiente de revisión",
    // src/components/timecards.tsx:62
    overlappingRecordedTime: "Horas registradas solapadas",
    // src/components/timecards.tsx:72
    timesInTimeZoneHoursIncludeBreaksShownSeparatelyTheseAren: "Horas de {timeZone}. Las horas incluyen los descansos, que se muestran aparte. No son horas de nómina.",
    // src/components/timecards.tsx:75
    missingTimeAdjustment: "Ajuste por tiempo faltante",
    // src/components/timecards.tsx:75
    correctedEntry: "Marcación corregida",
    // src/components/timecards.tsx:75
    recordedPunch: "Marcación registrada",
    // src/components/timecards.tsx:76
    effectiveTime: "Tiempo efectivo",
    // src/components/timecards.tsx:76
    startatInProgress: "{startAt} → En curso",
    // src/components/timecards.tsx:77
    originalPunches: "Marcaciones originales",
    // src/components/timecards.tsx:77
    rawstartatNoClockOut: "{rawStartAt} → Sin salida registrada",
    // src/components/timecards.tsx:77
    noDeviceCapturedPunches: "Sin marcaciones del dispositivo",
    // src/components/timecards.tsx:78
    corrected: " · Corregida",
    // src/components/timecards.tsx:79
    originalRawStartAtRawEndAt: "Original: {rawStartAt} → {rawEndAt}",
    // src/components/timecards.tsx:79
    originalRawStartAtInProgress: "Original: {rawStartAt} → En curso",
    // src/components/timecards.tsx:81
    noHoursRecordedInThisPeriod: "No hay horas registradas en este período.",
    // src/components/timecards.tsx:82
    correctionsCorrectionsCount: "Correcciones ({correctionsCount})",
    // src/components/timecards.tsx:83
    waiting: "En espera",
    // src/components/timecards.tsx:83
    approved: "Aprobada",
    // src/components/timecards.tsx:83
    rejected: "Rechazada",
    // src/components/timecards.tsx:97
    inProgress: "En curso",
    // src/components/timecards.tsx:104
    anotherManagerApprovesYourOwnTimecard: "Otro gerente aprueba tu propia tarjeta de tiempo.",
    // src/components/timecards.tsx:104
    resolveOpenTimeOverlapsAndPendingCorrectionsBeforeApproval: "Resuelve el tiempo abierto, los solapamientos y las correcciones pendientes antes de aprobar.",
    // src/components/timecards.tsx:104
    approveTheLatestVersionOfThisTimecardBeforeFinalizing: "Aprueba la versión más reciente de esta tarjeta de tiempo antes de finalizarla.",
    // src/components/timecards.tsx:104
    refreshThePeriodAndChooseAnActionForItsCurrent: "Actualiza el período y elige una acción según su estado actual.",
    // src/components/timecards.tsx:104
    thisPeriodOverlapsFinalizedTimeReopenThatPeriodFirst: "Este período se solapa con tiempo finalizado. Reabre ese período primero.",
    // src/components/timecards.tsx:104
    payrollForThisPeriodIsApprovedStartAPayrollCorrection: "La nómina de este período está aprobada. Primero inicia una corrección de nómina y luego reábrelo.",
    // src/components/timecards.tsx:105
    thisPeriodChangedRefreshAndReviewTheLatestTimeBefore: "Este período cambió. Actualiza y revisa el tiempo más reciente antes de actuar.",
    // src/components/timecards.tsx:107
    theActionCouldNotBeCompletedRefreshYourCurrentSession: "No pudimos completar la acción. Actualiza tu sesión e inténtalo de nuevo.",
    // src/components/timecards.tsx:108
    timecardApproved: "Tarjeta de tiempo aprobada.",
    // src/components/timecards.tsx:108
    timecardFinalized: "Tarjeta de tiempo finalizada.",
    // src/components/timecards.tsx:108
    periodReopenedEarlierVersionsAreKeptInTheHistory: "Período reabierto. Las versiones anteriores se guardan en el historial.",
    // src/components/timecards.tsx:125
    noClockOut: "Sin salida",
    // src/components/timecards.tsx:125
    correction: "Corrección",
    // src/components/timecards.tsx:128
    missingClockOut: "Falta marcar salida",
    // src/components/timecards.tsx:128
    checkBreaks: "Revisar descansos",
    // src/components/timecards.tsx:128
    correctionWaiting: "Corrección en espera",
    // src/components/timecards.tsx:134
    finalized: "Finalizada",
    // src/components/timecards.tsx:138
    onBreakNow: "En descanso",
    // src/components/timecards.tsx:138
    clockedInNow: "En turno ahora",
    // src/components/timecards.tsx:140
    readyToFinalize: "Listas para finalizar",
    // src/components/timecards.tsx:141
    readyToApprove: "Listas para aprobar",
    // src/components/timecards.tsx:142
    noTimeYet: "Aún sin horas",
    // src/components/timecards.tsx:176
    signIn: "Iniciar sesión",
    // src/components/timecards.tsx:176
    tryAgain: "Intentar de nuevo",
    // src/components/timecards.tsx:222
    theseTimecardsAreOutOfDateRefreshToSeeThe: "Estas tarjetas de tiempo están desactualizadas. Actualiza para ver lo más reciente.",
    // src/components/timecards.tsx:229
    checkingPeriodTimecards: "Verificando las tarjetas de tiempo del período…",
    // src/components/timecards.tsx:234
    timecardsUnavailableTryRefreshing: "Las tarjetas de tiempo no están disponibles. Intenta actualizar.",
    // src/components/timecards.tsx:242
    yourSessionEndedSignInAgainToViewYourTimecards: "Tu sesión terminó. Vuelve a iniciar sesión para ver tus tarjetas de tiempo.",
    // src/components/timecards.tsx:242
    yourAccessChangedSignInAgainToCheckYourTimecards: "Tu acceso cambió. Vuelve a iniciar sesión para revisar tus tarjetas de tiempo.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisWeekOne: "{cardsCount} tarjeta de tiempo esta semana.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisPeriodOne: "{cardsCount} tarjeta de tiempo este período.",
    // src/components/timecards.tsx:254
    cardscountTimecardInThisPeriodOne: "{cardsCount} tarjeta de tiempo en este período.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisWeekOther: "{cardsCount} tarjetas de tiempo esta semana.",
    // src/components/timecards.tsx:254
    cardscountTimecardThisPeriodOther: "{cardsCount} tarjetas de tiempo este período.",
    // src/components/timecards.tsx:254
    cardscountTimecardInThisPeriodOther: "{cardsCount} tarjetas de tiempo en este período.",
    // src/components/timecards.tsx:255
    couldnTLoadTimecardsCheckYourConnectionThenTryAgain: "No pudimos cargar las tarjetas de tiempo. Revisa tu conexión e inténtalo de nuevo.",
    // src/components/timecards.tsx:255
    youReOfflineReconnectToSeeTimecards: "No tienes conexión. Vuelve a conectarte para ver las tarjetas de tiempo.",
    // src/components/timecards.tsx:261
    timecardsPausedReturnToThisWindowToCheckTheCurrent: "Tarjetas de tiempo en pausa. Vuelve a esta ventana para revisar el período actual.",
    // src/components/timecards.tsx:282
    chooseAValidPeriod: "Elige un período válido",
    // src/components/timecards.tsx:291
    saving: "Guardando…",
    // src/components/timecards.tsx:297
    yourSessionEndedSignInAgainBeforeReviewingTimecards: "Tu sesión terminó. Vuelve a iniciar sesión antes de revisar tarjetas de tiempo.",
    // src/components/timecards.tsx:297
    yourAccessChangedSignInAgainBeforeReviewingTimecards: "Tu acceso cambió. Vuelve a iniciar sesión antes de revisar tarjetas de tiempo.",
    // src/components/timecards.tsx:310
    this: "Esta persona",
    // src/components/timecards.tsx:322
    refreshAndReviewTheSelectedTimecards: "Actualiza y revisa las tarjetas de tiempo seleccionadas.",
    // src/components/timecards.tsx:328
    someTimecardsChangedRefreshAndCheckThemAgain: "Algunas tarjetas de tiempo cambiaron. Actualiza y revísalas de nuevo.",
    // src/components/timecards.tsx:329
    savingReviewedTimecardsOneAtATime: "Guardando las tarjetas de tiempo revisadas una por una…",
    // src/components/timecards.tsx:337
    signInAgainBeforeReviewingTimecards: "Vuelve a iniciar sesión antes de revisar tarjetas de tiempo.",
    // src/components/timecards.tsx:342
    eachTimecardShowsItsOwnResult: "Cada tarjeta de tiempo muestra su resultado.",
    // src/components/timecards.tsx:346
    signInToSeeTimecards: "Inicia sesión para ver las tarjetas de tiempo",
    // src/components/timecards.tsx:346
    couldnTLoadTimecards: "No pudimos cargar las tarjetas de tiempo",
    // src/components/timecards.tsx:346
    couldnTLoadYourTimecard: "No pudimos cargar tu tarjeta de tiempo",
    // src/components/timecards.tsx:347
    youReOffline: "Estás sin conexión",
    // src/components/timecards.tsx:347
    timecardsPaused: "Tarjetas de tiempo en pausa",
    // src/components/timecards.tsx:347
    timecardsArenTShowing: "Las tarjetas de tiempo no aparecen",
    // src/components/timecards.tsx:448
    thisWeek: "Esta semana",
    // src/components/timecards.tsx:448
    lastWeek: "Semana pasada",
    // src/components/timecards.tsx:483
    you: "Tú",
    // src/components/timecards.tsx:520
    approveEachTimecardThenFinalizeTheWeekToLockIt: "Aprueba cada tarjeta de tiempo y luego finaliza la semana para bloquearla para nómina.",
    // src/components/timecards.tsx:520
    approveEachTimecardThenFinalizeThePeriodToLockIt: "Aprueba cada tarjeta de tiempo y luego finaliza el período para bloquearlo para nómina.",
    // src/components/timecards.tsx:546
    finalizeAfterTheWaitingCorrectionIsReviewed: "Puedes finalizar cuando se revise la corrección pendiente.",
    // src/components/timecards.tsx:546
    finalizeAfterTheOpenTimeIsClosed: "Puedes finalizar cuando se cierre la marcación abierta.",
    // src/components/timecards.tsx:546
    finalizeAfterTheOverlappingTimeIsFixed: "Puedes finalizar cuando se corrijan las horas que se solapan.",
    // src/components/timecards.tsx:546
    finalizeAfterTheIssuesAboveAreResolved: "Puedes finalizar cuando se resuelvan los asuntos anteriores.",
    // src/components/timecards.tsx:546
    approveAfterTheWaitingCorrectionIsReviewed: "Puedes aprobar cuando se revise la corrección pendiente.",
    // src/components/timecards.tsx:546
    approveAfterTheOpenTimeIsClosed: "Puedes aprobar cuando se cierre la marcación abierta.",
    // src/components/timecards.tsx:546
    approveAfterTheOverlappingTimeIsFixed: "Puedes aprobar cuando se corrijan las horas que se solapan.",
    // src/components/timecards.tsx:546
    approveAfterTheIssuesAboveAreResolved: "Puedes aprobar cuando se resuelvan los asuntos anteriores.",
    // src/components/timecards.tsx:551
    requestTimeCorrection: "Solicitar corrección de tiempo",
    // src/components/timecards.tsx:556
    timecard: "Tarjeta de tiempo",
    // src/components/timecards.tsx:557
    done: "Listo",
    // src/components/timecards.tsx:572
    thisWeekIsnTOverHoursCanStillChange: "La semana sigue abierta. Las horas pueden cambiar.",
    // src/components/timecards.tsx:572
    thisPeriodIsnTOverHoursCanStillChange: "El período sigue abierto. Las horas pueden cambiar.",
    // src/components/timecards.tsx:572
    thisWeekIsnTOverHoursCanStillChangeYou: "La semana sigue abierta. Las horas pueden cambiar. Puedes aprobar a partir del {approvalDate}.",
    // src/components/timecards.tsx:572
    thisPeriodIsnTOverHoursCanStillChangeYou: "El período sigue abierto. Las horas pueden cambiar. Puedes aprobar a partir del {approvalDate}.",
    // src/components/timecards.tsx:576
    needsAttention: "Requiere atención",
    // src/components/timecards.tsx:581
    days: "Días",
    // src/components/timecards.tsx:582
    daysWithRecordedTime: "Días con horas registradas",
    // src/components/timecards.tsx:586
    noHoursThisWeek: "Sin horas esta semana",
    // src/components/timecards.tsx:586
    noHoursThisPeriod: "Sin horas este período",
    // src/components/timecards.tsx:587
    clockInsAndFixes: "Entradas y correcciones",
    // src/components/timecards.tsx:625
    approveWithNoHours: "Aprobar sin horas",
    // src/components/timecards.tsx:625
    approveTimecard: "Aprobar tarjeta de tiempo",
    // src/components/timecards.tsx:627
    reopened: "Reabierta",
    // src/components/timecards.tsx:647
    aDifferentManagerMustReview: "Debe revisarla otro gerente",
    // src/components/timecards.tsx:647
    resolveTimecardIssuesFirst: "Primero resuelve los problemas de la tarjeta",
    // src/components/timecards.tsx:655
    select: "Seleccionar",
    // src/components/timecards.tsx:667
    eachTimecard: "Cada tarjeta de tiempo",
    // src/components/timecards.tsx:668
    selectedTimecardReview: "Revisión de las tarjetas seleccionadas",
    // src/components/timecards.tsx:678
    timecardsInThisSet: "Tarjetas de tiempo de este grupo",
    // src/components/timecards.tsx:687
    selectedcountSelected: "Selección: {selectedCount}",
    // src/components/timecards.tsx:690
    selectedAction: "Acción para las seleccionadas",
    // src/components/timecards.tsx:690
    approveSelected: "Aprobar seleccionadas",
    // src/components/timecards.tsx:690
    finalizeSelected: "Finalizar seleccionadas",
    // src/components/timecards.tsx:692
    refreshTimecards: "Actualizar tarjetas de tiempo",
    // src/components/timecards.tsx:692
    refresh: "Actualizar",
    // src/components/timecards.tsx:693
    reviewSelectedTimecards: "Revisar las seleccionadas",
    // src/components/timecards.tsx:701
    week: "Semana",
    // src/components/timecards.tsx:705
    earlierPeriodShowTheWeekBefore: "Anteriores: {period}. Ver la semana anterior",
    // src/components/timecards.tsx:705
    earlierWeeks: "Semanas anteriores",
    // src/components/timecards.tsx:705
    earlier: "Anteriores",
    // src/components/timecards.tsx:716
    needsReview: "Por revisar",
    // src/components/timecards.tsx:725
    allCardsCountFinalized: "Las {cardsCount} finalizadas",
    // src/components/timecards.tsx:725
    allCardsCountApproved: "Las {cardsCount} aprobadas",
    // src/components/timecards.tsx:725
    approvedcountOfCardsCountApproved: "{approvedCount} de {cardsCount} aprobadas",
    // src/components/timecards.tsx:725
    youCanApproveFromPeriod: "Puedes aprobar desde el {period}",
    // src/components/timecards.tsx:725
    notApprovedYet: "Aún sin aprobar",
    // src/components/timecards.tsx:739
    periodOverview: "Resumen del período",
    // src/components/timecards.tsx:742
    approveEligibleCountReadyTimecards: "Aprobar {eligibleCount} tarjetas de tiempo listas",
    // src/components/timecards.tsx:744
    youCanApproveTheRestFromPeriod: "Puedes aprobar las demás desde el {period}",
    // src/components/timecards.tsx:744
    recordedtotalSoFar: " · {recordedTotal} hasta ahora",
    // src/components/timecards.tsx:745
    recordedtotalRecordedSoFar: "{recordedTotal} registradas hasta ahora",
    // src/components/timecards.tsx:746
    eligiblecountReady: "{eligibleCount} listos",
    // src/components/timecards.tsx:746
    noTimeRecorded: " · sin horas registradas",
    // src/components/timecards.tsx:746
    notimereadyWithNoTime: " · {noTimeReady} sin horas",
    // src/components/timecards.tsx:746
    attentionCountOne: " · {attention} requiere atención",
    // src/components/timecards.tsx:746
    attentionCountOther: " · {attention} requieren atención",
    // src/components/timecards.tsx:746
    recordedtotalRecorded: " · {recordedTotal} registradas",
    // src/components/timecards.tsx:749
    awaitingapprovalToApproveAwaitingFinalizationToFinalize: "{awaitingApproval} por aprobar · {awaitingFinalization} por finalizar",
    // src/components/timecards.tsx:757
    everyTimecardForPeriodIsFinalized: "Todas las tarjetas de tiempo del {period} están finalizadas.",
    // src/components/timecards.tsx:758
    preparePayroll: "Preparar nómina",
    // src/components/timecards.tsx:759
    allDoneYourOwnerRunsPayroll: "Todo listo. Tu dueño procesa la nómina.",
    // src/components/timecards.tsx:760
    downloadHoursForPayroll: "Descargar horas para la nómina",
    // src/components/timecards.tsx:761
    nextStep: "Próximo paso",
    // src/components/timecards.tsx:767
    checkYourConnectionThenTryAgain: "Revisa tu conexión e inténtalo de nuevo.",
    // src/components/timecards.tsx:770
    timecards: "Tarjetas de tiempo",
    // src/components/timecards.tsx:770
    noTimecardsThisWeek: "No hay tarjetas de tiempo esta semana",
    // src/components/timecards.tsx:770
    noOneHasATimecardInThisPeriod: "Nadie tiene tarjeta de tiempo en este período.",
    // src/components/timecards.tsx:774
    downloadApprovedHours: "Descargar horas aprobadas",
    // src/components/timecards.tsx:775
    timeTools: "Herramientas de tiempo",
    // src/components/timecards.tsx:779
    timeExports: "Exportar horas",
    // src/components/timecards.tsx:781
    timeCorrections: "Correcciones de tiempo",
    // src/components/timecards.tsx:781
    fixesPeopleAskedFor: "Correcciones que pidió el equipo",
    // src/components/timecards.tsx:798
    thisPeriod: "Este período",
    // src/components/timecards.tsx:815
    eligiblecountTimecardToApproveOne: "{eligibleCount} tarjeta de tiempo por aprobar",
    // src/components/timecards.tsx:815
    eligiblecountTimecardToApproveOther: "{eligibleCount} tarjetas de tiempo por aprobar",
    // src/components/timecards.tsx:817
    review: "Revisar",
    // src/components/timecards.tsx:818
    approval: "Aprobación",
    // src/components/timecards.tsx:820
    team: "Equipo",
    // src/components/timecards.tsx:822
    timecardsThatNeedAttention: "Tarjetas de tiempo que requieren atención",
    // src/components/timecards.tsx:822
    timecardsInThisPeriod: "Tarjetas de tiempo de este período",
    // src/components/timecards.tsx:867
    selectAllEligibleTimecards: "Seleccionar todas las tarjetas elegibles",
    // src/components/timecards.tsx:868
    selectAllEligible: "Seleccionar todas las elegibles",
    // src/components/timecards.tsx:873
    selectName: "Seleccionar a {name}",
    // src/components/timecards.tsx:903
    teamCardsCount: "Equipo ({cardsCount})",
    // src/components/timecards.tsx:941
    show: "Mostrar",
    // src/components/timecards.tsx:944
    all: "Todas",
    // src/components/timecards.tsx:955
    person: "Persona",
    // src/components/timecards.tsx:955
    role: "Puesto",
    // src/components/timecards.tsx:955
    recorded: "Registrado",
    // src/components/timecards.tsx:955
    breaks: "Descansos",
    // src/components/timecards.tsx:955
    status: "Estado",
    // src/components/timecards.tsx:967
    none: "Ninguno",
    // src/components/timecards.tsx:972
    noRecordedTimecardsNeedReview: "Ninguna tarjeta de tiempo registrada necesita revisión.",
    // src/components/timecards.tsx:972
    noApprovedTimecardsYet: "Aún no hay tarjetas de tiempo aprobadas.",
    // src/components/timecards.tsx:974
    idlecountPersonWithNoTimeYetOne: "{idleCount} persona aún sin horas",
    // src/components/timecards.tsx:974
    idlecountPersonWithNoTimeYetOther: "{idleCount} personas aún sin horas",
    // src/components/timecards.tsx:979
    total: "Total",
    // src/components/timecards.tsx:1006
    chooseAPeriod: "Elige un período",
    // src/components/timecards.tsx:1007
    periodStart: "Inicio del período",
    // src/components/timecards.tsx:1008
    periodEnd: "Fin del período",
    // src/components/timecards.tsx:1009
    viewPeriod: "Ver período",
    // src/components/timecards.tsx:1015
    yourTimecard: "Tu tarjeta de tiempo",
    // src/components/timecards.tsx:1016
    recordedTime: "Tiempo registrado",
    // src/components/timecards.tsx:1016
    breakTime: "Tiempo de descanso",
    // src/components/timecards.tsx:1018
    openPeriodTotalsCanStillChangeUntilItCloses: "Período abierto. Los totales pueden cambiar hasta que cierre.",
    // src/components/timecards.tsx:1019
    reviewYourRecordedEntriesRequestCorrectionsInMyTime: "Revisa tus marcaciones registradas. Pide correcciones en Mi tiempo.",
    // src/components/timecards.tsx:1020
    dailyPunches: "Marcaciones por día",
    // src/components/timecards.tsx:1020
    closeDailyPunches: "Cerrar marcaciones por día",
    // src/components/timecards.tsx:1023
    historicalRevisionsHistoryCount: "Versiones anteriores ({historyCount})",
    // src/components/timecards.tsx:1024
    revisionRevisionApproved: "Revisión {revision} · Aprobada",
    // src/components/timecards.tsx:1024
    revisionRevisionFinalized: "Revisión {revision} · Finalizada",
    // src/components/timecards.tsx:1024
    revisionRevisionReopened: "Revisión {revision} · Reabierta",
    // src/components/timecards.tsx:1031
    somethingWrong: "¿Algo está mal?",
    // src/components/timecards.tsx:1032
    requestACorrection: "Pedir una corrección",
    // src/components/timecards.tsx:1036
    managerTimecards: "Tarjetas de tiempo del equipo",
    // src/components/timecards.tsx:1036
    yourPeriodTimecard: "Tu tarjeta de tiempo del período",
    // src/components/timecards.tsx:1038
    pickTheDatesToReview: "Elige las fechas que quieres revisar",
    // src/components/timecards.tsx:1047
    needAttention: "Requieren atención",
    // src/components/timecards.tsx:1048
    requestACorrectionInMyTime: "Pedir una corrección en Mi tiempo →",
    // src/components/timecards.tsx:1048
    continueInMyTime: "Seguir en Mi tiempo",
    // src/components/timecards.tsx:1054
    timecardsNeedingAttentionAppearFirstResolveCorrectionsBeforeApprovalFinalize: "Las tarjetas de tiempo que requieren atención aparecen primero. Resuelve las correcciones antes de aprobar; finaliza cuando termine el período.",
    // src/components/timecards.tsx:1055
    eligiblecountEligibleCardsCountExcludedSelectUpTo100CurrentTimecards: "{eligibleCount} elegibles · {cardsCount} excluidas · Selecciona hasta 100 tarjetas actuales abajo.",
    // src/components/timecards.tsx:1058
    reviewedApprovalSet: "Grupo revisado para aprobar",
    // src/components/timecards.tsx:1058
    reviewedFinalizationSet: "Grupo revisado para finalizar",
    // src/components/timecards.tsx:1058
    startdateEndDateEachCardCommitsSeparatelyAStoppedSetLeaves: "{startDate} – {endDate}. Cada tarjeta se guarda por separado; si el grupo se detiene, las demás no se envían. Aprobar nunca finaliza el tiempo automáticamente.",
    // src/components/timecards.tsx:1059
    employeenameRevisionExpectedRevision: "{employeeName} · Revisión {expectedRevision}",
    // src/components/timecards.tsx:1060
    iReviewedThisExactSelectedSetAndItsRecordedTime: "Revisé este grupo exacto y su tiempo registrado para aprobarlo.",
    // src/components/timecards.tsx:1060
    iReviewedThisExactSelectedSetAndItsRecordedTime2: "Revisé este grupo exacto y su tiempo registrado para finalizarlo.",
    // src/components/timecards.tsx:1060
    confirmReviewedTimecards: "Confirmar las tarjetas revisadas",
    // src/components/timecards.tsx:1063
    perCardResults: "Resultado de cada tarjeta",
    // src/components/timecards.tsx:1063
    refreshTimecardsBeforeReviewingAnotherSet: "Actualiza las tarjetas de tiempo antes de revisar otro grupo.",
    // src/components/timecards.tsx:1064
    retryOriginalAttemptedAction: "Volver a intentar la acción original",
    // src/components/timecards.tsx:1067
    noTimecardsToShow: "No hay tarjetas de tiempo para mostrar",
    // src/components/timecards.tsx:1067
    noEmployeesAreAvailableForThisPeriod: "No hay empleados disponibles para este período.",
    // src/components/timecards.tsx:1067
    chooseAnotherDateRangeToCheckRecordedTime: "Elige otras fechas para revisar el tiempo registrado.",
    // src/components/timecards.tsx:1071
    employee: "Empleado",
    // src/components/timecards.tsx:1071
    attention: "Atención",
    // src/components/timecards.tsx:1071
    actions: "Acciones",
    // src/components/timecards.tsx:1083
    issuescountMore: " +{issuesCount} más",
    // src/components/timecards.tsx:1084
    noIssuesFound: "Sin problemas",
    // src/components/timecards.tsx:1086
    retryPendingAction: "Volver a intentar la acción pendiente",
    // src/components/timecards.tsx:1087
    reopenInDetails: "Reabrir en Detalles",
    // src/components/timecards.tsx:1088
    needsADifferentManager: "Necesita otro gerente",
    // src/components/timecards.tsx:1089
    approveAfterEndDate: "Se aprueba después del {endDate}",
    // src/components/timecards.tsx:1091
    finalizePeriod: "Finalizar período",
    // src/components/timecards.tsx:1094
    details: "Detalles",
    // src/components/timecards.tsx:1094
    forName: " de {name}",
    // src/components/timecards.tsx:1095
    periodInformation: "Información del período",
    // src/components/timecards.tsx:1095
    totalsCanChangeUntilThePeriodEndsApprovalOpensAfter: "Los totales pueden cambiar hasta que termine el período. Se aprueba después del {endDate}.",
    // src/components/timecards.tsx:1095
    reviewTheEntriesAndResolveOpenTimeOrCorrectionsBefore: "Revisa las marcaciones y resuelve el tiempo abierto o las correcciones antes de aprobar.",
    // src/components/timecards.tsx:1096
    notSelectableForApprovalSelf: "No se puede seleccionar para aprobar: {self}.",
    // src/components/timecards.tsx:1096
    notSelectableForFinalizationSelf: "No se puede seleccionar para finalizar: {self}.",
    // src/components/timecards.tsx:1098
    reopenReason: "Motivo para reabrir",
    // src/components/timecards.tsx:1099
    reopenPeriod: "Reabrir período",
    // src/components/timecards.tsx:1116
    totalsCanChangeUntilThePeriodCloses: "Los totales pueden cambiar hasta que cierre el período.",
    // src/components/timecards.tsx:1117
    reviewTimecard: "Revisar tarjeta de tiempo",
    // src/components/timecards.tsx:1117
    closeTimecardReview: "Cerrar revisión de la tarjeta",
    // src/components/timecards.tsx:1120
    selectForApprovalExcludedSelf: "Seleccionar para aprobar · Exclusión: {self}",
    // src/components/timecards.tsx:1120
    selectForApproval: "Seleccionar para aprobar",
    // src/components/timecards.tsx:1120
    selectForFinalizationExcludedSelf: "Seleccionar para finalizar · Exclusión: {self}",
    // src/components/timecards.tsx:1120
    selectForFinalization: "Seleccionar para finalizar",
    // src/components/timecards.tsx:1120
    selectEmployeeName: "Seleccionar a {employeeName}",
    // src/components/timecards.tsx:74
    positionNotCaptured: "Puesto no registrado",
    // src/components/timecards.tsx:77
    noClockOut2: "Sin salida",
    // src/components/timecards.tsx:197
    loadingTimecards: "Cargando tarjetas de tiempo…",
    // src/components/timecards.tsx:546
    finalize: "Finaliza",
    // src/components/timecards.tsx:546
    approve: "Aprobar",
    // src/components/timecards.tsx:568
    clockIns: "Entradas",
    // src/components/timecards.tsx:577
    reviewCorrection: "Revisar corrección",
    // src/components/timecards.tsx:983
    value0Min: "0 min",
    // src/components/timecards.tsx:1004
    checkingYourTimecard: "Verificando tu tarjeta de tiempo…",
    // src/components/timecards.tsx:1004
    notAvailableRightNow: "No disponible ahora",
    // src/components/timecards.tsx:1120
    aDifferentManagerMustReview2: "debe revisarla otro gerente",
    // src/components/timecards.tsx:1120
    resolveTimecardIssuesFirst2: "primero resuelve los problemas de la tarjeta",
    // src/components/timecards.tsx:1120
    incompatibleCurrentState: "su estado actual no lo permite",
    // src/components/owner-b/moments-copy.ts:83
    cancel: "Cancelar",
    // src/components/owner-b/moments-copy.ts:63
    notConfirmed: "Por confirmar",
    // src/components/owner-b/moments-copy.ts:68
    checkAgain: "Verificar de nuevo",
    // src/components/owner-b/moments-copy.ts:60
    batchApprovedOne: "1 tarjeta de tiempo aprobada",
    // src/components/owner-b/moments-copy.ts:60
    batchApprovedOther: "{count} tarjetas de tiempo aprobadas",
    // src/components/owner-b/moments-copy.ts:61
    batchFinalizedOne: "1 tarjeta de tiempo finalizada",
    // src/components/owner-b/moments-copy.ts:61
    batchFinalizedOther: "{count} tarjetas de tiempo finalizadas",
    // src/components/owner-b/moments-copy.ts:63
    blocked: "Bloqueada",
    // src/components/owner-b/moments-copy.ts:63
    changedReviewItAgain: "Cambió. Revísala de nuevo",
    // src/components/owner-b/moments-copy.ts:63
    notAvailable: "No disponible",
    // src/components/owner-b/moments-copy.ts:63
    notAllowed: "Sin permiso",
    // src/components/owner-b/moments-copy.ts:63
    notStarted: "Sin iniciar",
    // src/components/owner-b/moments-copy.ts:66
    yourApprovalIsnTConfirmedYet: "Tu aprobación está por confirmar",
    // src/components/owner-b/moments-copy.ts:66
    finalizingIsnTConfirmedYet: "La finalización aún no está confirmada",
    // src/components/owner-b/moments-copy.ts:66
    reopeningIsnTConfirmedYet: "La reapertura aún no está confirmada",
    // src/components/owner-b/moments-copy.ts:67
    theAnswerDidnTArriveSoItMayAlreadyBe: "La respuesta no llegó, así que puede que ya esté guardado.",
    // src/components/owner-b/moments-copy.ts:69
    checkAndContinue: "Verificar y continuar",
    // src/components/owner-b/moments-copy.ts:70
    oneUnsentAndUnconfirmedOne: "1 tarjeta de tiempo está por confirmar, 1 no se envió",
    // src/components/owner-b/moments-copy.ts:70
    manyUnsentAndUnconfirmedOne: "1 tarjeta de tiempo está por confirmar, {waiting} no se enviaron",
    // src/components/owner-b/moments-copy.ts:70
    batchUnknownOne: "1 tarjeta de tiempo está por confirmar",
    // src/components/owner-b/moments-copy.ts:70
    oneUnsentAndUnconfirmedOther: "{unknown} tarjetas de tiempo están por confirmar, 1 no se envió",
    // src/components/owner-b/moments-copy.ts:70
    manyUnsentAndUnconfirmedOther: "{unknown} tarjetas de tiempo están por confirmar, {waiting} no se enviaron",
    // src/components/owner-b/moments-copy.ts:70
    batchUnknownOther: "{unknown} tarjetas de tiempo están por confirmar",
    // src/components/owner-b/moments-copy.ts:72
    doneOfTotalApproved: "{done} de {total} aprobadas",
    // src/components/owner-b/moments-copy.ts:73
    doneOfTotalFinalized: "{done} de {total} finalizadas",
    // src/components/owner-b/moments-copy.ts:74
    askBatchApprovalOne: "¿Aprobar 1 tarjeta de tiempo?",
    // src/components/owner-b/moments-copy.ts:74
    askBatchApprovalOther: "¿Aprobar {count} tarjetas de tiempo?",
    // src/components/owner-b/moments-copy.ts:75
    askBatchFinalizationOne: "¿Finalizar 1 tarjeta de tiempo?",
    // src/components/owner-b/moments-copy.ts:75
    askBatchFinalizationOther: "¿Finalizar {count} tarjetas de tiempo?",
    // src/components/owner-b/moments-copy.ts:76
    approveBatchOne: "Aprobar 1 tarjeta de tiempo",
    // src/components/owner-b/moments-copy.ts:76
    approveBatchOther: "Aprobar {count} tarjetas de tiempo",
    // src/components/owner-b/moments-copy.ts:77
    finalizeBatchOne: "Finalizar 1 tarjeta de tiempo",
    // src/components/owner-b/moments-copy.ts:77
    finalizeBatchOther: "Finalizar {count} tarjetas de tiempo",
    // src/components/owner-b/moments-copy.ts:78
    iCheckedTheseHours: "Revisé estas horas",
    // src/components/owner-b/moments-copy.ts:79
    ifSomethingStopsTheRestStayAsTheyAre: "Si el proceso se detiene, las demás tarjetas quedan como están.",
    // src/components/owner-b/moments-copy.ts:80
    noTime: "Sin horas",
    // src/components/owner-b/moments-copy.ts:81
    seeAllCount: "Ver las {count}",
    // src/components/owner-b/moments-copy.ts:85
    readyReadyRestCanTBeApprovedYet: "Listas: {ready} · Aún no se pueden aprobar: {rest}",
    // src/components/owner-b/moments-copy.ts:85
    readyReady: "Listas: {ready}",
    // src/components/owner-b/moments-copy.ts:86
    readyReadyRestCanTBeFinalizedYet: "Listas: {ready} · Aún no se pueden finalizar: {rest}",
    // src/components/owner-b/moments-copy.ts:87
    alreadyApproved: "Ya aprobada",
    // src/components/owner-b/moments-copy.ts:88
    alreadyFinalized: "Ya finalizada",
    // src/components/owner-b/moments-copy.ts:89
    approveItFirst: "Apruébala primero",
    // src/components/owner-b/moments-copy.ts:91
    firstSTimecardIsApproved: "Se aprobó la tarjeta de tiempo de {first}",
    // src/components/owner-b/moments-copy.ts:91
    timecardApproved2: "Tarjeta de tiempo aprobada",
    // src/components/owner-b/moments-copy.ts:92
    firstSTimecardIsFinalized: "Se finalizó la tarjeta de tiempo de {first}",
    // src/components/owner-b/moments-copy.ts:92
    timecardFinalized2: "Tarjeta de tiempo finalizada",
    // src/components/owner-b/moments-copy.ts:93
    nextTimecard: "Siguiente tarjeta de tiempo",
    // src/components/owner-b/moments-copy.ts:94
    finalizeTimecard: "Finalizar tarjeta de tiempo",
    // src/components/owner-b/moments-copy.ts:96
    finalizeFirstSTimecard: "¿Finalizar la tarjeta de tiempo de {first}?",
    // src/components/owner-b/moments-copy.ts:96
    finalizeThisTimecard: "¿Finalizar esta tarjeta de tiempo?",
    // src/components/owner-b/moments-copy.ts:97
    itLocksThisTimecardForPayrollReopeningItNeedsA: "Esta tarjeta de tiempo se bloquea para la nómina. Para reabrirla, indica el motivo.",
    // src/components/owner-b/moments-copy.ts:98
    notYet: "Todavía no",
    // src/components/owner-b/moments-copy.ts:99
    reopen: "Reabrir",
    // src/components/owner-b/moments-copy.ts:100
    reopenTimecard: "Reabrir tarjeta de tiempo",
    // src/components/owner-b/moments-copy.ts:101
    reasonForReopening: "Motivo de la reapertura",
    // src/components/owner-b/moments-copy.ts:102
    earlierVersionsCount: "Versiones anteriores ({count})",
  },
} as const;

/* Signed-in Spanish (Jose, Nov 23, 2026): the Timecards screens' words in English and Puerto Rico Spanish, one table with
 * the same keys in both (the pattern of copy-receipt-copy.ts). English is the screen's wording unchanged; Spanish follows
 * docs/design/voice.md: tú, sentence case, the glossary ("Tarjeta de tiempo", "Marcación", "En turno", "Solicitud de
 * corrección", "Dueño", "Días libres"), times "6:00 a. m. – 2:00 p. m." and dates "16–22 nov".
 *
 * Status words that the screen also uses as keys ("Clocked in now", "Ready to approve") stay English inside the logic and
 * are put into the person's language where they are shown (`status`). */
export type TimecardsLang = 'en' | 'es';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en = {
  locale: 'en-US',
  /** Clock times as written in this language ("8:00 AM" stays; Spanish "8:00 a. m."). */
  times: (text: string) => text,
  /** A status word or phrase the logic keys on, as shown in this language. */
  status: (text: string) => text,
  open: 'now',
  // Details (a timecard's punches)
  timesIn: (zone: string) => `Times in ${zone}. Hours include breaks, shown separately. These aren’t payroll hours.`,
  positionNotCaptured: 'Position not captured',
  missingTimeAdjustment: 'Missing-time adjustment',
  correctedEntry: 'Corrected entry',
  recordedPunch: 'Recorded punch',
  effectiveTime: 'Effective time',
  inProgress: 'In progress',
  originalPunches: 'Original punches',
  noClockOut: 'No clock out',
  noDevicePunches: 'No device-captured punches',
  correctedSuffix: ' · Corrected',
  originalPrefix: 'Original: ',
  noHoursInPeriod: 'No hours recorded in this period.',
  corrections: (n: number) => `Corrections (${n})`,
  correctionWaiting: 'Waiting', correctionApproved: 'Approved', correctionRejected: 'Rejected',
  // Issues on a timecard
  issue: {
    period_open: 'Period is still open', open_entry: 'No clock-out yet', open_break: 'Open break',
    pending_correction: 'Correction awaiting review', overlapping_time: 'Overlapping recorded time',
  } as Record<string, string>,
  // Command results
  blocked: {
    self_review: 'Another manager approves your own timecard.',
    unresolved_time: 'Resolve open time, overlaps and pending corrections before approval.',
    approval_required: 'Approve the latest version of this timecard before finalizing.',
    period_state: 'Refresh the period and choose an action for its current state.',
    overlapping_period: 'This period overlaps finalized time. Reopen that period first.',
    payroll_approved: 'Payroll for this period is approved. Start a payroll correction for it first, then reopen.',
  } as Record<string, string>,
  conflict: 'This period changed. Refresh and review the latest time before acting.',
  mayBeSaved: (title: string) => `${title}. It may already be saved.`,
  unavailableAction: 'The action could not be completed. Refresh your current session and try again.',
  approvedOne: 'Timecard approved.', finalizedOne: 'Timecard finalized.', reopenedOne: 'Period reopened. Earlier versions are kept in the history.',
  // Loading and the status line
  loading: 'Loading timecards…',
  outOfDate: 'These timecards are out of date. Refresh to see the latest.',
  checking: 'Checking period timecards…',
  unavailableTryRefreshing: 'Timecards unavailable. Try refreshing.',
  sessionEndedView: 'Your session ended. Sign in again to view your timecards.',
  accessChangedView: 'Your access changed. Sign in again to check your timecards.',
  sessionEndedReview: 'Your session ended. Sign in again before reviewing timecards.',
  accessChangedReview: 'Your access changed. Sign in again before reviewing timecards.',
  countLine: (n: number, manager: boolean, noun: 'week' | 'period') => `${plural(n, 'timecard', 'timecards')} ${manager ? `this ${noun}` : 'in this period'}.`,
  couldntLoad: 'Couldn’t load timecards. Check your connection, then try again.',
  offline: 'You’re offline. Reconnect to see timecards.',
  paused: 'Timecards paused. Return to this window to check the current period.',
  saving: 'Saving…',
  chooseValidPeriod: 'Choose a valid period',
  refreshAndReview: 'Refresh and review the selected timecards.',
  someChanged: 'Some timecards changed. Refresh and check them again.',
  savingOneAtATime: 'Saving reviewed timecards one at a time…',
  signInBeforeReview: 'Sign in again before reviewing timecards.',
  eachShowsResult: 'Each timecard shows its own result.',
  // The state card
  signInToSee: 'Sign in to see timecards',
  couldntLoadTitle: 'Couldn’t load timecards',
  couldntLoadYours: 'Couldn’t load your timecard',
  offlineTitle: 'You’re offline',
  pausedTitle: 'Timecards paused',
  notShowing: 'Timecards aren’t showing',
  checkConnection: 'Check your connection, then try again.',
  signIn: 'Sign in',
  tryAgain: 'Try again',
  refresh: 'Refresh',
  refreshTimecards: 'Refresh timecards',
  // Rows and statuses
  you: 'You',
  thisWeek: 'This week', lastWeek: 'Last week', earlier: 'Earlier', earlierWeeks: 'Earlier weeks', week: 'Week',
  earlierAria: (range: string) => `Earlier: ${range}. Show the week before`,
  steps: (noun: 'week' | 'period') => `Approve each timecard, then finalize the ${noun} to lock it for payroll.`,
  approveVerb: 'Approve', finalizeVerb: 'Finalize',
  blockedWhy: (verb: string, why: 'correction' | 'open' | 'overlap' | 'other') => `${verb} after ${({ correction: 'the waiting correction is reviewed', open: 'the open time is closed', overlap: 'the overlapping time is fixed', other: 'the issues above are resolved' })[why]}.`,
  requestCorrection: 'Request time correction',
  // The sheet
  timecard: 'Timecard', done: 'Done',
  recorded: 'Recorded', breaks: 'Breaks', clockIns: 'Clock-ins',
  notOver: (noun: 'week' | 'period', approveFrom: string | null) => `This ${noun} isn’t over. Hours can still change.${approveFrom ? ` You can approve from ${approveFrom}.` : ''}`,
  needsAttention: 'Needs attention', reviewCorrection: 'Review correction',
  days: 'Days', daysWithTime: 'Days with recorded time', noHoursThis: (noun: 'week' | 'period') => `No hours this ${noun}`,
  clockInsAndFixes: 'Clock-ins and fixes',
  reopen: 'Reopen',
  approveNoHours: 'Approve with no hours', approveTimecard: 'Approve timecard',
  historyApproved: 'Approved', historyFinalized: 'Finalized', historyReopened: 'Reopened',
  // Select and review
  differentManager: 'A different manager must review', resolveFirst: 'Resolve timecard issues first',
  select: 'Select', eachTimecard: 'Each timecard', selectedReview: 'Selected timecard review',
  timecardsInSet: 'Timecards in this set',
  selected: (n: number) => `${n} selected`,
  selectedAction: 'Selected action', approveSelected: 'Approve selected', finalizeSelected: 'Finalize selected',
  reviewSelected: 'Review selected timecards',
  // The period
  inProgressFilter: 'In progress', needsReview: 'Needs review', all: 'All', approved: 'Approved', finalized: 'Finalized',
  allFinalized: (n: number) => `All ${n} finalized`, allApproved: (n: number) => `All ${n} approved`,
  someApproved: (done: number, total: number) => `${done} of ${total} approved`,
  canApproveFrom: (day: string) => `You can approve from ${day}`,
  notApprovedYet: 'Not approved yet',
  people: (n: number) => plural(n, 'person', 'people'),
  approvalOpens: (day: string) => `Approval opens ${day}`,
  periodOverview: 'Period overview',
  approveReady: (n: number) => `Approve ${n} ready timecards`,
  canApproveRest: (day: string) => `You can approve the rest from ${day}`,
  soFar: (total: string) => ` · ${total} so far`,
  recordedSoFar: (total: string) => `${total} recorded so far`,
  ready: (n: number) => `${n} ready`,
  noTimeRecorded: ' · no time recorded',
  withNoTime: (n: number) => ` · ${n} with no time`,
  needAttention: (n: number) => ` · ${n} need${n === 1 ? 's' : ''} attention`,
  recordedSuffix: (total: string) => ` · ${total} recorded`,
  readyToApprove: 'Ready to approve', readyToFinalize: 'Ready to finalize',
  toApproveToFinalize: (approve: number, finalize: number) => `${approve} to approve · ${finalize} to finalize`,
  everyFinalized: (range: string) => `Every timecard for ${range} is finalized.`,
  preparePayroll: 'Prepare payroll', ownerRunsPayroll: 'All done. Your Owner runs payroll.', downloadForPayroll: 'Download hours for payroll',
  downloadApproved: 'Download approved hours',
  nextStep: 'Next step',
  timecards: 'Timecards', noTimecardsWeek: 'No timecards this week', noOneHasTimecard: 'No one has a timecard in this period.',
  timeTools: 'Time tools', timeExports: 'Time exports', timeCorrections: 'Time corrections', fixesAsked: 'Fixes people asked for',
  thisPeriod: 'This period', attention: 'Attention',
  attentionShowing: (n: number) => `Attention, ${n}. Showing these only; show everyone`,
  attentionShow: (n: number) => `Attention, ${n}. Show these only`,
  toApprove: (n: number) => `${n} ${n === 1 ? 'timecard' : 'timecards'} to approve`,
  needFirst: (n: number) => `${n} need${n === 1 ? 's' : ''} attention first`,
  recordedTotal: (total: string) => `${total} recorded`,
  review: 'Review', approval: 'Approval',
  team: 'Team', showAll: 'Show all', timecardsNeedingAttention: 'Timecards that need attention', timecardsInPeriod: 'Timecards in this period',
  selectAllEligibleLabel: 'Select all eligible timecards', selectAllEligible: 'Select all eligible',
  selectPerson: (name: string) => `Select ${name}`,
  teamCount: (n: number) => `Team (${n})`,
  show: 'Show',
  tabAria: (label: string, count: number) => `${label}, ${count}`,
  person: 'Person', role: 'Role', statusColumn: 'Status', none: 'None',
  noneToReview: 'No recorded timecards need review.', noneApproved: 'No approved timecards yet.',
  noTimeYetPeople: (n: number) => `${plural(n, 'person', 'people')} with no time yet`,
  total: 'Total', zeroMin: '0 min',
  // The Employee's own timecard and the older views
  checkingYours: 'Checking your timecard…', notAvailableNow: 'Not available right now', worked: 'Worked',
  choosePeriod: 'Choose a period', periodStart: 'Period start', periodEnd: 'Period end', viewPeriod: 'View period',
  yourTimecard: 'Your timecard', recordedTime: 'Recorded time', breakTime: 'Break time',
  openPeriodNote: 'Open period. Totals can still change until it closes.',
  reviewYours: 'Review your recorded entries. Request corrections in My time.',
  dailyPunches: 'Daily punches', closeDailyPunches: 'Close daily punches',
  somethingWrong: 'Something wrong?', requestACorrection: 'Request a correction',
  continueInMyTime: 'Continue in My time. Your original punches are kept.',
  yourPeriodTimecard: 'Your period timecard', pickDates: 'Pick the dates to review',
  needAttentionTile: 'Need attention',
  requestInMyTime: 'Request a correction in My time →', continueMyTime: 'Continue in My time',
  needingAttentionFirst: 'Timecards needing attention appear first. Resolve corrections before approval; finalize after the period ends.',
  reviewedApprovalSet: 'Reviewed approval set', reviewedFinalizationSet: 'Reviewed finalization set',
  confirmReviewed: 'Confirm reviewed timecards',
  perCardResults: 'Per-card results', refreshBeforeAnother: 'Refresh timecards before reviewing another set.',
  retryOriginal: 'Retry original attempted action',
  noTimecardsToShow: 'No timecards to show', noEmployeesPeriod: 'No employees are available for this period.',
  chooseAnotherRange: 'Choose another date range to check recorded time.',
  employee: 'Employee', actions: 'Actions',
  noIssues: 'No issues found', retryPending: 'Retry pending action', reopenInDetails: 'Reopen in Details',
  needsDifferentManager: 'Needs a different manager', finalizePeriod: 'Finalize period',
  details: 'Details', periodInformation: 'Period information',
  totalsChangeUntilEnds: (day: string) => `Totals can change until the period ends. Approval opens after ${day}.`,
  reviewEntriesResolve: 'Review the entries and resolve open time or corrections before approval.',
  totalsChangeUntilCloses: 'Totals can change until the period closes.',
  excluded: { self: 'a different manager must review', issues: 'resolve timecard issues first', state: 'incompatible current state' } as Record<string, string>,
  excludedSuffix: (why: string) => ` · Excluded: ${why}`,
  selectFor: (action: 'APPROVE' | 'FINALIZE') => `Select for ${action === 'APPROVE' ? 'approval' : 'finalization'}`,
  reopenReason: 'Reopen reason', reopenPeriod: 'Reopen period',
  reviewTimecard: 'Review timecard', closeTimecardReview: 'Close timecard review',
  hoursMinutes: (hours: number, minutes: string) => `${hours}h ${minutes}m`,
  onBreak: (time: string) => `${time} on break`,
  historicalRevisions: (n: number) => `Historical revisions (${n})`,
  revision: (n: number) => `Revision ${n}`,
  managerTimecards: 'Manager timecards',
  selectedCount: (n: number) => `${n} selected`,
  eligibleLine: (eligible: number, excluded: number) => `${eligible} eligible · ${excluded} excluded · Select up to 100 current timecards below.`,
  reviewedSetNote: (start: string, end: string) => `${start} – ${end}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.`,
  revisionSuffix: (n: number) => ` · Revision ${n}`,
  reviewedExactSet: (action: 'APPROVE' | 'FINALIZE') => `I reviewed this exact selected set and its recorded time for ${action === 'APPROVE' ? 'approval' : 'finalization'}.`,
  moreIssues: (n: number) => ` +${n} more`,
  approveAfter: (day: string) => `Approve after ${day}`,
  detailsFor: (name: string) => ` for ${name}`,
  notSelectable: (action: 'APPROVE' | 'FINALIZE', why: string) => `Not selectable for ${action === 'APPROVE' ? 'approval' : 'finalization'}: ${why}.`,
  // The heading and the viewer's own timecard
  headingManager: 'Review hours and close each pay period.', headingEmployee: 'Your hours, breaks and approvals.',
  anotherApprovesRow: 'Another manager approves this one', anotherApprovesCard: 'Another manager approves your own timecard.',
  ownerApprovesRow: 'An Owner approves this one', ownerApprovesCard: 'An Owner approves your timecard.',
  namesApproveRow: (names: string[]) => `${names.join(' or ')} approves this one`,
  namesApproveCard: (names: string[]) => `${names.join(' or ')} approves your timecard.`,
};

/** Status words the logic keys on, in Spanish. */
const ES_STATUS: Record<string, string> = {
  'Clocked in now': 'En turno ahora', 'On break now': 'En descanso ahora', 'Ready to approve': 'Lista para aprobar',
  'Ready to finalize': 'Lista para finalizar', 'Finalized': 'Finalizada', 'In progress': 'En curso', 'No time yet': 'Sin horas aún',
  'Missing clock-out': 'Falta la salida', 'No clock-out': 'Sin salida', 'Check breaks': 'Revisa los descansos',
  'Correction waiting': 'Corrección pendiente', 'Correction': 'Corrección', 'Overlapping recorded time': 'Horas registradas solapadas',
  'Period is still open': 'El período sigue abierto', 'No clock-out yet': 'Aún sin salida', 'Open break': 'Descanso abierto',
  'Correction awaiting review': 'Corrección pendiente de revisión', 'Draft': 'Borrador', 'Approved': 'Aprobada', 'Reopened': 'Reabierta',
};
const esPlural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const es: typeof en = {
  locale: 'es-PR',
  times: wholeSpanishTimes,
  status: (text: string) => ES_STATUS[text] ?? text,
  open: 'ahora',
  timesIn: (zone: string) => formatPortalCopy(copy.es.timesInTimeZoneHoursIncludeBreaksShownSeparatelyTheseAren, { timeZone: zone }),
  positionNotCaptured: copy.es.positionNotCaptured,
  missingTimeAdjustment: copy.es.missingTimeAdjustment,
  correctedEntry: copy.es.correctedEntry,
  recordedPunch: copy.es.recordedPunch,
  effectiveTime: copy.es.effectiveTime,
  inProgress: copy.es.inProgress,
  originalPunches: copy.es.originalPunches,
  noClockOut: copy.es.noClockOut2,
  noDevicePunches: copy.es.noDeviceCapturedPunches,
  correctedSuffix: copy.es.corrected,
  originalPrefix: 'Original: ',
  noHoursInPeriod: copy.es.noHoursRecordedInThisPeriod,
  corrections: (n: number) => formatPortalCopy(copy.es.correctionsCorrectionsCount, { correctionsCount: n }),
  correctionWaiting: copy.es.waiting, correctionApproved: copy.es.approved, correctionRejected: copy.es.rejected,
  issue: {
    period_open: copy.es.periodIsStillOpen, open_entry: copy.es.noClockOutYet, open_break: copy.es.openBreak,
    pending_correction: copy.es.correctionAwaitingReview, overlapping_time: copy.es.overlappingRecordedTime,
  },
  blocked: {
    self_review: copy.es.anotherManagerApprovesYourOwnTimecard,
    unresolved_time: copy.es.resolveOpenTimeOverlapsAndPendingCorrectionsBeforeApproval,
    approval_required: copy.es.approveTheLatestVersionOfThisTimecardBeforeFinalizing,
    period_state: copy.es.refreshThePeriodAndChooseAnActionForItsCurrent,
    overlapping_period: copy.es.thisPeriodOverlapsFinalizedTimeReopenThatPeriodFirst,
    payroll_approved: copy.es.payrollForThisPeriodIsApprovedStartAPayrollCorrection,
  },
  conflict: copy.es.thisPeriodChangedRefreshAndReviewTheLatestTimeBefore,
  mayBeSaved: (title: string) => formatPortalCopy(copy.es.unknowntitleItMayAlreadyBeSaved, { unknownTitle: title }),
  unavailableAction: copy.es.theActionCouldNotBeCompletedRefreshYourCurrentSession,
  approvedOne: copy.es.timecardApproved, finalizedOne: copy.es.timecardFinalized, reopenedOne: copy.es.periodReopenedEarlierVersionsAreKeptInTheHistory,
  loading: copy.es.loadingTimecards,
  outOfDate: copy.es.theseTimecardsAreOutOfDateRefreshToSeeThe,
  checking: copy.es.checkingPeriodTimecards,
  unavailableTryRefreshing: copy.es.timecardsUnavailableTryRefreshing,
  sessionEndedView: copy.es.yourSessionEndedSignInAgainToViewYourTimecards,
  accessChangedView: copy.es.yourAccessChangedSignInAgainToCheckYourTimecards,
  sessionEndedReview: copy.es.yourSessionEndedSignInAgainBeforeReviewingTimecards,
  accessChangedReview: copy.es.yourAccessChangedSignInAgainBeforeReviewingTimecards,
  countLine: (n: number, manager: boolean, noun: 'week' | 'period') => `${esPlural(n, 'tarjeta de tiempo', 'tarjetas de tiempo')} ${manager ? (noun === 'week' ? 'esta semana' : 'este período') : 'en este período'}.`,
  couldntLoad: copy.es.couldnTLoadTimecardsCheckYourConnectionThenTryAgain,
  offline: copy.es.youReOfflineReconnectToSeeTimecards,
  paused: copy.es.timecardsPausedReturnToThisWindowToCheckTheCurrent,
  saving: copy.es.saving,
  chooseValidPeriod: copy.es.chooseAValidPeriod,
  refreshAndReview: copy.es.refreshAndReviewTheSelectedTimecards,
  someChanged: copy.es.someTimecardsChangedRefreshAndCheckThemAgain,
  savingOneAtATime: copy.es.savingReviewedTimecardsOneAtATime,
  signInBeforeReview: copy.es.signInAgainBeforeReviewingTimecards,
  eachShowsResult: copy.es.eachTimecardShowsItsOwnResult,
  signInToSee: copy.es.signInToSeeTimecards,
  couldntLoadTitle: copy.es.couldnTLoadTimecards,
  couldntLoadYours: copy.es.couldnTLoadYourTimecard,
  offlineTitle: copy.es.youReOffline,
  pausedTitle: copy.es.timecardsPaused,
  notShowing: copy.es.timecardsArenTShowing,
  checkConnection: copy.es.checkYourConnectionThenTryAgain,
  signIn: copy.es.signIn,
  tryAgain: copy.es.tryAgain,
  refresh: copy.es.refresh,
  refreshTimecards: copy.es.refreshTimecards,
  you: copy.es.you,
  thisWeek: copy.es.thisWeek, lastWeek: copy.es.lastWeek, earlier: copy.es.earlier, earlierWeeks: copy.es.earlierWeeks, week: copy.es.week,
  earlierAria: (range: string) => formatPortalCopy(copy.es.earlierPeriodShowTheWeekBefore, { period: range }),
  steps: (noun: 'week' | 'period') => noun === 'week' ? 'Aprueba cada tarjeta de tiempo y luego finaliza la semana para cerrarla para la nómina.' : 'Aprueba cada tarjeta de tiempo y luego finaliza el período para cerrarlo para la nómina.',
  approveVerb: copy.es.approve, finalizeVerb: copy.es.finalize,
  blockedWhy: (verb: string, why: 'correction' | 'open' | 'overlap' | 'other') => `${verb} cuando ${({ correction: 'se revise la corrección pendiente', open: 'se cierre el tiempo abierto', overlap: 'se arreglen las horas solapadas', other: 'se resuelva lo de arriba' })[why]}.`,
  requestCorrection: copy.es.requestTimeCorrection,
  timecard: copy.es.timecard, done: copy.es.done,
  recorded: copy.es.recorded, breaks: copy.es.breaks, clockIns: copy.es.clockIns,
  notOver: (noun: 'week' | 'period', approveFrom: string | null) => `${noun === 'week' ? 'Esta semana no ha terminado' : 'Este período no ha terminado'}. Las horas aún pueden cambiar.${approveFrom ? ` Puedes aprobar desde el ${approveFrom}.` : ''}`,
  needsAttention: copy.es.needsAttention, reviewCorrection: copy.es.reviewCorrection,
  days: copy.es.days, daysWithTime: copy.es.daysWithRecordedTime, noHoursThis: (noun: 'week' | 'period') => noun === 'week' ? 'Sin horas esta semana' : 'Sin horas este período',
  clockInsAndFixes: copy.es.clockInsAndFixes,
  reopen: copy.es.reopen,
  approveNoHours: copy.es.approveWithNoHours, approveTimecard: copy.es.approveTimecard,
  historyApproved: copy.es.approved, historyFinalized: copy.es.finalized, historyReopened: copy.es.reopened,
  differentManager: copy.es.aDifferentManagerMustReview, resolveFirst: copy.es.resolveTimecardIssuesFirst,
  select: copy.es.select, eachTimecard: copy.es.eachTimecard, selectedReview: copy.es.selectedTimecardReview,
  timecardsInSet: copy.es.timecardsInThisSet,
  selected: (n: number) => formatPortalCopy(copy.es.selectedcountSelected, { selectedCount: n }),
  selectedAction: copy.es.selectedAction, approveSelected: copy.es.approveSelected, finalizeSelected: copy.es.finalizeSelected,
  reviewSelected: copy.es.reviewSelectedTimecards,
  inProgressFilter: copy.es.inProgress, needsReview: copy.es.needsReview, all: copy.es.all, approved: copy.es.approved, finalized: copy.es.finalized,
  allFinalized: (n: number) => formatPortalCopy(copy.es.allCardsCountFinalized, { cardsCount: n }), allApproved: (n: number) => formatPortalCopy(copy.es.allCardsCountApproved, { cardsCount: n }),
  someApproved: (done: number, total: number) => formatPortalCopy(copy.es.approvedcountOfCardsCountApproved, { approvedCount: done, cardsCount: total }),
  canApproveFrom: (day: string) => formatPortalCopy(copy.es.youCanApproveFromPeriod, { period: day }),
  notApprovedYet: copy.es.notApprovedYet,
  people: (n: number) => esPlural(n, 'persona', 'personas'),
  approvalOpens: (day: string) => `Se aprueba desde el ${day}`,
  periodOverview: copy.es.periodOverview,
  approveReady: (n: number) => n === 1 ? copy.es.approveBatchOne : formatPortalCopy(copy.es.approveEligibleCountReadyTimecards, { eligibleCount: n }),
  canApproveRest: (day: string) => formatPortalCopy(copy.es.youCanApproveTheRestFromPeriod, { period: day }),
  soFar: (total: string) => formatPortalCopy(copy.es.recordedtotalSoFar, { recordedTotal: total }),
  recordedSoFar: (total: string) => formatPortalCopy(copy.es.recordedtotalRecordedSoFar, { recordedTotal: total }),
  ready: (n: number) => `${n} ${n === 1 ? 'lista' : 'listas'}`,
  noTimeRecorded: copy.es.noTimeRecorded,
  withNoTime: (n: number) => formatPortalCopy(copy.es.notimereadyWithNoTime, { noTimeReady: n }),
  needAttention: (n: number) => ` · ${n} ${n === 1 ? 'requiere' : 'requieren'} atención`,
  recordedSuffix: (total: string) => formatPortalCopy(copy.es.recordedtotalRecorded, { recordedTotal: total }),
  readyToApprove: copy.es.readyToApprove, readyToFinalize: copy.es.readyToFinalize,
  toApproveToFinalize: (approve: number, finalize: number) => formatPortalCopy(copy.es.awaitingapprovalToApproveAwaitingFinalizationToFinalize, { awaitingApproval: approve, awaitingFinalization: finalize }),
  everyFinalized: (range: string) => formatPortalCopy(copy.es.everyTimecardForPeriodIsFinalized, { period: range }),
  preparePayroll: copy.es.preparePayroll, ownerRunsPayroll: copy.es.allDoneYourOwnerRunsPayroll, downloadForPayroll: copy.es.downloadHoursForPayroll,
  downloadApproved: copy.es.downloadApprovedHours,
  nextStep: copy.es.nextStep,
  timecards: copy.es.timecards, noTimecardsWeek: copy.es.noTimecardsThisWeek, noOneHasTimecard: copy.es.noOneHasATimecardInThisPeriod,
  timeTools: copy.es.timeTools, timeExports: copy.es.timeExports, timeCorrections: copy.es.timeCorrections, fixesAsked: copy.es.fixesPeopleAskedFor,
  thisPeriod: copy.es.thisPeriod, attention: copy.es.attention,
  attentionShowing: (n: number) => `Atención, ${n}. Solo se muestran estas; ver todas`,
  attentionShow: (n: number) => `Atención, ${n}. Ver solo estas`,
  toApprove: (n: number) => `${esPlural(n, 'tarjeta de tiempo', 'tarjetas de tiempo')} por aprobar`,
  needFirst: (n: number) => `${n} ${n === 1 ? 'requiere' : 'requieren'} atención primero`,
  recordedTotal: (total: string) => `${total} registradas`,
  review: copy.es.review, approval: copy.es.approval,
  team: copy.es.team, showAll: 'Ver todas', timecardsNeedingAttention: copy.es.timecardsThatNeedAttention, timecardsInPeriod: copy.es.timecardsInThisPeriod,
  selectAllEligibleLabel: copy.es.selectAllEligibleTimecards, selectAllEligible: copy.es.selectAllEligible,
  selectPerson: (name: string) => formatPortalCopy(copy.es.selectName, { name }),
  teamCount: (n: number) => formatPortalCopy(copy.es.teamCardsCount, { cardsCount: n }),
  show: copy.es.show,
  tabAria: (label: string, count: number) => `${label}, ${count}`,
  person: copy.es.person, role: copy.es.role, statusColumn: copy.es.status, none: copy.es.none,
  noneToReview: copy.es.noRecordedTimecardsNeedReview, noneApproved: copy.es.noApprovedTimecardsYet,
  noTimeYetPeople: (n: number) => `${esPlural(n, 'persona', 'personas')} sin horas aún`,
  total: copy.es.total, zeroMin: copy.es.value0Min,
  checkingYours: copy.es.checkingYourTimecard, notAvailableNow: copy.es.notAvailableRightNow, worked: 'Trabajado',
  choosePeriod: copy.es.chooseAPeriod, periodStart: copy.es.periodStart, periodEnd: copy.es.periodEnd, viewPeriod: copy.es.viewPeriod,
  yourTimecard: copy.es.yourTimecard, recordedTime: copy.es.recordedTime, breakTime: copy.es.breakTime,
  openPeriodNote: copy.es.openPeriodTotalsCanStillChangeUntilItCloses,
  reviewYours: copy.es.reviewYourRecordedEntriesRequestCorrectionsInMyTime,
  dailyPunches: copy.es.dailyPunches, closeDailyPunches: copy.es.closeDailyPunches,
  somethingWrong: copy.es.somethingWrong, requestACorrection: copy.es.requestACorrection,
  continueInMyTime: 'Sigue en Mi tiempo. Tus marcaciones originales se conservan.',
  yourPeriodTimecard: copy.es.yourPeriodTimecard, pickDates: copy.es.pickTheDatesToReview,
  needAttentionTile: copy.es.needAttention,
  requestInMyTime: copy.es.requestACorrectionInMyTime, continueMyTime: copy.es.continueInMyTime,
  needingAttentionFirst: copy.es.timecardsNeedingAttentionAppearFirstResolveCorrectionsBeforeApprovalFinalize,
  reviewedApprovalSet: copy.es.reviewedApprovalSet, reviewedFinalizationSet: copy.es.reviewedFinalizationSet,
  confirmReviewed: copy.es.confirmReviewedTimecards,
  perCardResults: copy.es.perCardResults, refreshBeforeAnother: copy.es.refreshTimecardsBeforeReviewingAnotherSet,
  retryOriginal: copy.es.retryOriginalAttemptedAction,
  noTimecardsToShow: copy.es.noTimecardsToShow, noEmployeesPeriod: copy.es.noEmployeesAreAvailableForThisPeriod,
  chooseAnotherRange: copy.es.chooseAnotherDateRangeToCheckRecordedTime,
  employee: copy.es.employee, actions: copy.es.actions,
  noIssues: copy.es.noIssuesFound, retryPending: copy.es.retryPendingAction, reopenInDetails: copy.es.reopenInDetails,
  needsDifferentManager: copy.es.needsADifferentManager, finalizePeriod: copy.es.finalizePeriod,
  details: copy.es.details, periodInformation: copy.es.periodInformation,
  totalsChangeUntilEnds: (day: string) => formatPortalCopy(copy.es.totalsCanChangeUntilThePeriodEndsApprovalOpensAfter, { endDate: day }),
  reviewEntriesResolve: copy.es.reviewTheEntriesAndResolveOpenTimeOrCorrectionsBefore,
  totalsChangeUntilCloses: copy.es.totalsCanChangeUntilThePeriodCloses,
  excluded: { self: copy.es.aDifferentManagerMustReview2, issues: copy.es.resolveTimecardIssuesFirst2, state: copy.es.incompatibleCurrentState },
  excludedSuffix: (why: string) => ` · Excluida: ${why}`,
  selectFor: (action: 'APPROVE' | 'FINALIZE') => `Seleccionar para ${action === 'APPROVE' ? 'aprobar' : 'finalizar'}`,
  reopenReason: copy.es.reopenReason, reopenPeriod: copy.es.reopenPeriod,
  reviewTimecard: copy.es.reviewTimecard, closeTimecardReview: copy.es.closeTimecardReview,
  hoursMinutes: (hours: number, minutes: string) => `${hours} h ${minutes} min`,
  onBreak: (time: string) => `${time} en descanso`,
  historicalRevisions: (n: number) => formatPortalCopy(copy.es.historicalRevisionsHistoryCount, { historyCount: n }),
  revision: (n: number) => `Versión ${n}`,
  managerTimecards: copy.es.managerTimecards,
  selectedCount: (n: number) => formatPortalCopy(copy.es.selectedcountSelected, { selectedCount: n }),
  eligibleLine: (eligible: number, excluded: number) => formatPortalCopy(copy.es.eligiblecountEligibleCardsCountExcludedSelectUpTo100CurrentTimecards, { eligibleCount: eligible, cardsCount: excluded }),
  reviewedSetNote: (start: string, end: string) => formatPortalCopy(copy.es.startdateEndDateEachCardCommitsSeparatelyAStoppedSetLeaves, { startDate: start, endDate: end }),
  revisionSuffix: (n: number) => ` · Versión ${n}`,
  reviewedExactSet: (action: 'APPROVE' | 'FINALIZE') => `Revisé este grupo exacto y su tiempo registrado para ${action === 'APPROVE' ? 'aprobarlo' : 'finalizarlo'}.`,
  moreIssues: (n: number) => formatPortalCopy(copy.es.issuescountMore, { issuesCount: n }),
  approveAfter: (day: string) => formatPortalCopy(copy.es.approveAfterEndDate, { endDate: day }),
  detailsFor: (name: string) => formatPortalCopy(copy.es.forName, { name }),
  notSelectable: (action: 'APPROVE' | 'FINALIZE', why: string) => `No se puede seleccionar para ${action === 'APPROVE' ? 'aprobar' : 'finalizar'}: ${why}.`,
  headingManager: 'Revisa las horas y cierra cada período de pago.', headingEmployee: 'Tus horas, descansos y aprobaciones.',
  anotherApprovesRow: approvedTimecardsOwn.es.anotherManagerApprovesThisOne, anotherApprovesCard: copy.es.anotherManagerApprovesYourOwnTimecard,
  ownerApprovesRow: approvedTimecardsOwn.es.anOwnerApprovesThisOne, ownerApprovesCard: approvedTimecardsOwn.es.anOwnerApprovesYourTimecard,
  namesApproveRow: (names: string[]) => formatPortalCopy(approvedTimecardsOwn.es.firstApprovesThisOne, { first: names.join(' o ') }),
  namesApproveCard: (names: string[]) => formatPortalCopy(approvedTimecardsOwn.es.namesApprovesYourTimecard, { names: names.join(' o ') }),
};

export const TIMECARDS_COPY: Record<TimecardsLang, typeof en> = { en, es };
export const timecardsCopy = (lang: TimecardsLang = 'en') => TIMECARDS_COPY[lang];
export type TimecardsCopy = typeof en;
