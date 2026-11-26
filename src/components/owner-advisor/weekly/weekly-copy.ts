/* Rondo's weekly plan in English and Puerto Rico Spanish (Nov 23, 2026; docs/design/voice.md: tú, sentence case,
 * "localidad", "turno", "borrador", "cobertura", "Horario"). English is the page's words unchanged; the code lists that
 * live in src/lib/owner-advisor/weekly-client.ts (MODE_TEXT, REASON_TEXT, STATUS_TEXT, PROVENANCE_TEXT,
 * LOCATION_STATE_TEXT, PROGRESS_TEXT, weekText, coverageText) keep their English there, and their Spanish is here, keyed the
 * same way. Server text (names, messages, issues) is never translated. */
import { copy as wordingWeeklyPage } from "./weekly-page-copy";
import { copy as wordingAiManagerWeeklyPage } from "../../../app/app/ai-manager/weekly/page-copy";
import { LOCATION_STATE_TEXT, MODE_TEXT, PROGRESS_TEXT, PROVENANCE_TEXT, REASON_TEXT, STATUS_TEXT, addDays, coverageText, hours, weekText } from "@/lib/owner-advisor/weekly-client";
import type { CoverageMeasure } from "@/lib/owner-advisor/coverage-plan-contracts";
import type { WeeklyAlternativeSummary, WeeklyComparison, WeeklyInspectionReason, WeeklyMode, WeeklyProgress } from "@/lib/owner-advisor/weekly-contracts";
import { periodText } from "../format";

type Verb = "compare" | "save" | "decline" | "open";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en = {
  // Page head and toasts
  weeklyPlan: "Weekly plan", rondoAi: "Rondo AI", staffingForOneWeek: "Staffing for one week",
  navSaved: "Saved", navDeclined: "Declined", navReview: "Review plan",
  titleSaved: "Saved as a draft", titleDeclined: "Plan declined", titleReview: "Review the plan",
  toastSaved: "Saved as a draft", toastAlreadySaved: "Already saved", toastDeclined: "Plan declined",
  // Session and problems
  sessionEnded: "Your session ended", signInAgain: "Sign in again to plan a week.", signIn: "Sign in",
  declineNotConfirmed: "Decline not confirmed", declineRetryLine: "Try again. It can’t decline twice.", tryAgain: "Try again",
  weeklyOff: "Weekly planning is off", approvedStillOpen: "Approved plans still open from their links.",
  compareNotConfirmed: "Comparison not confirmed", compareRetryLine: "Try again. It won’t start a second one.",
  options: "Options", optionsOutOfDate: "These options are out of date", compareAgainLine: "Compare again for current options.", compareAgain: "Compare again",
  invalidTitle: "Request not accepted", invalidLine: "Check the week and locations.",
  conflictTitle: "Something changed first", conflictLine: "Look again before deciding.",
  limitTitle: "Too many saved plans", limitLine: "Nothing was saved.",
  couldnt: { compare: "Couldn’t compare the plan", save: "Couldn’t save the plan", decline: "Couldn’t decline the plan", open: "Couldn’t open the plan" } as Record<Verb, string>,
  failedLine: "Check your connection, then try again.",
  checkingApproval: "Checking your approval", earlierCleared: "Earlier approval cleared", otherSignIn: "It was made under another sign-in.", ok: "OK",
  approvalNotSaved: "Approval not saved", nothingOnSchedule: "Nothing from it is on the schedule.", sendAgain: "Send again", leaveIt: "Leave it",
  approvalNotConfirmed: "Approval not confirmed", mayHaveSaved: "It may have saved. Sending again can’t save it twice.", checkAgain: "Check again",
  detailsHidden: "Details hidden", plansHide: "Plans hide after a short time.", showAgain: "Show again",
  // The plan form
  planAWeek: "Plan a week", week: "Week", previousWeek: "Previous week", nextWeek: "Next week", thisWeek: " · This week",
  whatRondoMayChange: "What Rondo may change", locations: "Locations", allLocations: "All locations", chooseLocations: "Choose locations",
  locationsToPlan: "Locations to plan", chooseOneLocation: "Choose at least one location", comparing: "Comparing…", compareOptions: "Compare options",
  oneLocation: "1 location", nLocations: (n: number) => `${n} locations`,
  // Comparing options
  noChange: "no change", optionsFor: (week: string) => `Options for ${week}`,
  tooLarge: "Too large to compare", tooLargeLine: "No options this time. Contact support if it keeps happening.",
  tooMany: "Too many changes to compare", tooManyLine: "No options this time. Try fewer locations.",
  scheduleNow: "The schedule now", coverage: "Coverage", stillOpen: "Still open", blocks: (n: number) => plural(n, "block", "blocks"),
  weekendHistory: "Weekend history", known: (a: number, b: number) => `${a} of ${b} known`,
  search: "Search", stoppedEarly: "Stopped early", information: "Information", partial: "Partial",
  noOptions: "No options to show", nothingToChange: "Nothing to change this week.",
  option: (letter: string) => `Option ${letter}`, lookOnly: "Look only", adds: "Adds", shifts: (n: number) => plural(n, "shift", "shifts"),
  replaces: "Replaces", drafts: (n: number) => plural(n, "draft", "drafts"), keeps: "Keeps", thingsToCheck: "Things to check",
  worthALook: "Worth a look", cantBeSaved: "Can’t be saved", reviewOption: (letter: string) => `Review option ${letter}`,
  // One option in full
  nothingYet: "Nothing to show yet", openToSee: "Open the plan to see it.", openPlan: "Open the plan", loadingPlan: "Loading the plan",
  reviewedLocations: (n: number) => `${n} reviewed ${n === 1 ? "location" : "locations"}`, cantMeasure: "Can’t measure a reviewed location",
  reviewedChanged: (n: number) => `${n} reviewed · locations changed`, notAvailable: "Not available",
  declineQuestion: "Decline this plan?", scheduleDoesntChange: "The schedule doesn’t change.", keepPlan: "Keep plan", decline: "Decline",
  planOutOfDate: "This plan is out of date", declineIt: "Decline it", scheduleDidntChange: "The schedule didn’t change.", backToOptions: "Back to options",
  notSaved: "Not saved", cantCheck: "Can’t check this plan right now", tryInAMoment: "Try again in a moment.",
  onlySavedShow: "Only saved plans show while weekly planning is off.",
  whatWasSaved: "What was saved", savedAt: "Saved at", added: "Added", replaced: "Replaced", draftShifts: (n: number) => `${n} draft ${n === 1 ? "shift" : "shifts"}`,
  kept: "Kept", savedShiftsNow: "The saved shifts now", stillAsSaved: "Still as saved", of: (a: number, b: number) => `${a} of ${b}`, published: "Published",
  cantReadSchedule: "Can’t read the schedule right now", notShownOff: "Not shown while weekly planning is off",
  planAnother: "Plan another week", openSchedule: "Open Schedule",
  thisPlan: "This plan", availableUntil: "Available until", expired: "Expired",
  shiftsAdded: "Shifts added", lead: "Lead", noShiftsAdded: "No shifts added", draftShiftsReplaced: "Draft shifts replaced", replacedPill: "Replaced",
  more: (n: number) => `${n} more`, morePositions: (n: number) => `${n} more positions`, nothingLeftOpen: "Nothing left open",
  moreNotListed: (n: number) => `${n} more not listed`, decide: "Decide",
  savesLine: (added: number, removed: number) => `Saves ${added} ${added === 1 ? "shift" : "shifts"}${removed ? ` and replaces ${removed}` : ""} as a draft. Not published, no one notified.`,
  ackLabel: "I reviewed all proposed changes and remaining gaps",
  offCallout: "Weekly planning is off.", expiredCallout: "Expired. Compare again.",
  cantBeSavedBecause: (reasons: string) => `Can’t be saved${reasons ? `: ${reasons}` : ""}`,
  saving: "Saving…", saveAsDraft: "Save as draft",
  // The route's error frame
  couldntOpenWeekly: "Couldn’t open weekly planning", accessChanged: "Your access or the connection changed. Check it, then try again.",
  // The lib's word lists and words, keyed as weekly-client.ts keys them
  mode: MODE_TEXT as Record<WeeklyMode, { label: string; line: string }>,
  reason: REASON_TEXT as Record<WeeklyInspectionReason, string>,
  status: STATUS_TEXT as Record<WeeklyAlternativeSummary["status"], string>,
  provenance: PROVENANCE_TEXT as Record<WeeklyAlternativeSummary["issues"]["items"][number]["provenance"], string>,
  locationState: LOCATION_STATE_TEXT as Record<WeeklyComparison["locations"][number]["state"], string>,
  progress: PROGRESS_TEXT as Record<WeeklyProgress["state"], string>,
  weekText: (monday: string) => weekText(monday),
  coverageText: (measure: CoverageMeasure) => coverageText(measure),
};
export type WeeklyCopy = typeof en;

const es: WeeklyCopy = {
  weeklyPlan: wordingWeeklyPage.es.weeklyPlan, rondoAi: wordingWeeklyPage.es.labelRondoAi, staffingForOneWeek: wordingWeeklyPage.es.labelStaffingForOneWeek,
  navSaved: wordingWeeklyPage.es.navSaved, navDeclined: wordingWeeklyPage.es.navDeclined, navReview: wordingWeeklyPage.es.navReview,
  titleSaved: wordingWeeklyPage.es.titleSaved, titleDeclined: wordingWeeklyPage.es.titleDeclined, titleReview: wordingWeeklyPage.es.titleReview,
  toastSaved: wordingWeeklyPage.es.titleSaved, toastAlreadySaved: wordingWeeklyPage.es.toastAlreadySaved, toastDeclined: wordingWeeklyPage.es.titleDeclined,
  sessionEnded: wordingWeeklyPage.es.sessionEnded, signInAgain: wordingWeeklyPage.es.signInAgain, signIn: wordingWeeklyPage.es.labelSignIn,
  declineNotConfirmed: wordingWeeklyPage.es.declineNotConfirmed, declineRetryLine: wordingWeeklyPage.es.declineRetryLine, tryAgain: wordingWeeklyPage.es.labelTryAgain,
  weeklyOff: wordingWeeklyPage.es.weeklyOff, approvedStillOpen: wordingWeeklyPage.es.approvedStillOpen,
  compareNotConfirmed: wordingWeeklyPage.es.compareNotConfirmed, compareRetryLine: wordingWeeklyPage.es.compareRetryLine,
  options: wordingWeeklyPage.es.options, optionsOutOfDate: wordingWeeklyPage.es.optionsOutOfDate, compareAgainLine: wordingWeeklyPage.es.compareAgainLine, compareAgain: wordingWeeklyPage.es.compareAgain,
  invalidTitle: wordingWeeklyPage.es.invalidTitle, invalidLine: wordingWeeklyPage.es.invalidLine,
  conflictTitle: wordingWeeklyPage.es.conflictTitle, conflictLine: wordingWeeklyPage.es.conflictLine,
  limitTitle: wordingWeeklyPage.es.limitTitle, limitLine: wordingWeeklyPage.es.limitLine,
  couldnt: { compare: wordingWeeklyPage.es.couldnPlanCompare, save: wordingWeeklyPage.es.couldnPlanSave, decline: wordingWeeklyPage.es.couldnPlanDecline, open: wordingWeeklyPage.es.couldnPlanOpen },
  failedLine: wordingWeeklyPage.es.failedLine,
  checkingApproval: wordingWeeklyPage.es.checkingApproval, earlierCleared: wordingWeeklyPage.es.earlierCleared, otherSignIn: wordingWeeklyPage.es.otherSignIn, ok: wordingWeeklyPage.es.labelOk,
  approvalNotSaved: wordingWeeklyPage.es.approvalNotSaved, nothingOnSchedule: wordingWeeklyPage.es.nothingOnSchedule, sendAgain: wordingWeeklyPage.es.labelSendAgain, leaveIt: wordingWeeklyPage.es.labelLeaveIt,
  approvalNotConfirmed: wordingWeeklyPage.es.approvalNotConfirmed, mayHaveSaved: wordingWeeklyPage.es.mayHaveSaved, checkAgain: wordingWeeklyPage.es.labelCheckAgain,
  detailsHidden: wordingWeeklyPage.es.detailsHidden, plansHide: wordingWeeklyPage.es.plansHide, showAgain: wordingWeeklyPage.es.labelShowAgain,
  planAWeek: wordingWeeklyPage.es.planAWeek, week: wordingWeeklyPage.es.week, previousWeek: wordingWeeklyPage.es.previousWeek, nextWeek: wordingWeeklyPage.es.nextWeek, thisWeek: wordingWeeklyPage.es.thisWeek,
  whatRondoMayChange: wordingWeeklyPage.es.whatRondoMayChange, locations: wordingWeeklyPage.es.locations, allLocations: wordingWeeklyPage.es.allLocations, chooseLocations: wordingWeeklyPage.es.chooseLocations,
  locationsToPlan: wordingWeeklyPage.es.locationsToPlan, chooseOneLocation: wordingWeeklyPage.es.chooseOneLocation, comparing: wordingWeeklyPage.es.comparing, compareOptions: wordingWeeklyPage.es.compareOptions,
  oneLocation: wordingWeeklyPage.es.oneLocation, nLocations: (n: number) => `${n} localidades`,
  noChange: wordingWeeklyPage.es.noChange, optionsFor: (week: string) => `Opciones para ${week}`,
  tooLarge: wordingWeeklyPage.es.tooLarge, tooLargeLine: wordingWeeklyPage.es.tooLargeLine,
  tooMany: wordingWeeklyPage.es.tooMany, tooManyLine: wordingWeeklyPage.es.tooManyLine,
  scheduleNow: wordingWeeklyPage.es.scheduleNow, coverage: wordingWeeklyPage.es.coverage, stillOpen: wordingWeeklyPage.es.stillOpen, blocks: (n: number) => plural(n, "bloque", "bloques"),
  weekendHistory: wordingWeeklyPage.es.weekendHistory, known: (a: number, b: number) => `${a} de ${b} conocidos`,
  search: wordingWeeklyPage.es.search, stoppedEarly: wordingWeeklyPage.es.labelStoppedEarly, information: wordingWeeklyPage.es.information, partial: wordingWeeklyPage.es.labelPartial,
  noOptions: wordingWeeklyPage.es.noOptions, nothingToChange: wordingWeeklyPage.es.nothingToChange,
  option: (letter: string) => `Opción ${letter}`, lookOnly: wordingWeeklyPage.es.labelLookOnly, adds: wordingWeeklyPage.es.adds, shifts: (n: number) => plural(n, "turno", "turnos"),
  replaces: wordingWeeklyPage.es.replaces, drafts: (n: number) => plural(n, "borrador", "borradores"), keeps: wordingWeeklyPage.es.keeps, thingsToCheck: wordingWeeklyPage.es.thingsToCheck,
  worthALook: wordingWeeklyPage.es.worthALook, cantBeSaved: wordingWeeklyPage.es.cantBeSaved, reviewOption: (letter: string) => `Revisar opción ${letter}`,
  nothingYet: wordingWeeklyPage.es.nothingYet, openToSee: wordingWeeklyPage.es.openToSee, openPlan: wordingWeeklyPage.es.labelOpenThePlan, loadingPlan: wordingWeeklyPage.es.loadingPlan,
  reviewedLocations: (n: number) => `${n} ${n === 1 ? "localidad revisada" : "localidades revisadas"}`, cantMeasure: wordingWeeklyPage.es.cantMeasure,
  reviewedChanged: (n: number) => `${n} ${n === 1 ? "revisada" : "revisadas"} · las localidades cambiaron`, notAvailable: wordingWeeklyPage.es.labelNotAvailable,
  declineQuestion: wordingWeeklyPage.es.declineQuestion, scheduleDoesntChange: wordingWeeklyPage.es.labelTheScheduleDoesnTChange, keepPlan: wordingWeeklyPage.es.labelKeepPlan, decline: wordingWeeklyPage.es.decline,
  planOutOfDate: wordingWeeklyPage.es.planOutOfDate, declineIt: wordingWeeklyPage.es.declineIt, scheduleDidntChange: wordingWeeklyPage.es.scheduleDidntChange, backToOptions: wordingWeeklyPage.es.backToOptions,
  notSaved: wordingWeeklyPage.es.notSaved, cantCheck: wordingWeeklyPage.es.cantCheck, tryInAMoment: wordingWeeklyPage.es.tryInAMoment,
  onlySavedShow: wordingWeeklyPage.es.onlySavedShow,
  whatWasSaved: wordingWeeklyPage.es.whatWasSaved, savedAt: wordingWeeklyPage.es.savedAt, added: wordingWeeklyPage.es.added, replaced: wordingWeeklyPage.es.replaced, draftShifts: (n: number) => `${n} ${n === 1 ? "turno" : "turnos"} en borrador`,
  kept: wordingWeeklyPage.es.kept, savedShiftsNow: wordingWeeklyPage.es.savedShiftsNow, stillAsSaved: wordingWeeklyPage.es.stillAsSaved, of: (a: number, b: number) => `${a} de ${b}`, published: wordingWeeklyPage.es.published,
  cantReadSchedule: wordingWeeklyPage.es.cantReadSchedule, notShownOff: wordingWeeklyPage.es.notShownOff,
  planAnother: wordingWeeklyPage.es.planAnother, openSchedule: wordingWeeklyPage.es.openSchedule,
  thisPlan: wordingWeeklyPage.es.thisPlan, availableUntil: wordingWeeklyPage.es.availableUntil, expired: wordingWeeklyPage.es.labelExpired,
  shiftsAdded: wordingWeeklyPage.es.shiftsAdded, lead: wordingWeeklyPage.es.lead, noShiftsAdded: wordingWeeklyPage.es.noShiftsAdded, draftShiftsReplaced: wordingWeeklyPage.es.draftShiftsReplaced, replacedPill: wordingWeeklyPage.es.replacedShift,
  more: (n: number) => `${n} más`, morePositions: (n: number) => `${n} puestos más`, nothingLeftOpen: wordingWeeklyPage.es.nothingLeftOpen,
  moreNotListed: (n: number) => `${n} más sin listar`, decide: wordingWeeklyPage.es.decide,
  savesLine: (added: number, removed: number) => `Guarda ${added} ${added === 1 ? "turno" : "turnos"}${removed ? ` y reemplaza ${removed}` : ""} como borrador. Sin publicar y sin avisar a nadie.`,
  ackLabel: wordingWeeklyPage.es.ackLabel,
  offCallout: wordingWeeklyPage.es.offCallout, expiredCallout: wordingWeeklyPage.es.expiredCallout,
  cantBeSavedBecause: (reasons: string) => `No se puede guardar${reasons ? `: ${reasons}` : ""}`,
  saving: wordingWeeklyPage.es.saving, saveAsDraft: wordingWeeklyPage.es.saveAsDraft,
  couldntOpenWeekly: wordingAiManagerWeeklyPage.es.couldntOpenWeekly, accessChanged: wordingAiManagerWeeklyPage.es.accessChanged,
  mode: {
    FILL_GAPS_ONLY: { label: wordingWeeklyPage.es.modeFillGapsOnlyLabel, line: wordingWeeklyPage.es.modeFillGapsOnlyLine },
    BUILD_WEEK: { label: wordingWeeklyPage.es.modeBuildWeekLabel, line: wordingWeeklyPage.es.modeBuildWeekLine },
  },
  reason: {
    NO_CHANGE: wordingWeeklyPage.es.reasonNoChange,
    NO_CONFIGURED_DEMAND: wordingWeeklyPage.es.reasonNoConfiguredDemand,
    INVALID_PLAN: wordingWeeklyPage.es.reasonInvalidPlan,
    REMOVAL_ONLY: wordingWeeklyPage.es.reasonRemovalOnly,
    COVERAGE_REGRESSION: wordingWeeklyPage.es.reasonCoverageRegression,
    VALIDATION_BLOCKER: wordingWeeklyPage.es.reasonValidationBlocker,
  },
  status: { COMPLETE: wordingWeeklyPage.es.statusComplete, PARTIAL: wordingWeeklyPage.es.statusPartial, INVALID: wordingWeeklyPage.es.statusInvalid, BUDGET_EXHAUSTED: wordingWeeklyPage.es.statusBudgetExhausted },
  provenance: {
    REJECTED_VARIANT: wordingWeeklyPage.es.provenanceRejectedVariant, SELECTED_ADVISORY: wordingWeeklyPage.es.worthALook, SCOPE_OR_GAP: wordingWeeklyPage.es.provenanceScopeOrGap,
    RETAINED_ASSIGNMENT: wordingWeeklyPage.es.provenanceRetainedAssignment, SELECTED_ASSIGNMENT: wordingWeeklyPage.es.provenanceSelectedAssignment,
  },
  locationState: { INCLUDED: wordingWeeklyPage.es.locationStateIncluded, PUBLISHED: wordingWeeklyPage.es.locationStatePublished, ARCHIVED: wordingWeeklyPage.es.locationStateArchived, NEEDS_SETUP: wordingWeeklyPage.es.locationStateNeedsSetup, NOT_SELECTED: wordingWeeklyPage.es.locationStateNotSelected, INACTIVE: wordingWeeklyPage.es.locationStateInactive },
  progress: { draft: wordingWeeklyPage.es.progressDraft, published: wordingWeeklyPage.es.progressPublished, mixed: wordingWeeklyPage.es.progressMixed, changed: wordingWeeklyPage.es.progressChanged, unavailable: wordingWeeklyPage.es.progressUnavailable },
  /** "16–22 nov": the week in the app's Spanish range form. */
  weekText: (monday: string) => periodText(monday, addDays(monday, 6), "es"),
  /** "20 de 24 h" for a coverage measure (covered of required). */
  coverageText: (measure: CoverageMeasure) => `${hours(measure.coveredMinutes).replace(" h", "")} de ${hours(measure.requiredMinutes)}`,
};

export const WEEKLY_COPY = { en, es } as const;
