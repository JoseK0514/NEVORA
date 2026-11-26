/* Payroll import and paid-time export (U01): every sentence of the two flows, in English and in Puerto Rico Spanish
 * ("tú", as the staff-list import and billing recovery use). The signed-in app shows English today; the Spanish is
 * rendered by the unit tests so it is ready when a language per person is decided.
 *
 * Payroll scope (locked): NEVORA keeps the amounts and shares statements; the employer pays the team outside NEVORA.
 * Three sentences are the approved ones from payroll-runs.tsx and api.ts, reused word for word and marked "(approved)".
 * Everything else here is new and listed in the hand-off for Jose and counsel. */
import type { AmountField, Disposition, FileProblem, SourceChange } from "./import-model";
import type { Hold, Missing, RunStatus, Treatment } from "./export-model";
import type { ExportRefusal } from "./recovery";

export type PayrollImportLang = "en" | "es";

/** Whole numbers with a thousands separator ("1,140"), as both languages write them in Puerto Rico. */
const num = (n: number) => n.toLocaleString("en-US");
const count = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;
const list = (names: string[], and: string, more: (n: number) => string) => {
  const shown = names.slice(0, 3), rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} ${and} ${more(rest)}`;
  return shown.length <= 1 ? shown.join("") : `${shown.slice(0, -1).join(", ")} ${and} ${shown[shown.length - 1]}`;
};

const en = {
  locale: "en-US",
  common: {
    payroll: "Payroll", timeExports: "Time exports", back: "Back", cancel: "Cancel", tryAgain: "Try again", signIn: "Sign in",
    stepOf: (step: number, total: number, name: string) => `Step ${step} of ${total} · ${name}`,
    loading: "Loading…",
    offlineTitle: "You’re offline",
    offlineLine: "Your work is kept on this device until you close this page. Reconnect to save it.",
    deniedTitle: "Your access to this page ended", deniedLine: "Nothing more was sent. Ask an Owner if you still need it.",
    signedOutTitle: "Your session ended", signedOutLine: "Sign in again. Nothing more was sent.",
    loadFailedTitle: "We couldn’t load this", loadFailedLine: "Check your connection and try again.",
    stay: "Stay on this page until this is settled.",
    receipt: "Receipt",
    people: (n: number) => count(n, "person", "people"),
  },
  imp: {
    title: "Import pay", titleCorrection: "Correct imported pay",
    steps: ["Add a file", "Match people", "Review amounts", "Confirm", "Result"],
    reviewBack: "Review payroll",
    hold: {
      missing: { title: "This payroll isn’t available", line: "It may have been replaced by a newer revision.", action: "Go to Payroll" },
      // Phase 8 (a.md #9): opened with no payroll chosen, the page says so instead of suggesting a newer revision.
      noRun: { title: "Choose a payroll to import into", line: "Open a payroll from Payroll, then choose Import pay.", action: "Go to Payroll" },
      native: { title: "This payroll doesn’t take imported amounts", line: "It is calculated in NEVORA from recorded time.", action: "Review payroll" },
      noTeam: { title: "There is nobody on the team yet", line: "Add your team before you import their pay.", action: "Open Team" },
      tooManyPeople: { title: "This team is over the import limit", line: "An import covers up to 300 people.", action: "Go to Payroll" },
      pending: { title: "Another payroll action is still being checked", line: "Finish checking it on Review payroll before you start an import.", action: "Review payroll" },
    },
    add: {
      heading: "Add the file from your payroll system",
      lead: (period: string) => `Use the file with each person’s pay for ${period}. NEVORA keeps these amounts as they are. It doesn’t calculate or change them.`,
      needs: "What the file needs",
      needsCsv: "A CSV with these five columns, in this order:",
      needsList: ["One row per person, with the person’s NEVORA ID.", "Amounts in dollars with up to two decimals, like 1000.01. No $ signs and no commas.", "Up to 300 people and 256 KB.", "A JSON file in the NEVORA payroll import format also works, up to 512 KB."],
      exampleCaption: "Example",
      starter: "Download a starter file", starterHelp: "A CSV with your team’s IDs and zero amounts.",
      drop: "Drop the file here", or: "or", choose: "Choose a file", another: "Choose another file",
      fileLabel: "Pay file (CSV or JSON)",
      loaded: (name: string, people: number) => `${name} is loaded. ${count(people, "row", "rows")}.`,
      reading: "Reading the file…",
      sourceName: "Payroll system", sourceNameHelp: "The system or accountant these amounts come from.",
      sourceReference: "Report or reference", sourceReferenceHelp: "The report name or number on their side, so you can find it later.",
      fromFile: (name: string, reference: string) => `From ${name}, reference ${reference}.`,
      reason: "Reason for the correction", reasonHelp: "Up to 300 characters. It is kept with the corrected payroll.",
      settle: "If pay changes, settle the difference with the employee outside NEVORA.", // (approved)
      next: "Match people",
      needFile: "Add a file to continue.", needSource: "Enter the payroll system and its reference to continue.", needReason: "Enter the reason for the correction to continue.",
      sourceInvalid: "Use 1 to 300 characters on one line",
      periodMismatch: (period: string, payday: string) => `This file is for a different pay period or payday. This payroll is ${period}, payday ${payday}.`,
    },
    problem: (problem: FileProblem): string => {
      switch (problem.code) {
        case "wrongType": return "This file isn’t a CSV or JSON file. Choose a file that ends in .csv or .json.";
        case "empty": return "This file is empty. Choose the file with the pay amounts.";
        case "tooBig": return `This file is over the limit of ${problem.limitKb} KB. Ask for a file with only this pay period.`;
        case "tooManyRows": return "This file has more than 300 people. An import covers up to 300.";
        case "wrongColumns": return "The columns don’t match. The first line must be exactly: employeeId,gross,employeeDeductions,employerContributions,net";
        case "extraColumns": return "A row has more than five columns. Remove the extra columns and add the file again.";
        case "cellTooLong": return "A value is longer than 200 characters. Shorten it and add the file again.";
        case "quoting": return "A quotation mark in the file isn’t closed. Save the file as CSV again and add it.";
        case "lineEnding": return "The file’s line endings can’t be read. Save it as CSV (comma separated) and add it again.";
        case "badAmount": return `Row ${problem.row}, ${problem.column}: use dollars with up to two decimals, like 1000.01. No $ signs, commas or negative amounts.`;
        case "rowShape": return `Row ${problem.row} doesn’t have five values. Every value is needed, zero included.`;
        case "notJson": return "This JSON file can’t be read. Export it again from your payroll system.";
        case "jsonShape": return "This JSON file isn’t in the NEVORA payroll import format. It needs the pay period, payday, a source and reference, and whole-cent amounts for each person.";
        case "unreadable": return "This file can’t be read. Save it as CSV and add it again.";
      }
    },
    match: {
      heading: "Match each row to a person",
      lead: "A row is matched for you only when its ID is exactly a person’s NEVORA ID. Match the rest yourself.",
      summary: (matched: number, rows: number) => `${matched} of ${count(rows, "row", "rows")} matched`,
      toMatch: (n: number) => `${n} to match`, twice: (n: number) => `${n} matched twice`,
      rowsTitle: "Rows in the file",
      row: (n: number, id: string) => `Row ${n} · ID ${id}`,
      amounts: (gross: string, net: string) => `Gross ${gross} · Net ${net}`,
      byId: "Matched by ID", byYou: "Matched by you", notMatched: "Not matched", matchedTwice: "Matched twice",
      twiceLine: (name: string) => `${name} has more than one row. A person can have only one.`,
      person: "Person", personFor: (n: number) => `Person for row ${n}`, searchPlaceholder: "Search by name or ID",
      noResults: "Nobody on the team matches that.", taken: "Has a row", clear: "Clear match", inactive: "Inactive",
      nobodyTitle: "No row matches anyone on the team", nobodyLine: "The IDs in this file aren’t NEVORA IDs. Match each row below, or download the starter file and ask for the amounts again.",
      missingTitle: "People not in the file",
      missingLead: "Choose what happens with each person. They are saved with $0.00 so nobody is left out without a reason.",
      missingNone: "Everyone on the team has a row.",
      choiceFor: (name: string) => `What happens with ${name}`,
      disposition: { NOT_PAID: "Not paid this period", INACTIVE: "Inactive", LEFT_OUT: "Left out of this payroll" } satisfies Record<Disposition, string>,
      undecided: (n: number) => `${n} to decide`,
      next: "Review amounts",
      blocked: (unmatched: number, twice: number, undecided: number) => [unmatched ? `Match ${count(unmatched, "more row", "more rows")}` : "", twice ? `fix ${count(twice, "row", "rows")} matched twice` : "", undecided ? `choose for ${count(undecided, "person", "people")} not in the file` : ""].filter(Boolean).join(", ").replace(/^./, first => first.toUpperCase()) + " to continue.",
    },
    review: {
      heading: "Check each amount",
      lead: "These are the amounts from the file, to the cent. Select an amount to correct it. The file’s value stays visible and you can undo.",
      columns: { person: "Person", gross: "Gross", deductions: "Deductions", contributions: "Employer contributions", net: "Net" } satisfies Record<AmountField | "person", string>,
      edit: (field: string, name: string) => `Correct ${field.toLowerCase()} for ${name}`,
      amountFor: (field: string, name: string) => `${field} for ${name}, in dollars`,
      was: (amount: string) => `File: ${amount}`, undo: "Undo", undoFor: (field: string, name: string) => `Undo the correction to ${field.toLowerCase()} for ${name}`,
      done: "Done", invalid: "Use dollars with up to two decimals, like 1000.01",
      locked: { itemised: "The file lists this in several lines. Correct it in the file and add it again.", earnings: "The file lists earnings that add up to this gross. Correct it in the file and add it again." },
      gap: (amount: string) => `Gross minus deductions should equal net. This row is off by ${amount}.`,
      changedRow: "Corrected",
      totals: "Totals", fromFile: "From the file", afterChanges: "After your corrections", difference: "Difference",
      reconciles: "The totals match the file.", differs: (n: number) => `${count(n, "row was", "rows were")} corrected, so the totals differ from the file by the amounts shown.`,
      zeroTitle: "Saved with $0.00", zeroLine: (name: string, reason: string) => `${name} · ${reason}`,
      next: "Check and save",
      blocked: (n: number) => `${count(n, "row doesn’t", "rows don’t")} add up. Correct ${n === 1 ? "it" : "them"} to continue.`,
    },
    confirm: {
      heading: "Save these amounts", headingCorrection: "Save this correction",
      people: "People", peopleValue: (total: number, fromFile: number, zero: number) => zero ? `${total} (${fromFile} from the file, ${zero} at $0.00)` : String(total),
      net: "Net pay", gross: "Gross pay", period: "Pay period", payday: "Scheduled payday", source: "From", file: "File", reason: "Reason",
      asUploaded: (name: string) => `${name}, saved exactly as you uploaded it.`,
      asReviewed: (name: string, corrected: number, rematched: number, added: number) => `The amounts you reviewed are saved, not the file itself (${[corrected ? count(corrected, "row corrected", "rows corrected") : "", rematched ? count(rematched, "row matched by you", "rows matched by you") : "", added ? `${count(added, "person", "people")} added at $0.00` : ""].filter(Boolean).join(", ")}). Keep ${name} for your records.`,
      nextTitle: "What happens next",
      next: ["The amounts are saved to this payroll.", "You review and approve the payroll before any pay statement is shared."],
      nextCorrection: ["A corrected payroll is created and linked to the approved one.", "You review and approve it before any corrected statement is shared."],
      notTitle: "What doesn’t happen",
      not: ["NEVORA doesn’t pay anyone or send taxes.", "Nothing is shared with your team yet."], // first line (approved)
      save: "Save amounts", saveCorrection: "Save correction",
      tooBig: "These amounts are over the size the server accepts (1 MB). Import fewer lines per person.",
    },
    result: {
      sendingTitle: "Saving the amounts…", sendingLine: "Keep this page open.",
      savedTitle: "Amounts saved", savedLine: (people: number, period: string) => `${count(people, "person", "people")} for ${period}. Review the payroll before you approve it. Nobody has been paid.`,
      savedCorrectionTitle: "Correction saved", savedCorrectionLine: (period: string) => `A corrected payroll for ${period} is ready to review. Nothing has been shared or paid.`,
      review: "Review payroll",
      refusedTitle: "The amounts were not saved", refusedNothing: "Nothing was saved. Your work is still here.",
      fix: { amounts: "Back to the amounts", match: "Back to matching", file: "Back to the file", included: "Choose who’s included", timecards: "Open Timecards", settings: "Open payroll settings", payroll: "Go to Payroll" },
      unknownTitle: "We couldn’t confirm the save",
      unknownLine: "The amounts may or may not be saved. Check before you do anything else. This page keeps the exact amounts you sent.",
      noReceipt: "There is no record of it yet. It can still arrive. Check again, or send the same amounts again: sending them again can’t save them twice.",
      checkFailed: "We couldn’t check. Your connection may be down. Try again.",
      check: "Check again", checking: "Checking…", resend: "Send the same amounts again",
      neverChanged: "A changed file is never sent under the same receipt.",
      blockedTitle: "This import needs a person to look at it", blockedLine: "The server has a different request under this receipt. Nothing was replaced. Open Review payroll to see what was saved.",
      reason: (code: string, issues: string[]): string => {
        const issue = issues[0] ?? "";
        switch (code) {
          case "INVALID_PAYROLL_INPUT": return issue === "rows.population" ? "The team changed. Everyone on the team must be in the import, once."
            : /netMinor$/.test(issue) ? "A row doesn’t add up: gross minus deductions must equal net."
            : /employeeId$/.test(issue) ? "A person appears twice, or an ID isn’t on the team."
            : issue === "period" || issue === "payday" ? "The pay period or payday isn’t valid for this payroll."
            : issue === "source" ? "The payroll system or its reference isn’t valid. Use 1 to 300 characters on one line."
            : "The server didn’t accept one of the values. Check the amounts.";
          case "REVISION_CONFLICT": return "This payroll changed while you worked. Check your amounts against the current payroll and save again.";
          case "RUN_STATE_CONFLICT": return "This payroll was approved or changed while you worked, so it no longer takes this import.";
          case "IMPORT_PERIOD_CONFLICT": return "The pay period or payday in the file isn’t this payroll’s.";
          case "POPULATION_REVIEW_REQUIRED": return "First choose who’s included in this pay period. That is done on Time exports.";
          case "POPULATION_SOURCE_CONFLICT": return "The team or the timecards changed after you chose who’s included. Review who’s included again.";
          case "SOURCE_CONFLICT": case "REVIEW_CONFLICT": return "The timecards or the team changed while this was being saved. Check the payroll and save again.";
          case "FINALIZED_TIME_REQUIRED": return "Finalize the included employee timecards before approving payroll."; // (approved)
          case "SETTINGS_REQUIRED": return "Save company payroll settings before preparing this payroll run."; // (approved)
          case "NATIVE_AMOUNT_INPUT_FORBIDDEN": return "This payroll is calculated in NEVORA from recorded time, so it doesn’t take imported amounts.";
          case "RUN_UNAVAILABLE": return "This payroll isn’t available. It may have been replaced by a newer revision.";
          default: return "The server didn’t accept this import. Check the payroll and try again.";
        }
      },
    },
    changed: {
      title: "Something changed while you worked", kept: "Your matches and corrections are kept where they still apply.",
      line: (change: SourceChange): string => {
        switch (change.kind) {
          case "peopleAdded": return `Added to the team: ${list(change.names, "and", n => `${n} more`)}. Choose what happens with them on Match people.`;
          case "peopleRemoved": return `No longer on the team: ${list(change.names, "and", n => `${n} more`)}. Rows matched to them need a new match.`;
          case "payrollUpdated": return "This payroll was updated. Your amounts will be saved to the current version.";
          case "periodChanged": return "The pay period or payday of this payroll changed. Check that the file is for the new dates.";
          case "nowApproved": return "This payroll was approved. Saving these amounts will now be a correction and needs a reason.";
          case "noLongerOpen": return "This payroll is no longer available. Go to Payroll to find the current one.";
        }
      },
      dismiss: "OK",
    },
    entry: {
      title: "Import pay from another payroll system", titleCorrection: "Correct the imported amounts",
      line: "Add a CSV or JSON file, match each row to a person and check every amount to the cent.",
      lineCorrection: "Add the corrected file. A linked payroll is created for you to review.",
      action: "Import pay", actionCorrection: "Start a correction",
    },
  },
  exp: {
    title: "Paid time export",
    steps: ["Review breaks", "Plan", "Send", "Finish"],
    hold: {
      title: (hold: Hold): string => {
        switch (hold.kind) {
          case "peopleNotReviewed": return "Choose who’s included first";
          case "peopleChanged": return "The team or the timecards changed";
          case "tooManyPeople": return "This team is over the export limit";
          case "notFinalized": return `Finalize ${count(hold.names.length, "timecard", "timecards")} first`;
          case "alreadyComplete": return "This period is already complete";
        }
      },
      line: (hold: Hold): string => {
        switch (hold.kind) {
          case "peopleNotReviewed": return "Go through everyone on the team for this period, then come back.";
          case "peopleChanged": return "The export uses exactly the list of who’s included.";
          case "tooManyPeople": return "A paid time export covers up to 300 people.";
          case "notFinalized": return `Still open: ${list(hold.names, "and", n => `${n} more`)}. Paid time is exported only from finalized timecards.`;
          case "alreadyComplete": return "The server already has a complete record of this period.";
        }
      },
      action: (hold: Hold): string => hold.kind === "notFinalized" ? "Open Timecards" : hold.kind === "tooManyPeople" ? "Go to Payroll" : hold.kind === "alreadyComplete" ? "See the files" : "Review who’s included",
    },
    breaks: {
      heading: "Decide every recorded break",
      lead: "Recorded time doesn’t say what is paid. Choose how each break is paid. NEVORA doesn’t choose for you and doesn’t decide what the law requires.",
      attest: "Choosing “Unpaid meal” is your statement that the person was fully relieved of duty for that break.",
      workedThrough: "Choose “Worked through break” if the person worked the entire break. The full interval counts toward paid hours.",
      partialWork: "If they worked only part of a break, request a break correction before exporting.",
      correction: "Request a break correction",
      correctionFor: (name: string) => `Request a break correction for ${name}`,
      originalPunch: (when: string) => `Original break punch · ${when}`,
      originalOpenPunch: (when: string) => `Original break punch · ${when} · No end punch`,
      progress: (decided: number, total: number) => `${num(decided)} of ${count(total, "break", "breaks")} decided`,
      undecided: (n: number) => `${num(n)} to decide`,
      personBreaks: (n: number) => count(n, "break", "breaks"), personNone: "No breaks recorded", personDone: "All decided",
      recordedAs: (label: string, place: string) => `Recorded as ${label} · ${place}`,
      choiceFor: (name: string, when: string) => `How the break of ${name} on ${when} is paid`,
      treatment: { PAID_REST: "Paid rest", UNPAID_RELIEVED_MEAL: "Unpaid meal", PAID_AS_WORKED: "Worked through break" } satisfies Record<Treatment, string>,
      noneTitle: "No breaks were recorded in this period", noneLine: "The export says so. Paid time equals recorded time for everyone.",
      nobodyTitle: "Nobody is included in this period", nobodyLine: "There are no hours to export. You can still confirm the period at the last step.",
      next: "Plan the export",
      blocked: (n: number) => `Decide ${count(n, "more break", "more breaks")} to continue.`,
      overLimit: "One person has more than 1,000 breaks in this period. Export a shorter period for them on Time exports.",
      lockedLine: "A batch was already sent, so these choices can’t change in this export.",
    },
    plan: {
      heading: "How the export will be sent",
      lead: "People are grouped so each file stays under the size limit. A person is never split between two batches.",
      batch: (index: number, total: number, people: number) => `Batch ${index} of ${total} · ${count(people, "person", "people")}`,
      detail: (names: string, breaks: number, kb: string) => `${names} · ${count(breaks, "break", "breaks")} · ${kb} KB`,
      names: (names: string[]) => list(names, "and", n => `${n} more`),
      covered: (included: number, zero: number, excluded: number) => `${count(included, "person", "people")} included · ${zero} with no time · ${excluded} left out`,
      planning: "Planning the batches…",
      noBatches: "Nobody is included, so there is nothing to send. Go on to confirm the period.",
      tooBigTitle: "One person’s breaks don’t fit in a single file", tooBigLine: "NEVORA doesn’t split a person between files. Export a shorter period for them on Time exports.",
      coverageTitle: "The people in this period changed", coverageLine: "Review who’s included again on Time exports, then start the export again.",
      next: "Go to sending", fixedNote: "Once the first batch is sent, the plan and the break choices are fixed for this export.",
    },
    run: {
      heading: "Send each batch",
      lead: "Batches go one at a time. Each one is saved only when the server’s reply is checked against what was sent.",
      status: { waiting: "Waiting", sending: "Sending…", saved: "Saved", unknown: "Not confirmed", refused: "Not accepted", blocked: "Stopped" } satisfies Record<RunStatus, string>,
      sendAll: "Send batches", sendRest: "Continue sending", sending: "Sending…",
      checkBatch: "Check this batch", checkBatchFor: (index: number) => `Check this batch, batch ${index}`,
      download: "Download CSV", downloadFor: (index: number) => `Download CSV, batch ${index}`,
      unknownLine: "The reply didn’t arrive or couldn’t be verified. Checking sends the exact same file again, so it can’t be saved twice. A changed file is never sent under the same receipt.",
      conflictLine: "The timecards, the people or the file format changed after this plan was made, and the server has no record of this batch. This plan stops here. Start a new export from Time exports.",
      duplicateLine: "These hours were already exported under a different receipt, which can’t stand in for this batch. This plan stops here. Open Time exports to see the files that were sent.",
      refusal: {
        LEGACY_MAPPING_REVIEW_REQUIRED: "The saved file format needs a review on Time exports before it can be used.",
        BREAK_CLASSIFICATION_REVIEW_REQUIRED: "The breaks in this batch changed. Start a new export and decide them again.",
        PAID_TIME_REVIEW_REQUIRED: "The break choices are needed for paid hours. Start a new export.",
        INEXACT_HOURS: "Some hours can’t be written exactly with the file’s decimals, and NEVORA doesn’t round for you. Choose a rounding rule in the file format on Time exports.",
        PROVIDER_EMPLOYEE_MAPPING_REQUIRED: "Someone in this batch has no ID for your payroll system. Add it in the file format on Time exports.",
        FINALIZED_TIMECARDS_REQUIRED: "A timecard in this batch is no longer finalized. Finalize it, then start a new export.",
        INVALID: "The server didn’t accept this batch. Start a new export from Time exports.",
      } satisfies Record<ExportRefusal, string>,
      next: "Go to finish", allSaved: "Every batch is saved.",
      progress: (saved: number, total: number) => `${saved} of ${count(total, "batch", "batches")} saved`,
    },
    finish: {
      heading: "Finish",
      incompleteTitle: "Not complete yet",
      missing: (item: Missing, total: number): string => item.kind === "batch"
        ? `Batch ${item.index} of ${total} (${count(item.count, "person", "people")}) ${item.status === "waiting" ? "hasn’t been sent" : item.status === "sending" ? "is being sent" : item.status === "unknown" ? "is not confirmed" : item.status === "refused" ? "was not accepted" : "is stopped"}.`
        : item.status === "waiting" ? "The server hasn’t confirmed the period yet." : item.status === "sending" ? "The server is confirming the period." : item.status === "unknown" ? "The server’s confirmation of the period didn’t arrive." : "The server didn’t confirm the period.",
      backToRun: "Back to the batches",
      confirm: "Confirm the period", confirming: "Confirming…", check: "Check again",
      confirmLead: "Every batch is saved. The last step asks the server to check that they cover exactly the people included in this period.",
      unknownLine: "The confirmation didn’t arrive. Checking sends the exact same request again.",
      refusedLine: "The people, the finalized time or an export changed, so this plan can’t be confirmed. Its saved batches stay on record. Review the period on Time exports.",
      completeTitle: "Paid time export is complete",
      completeLine: (people: number, batches: number, period: string) => `${count(people, "person", "people")} in ${count(batches, "batch", "batches")} for ${period}. Every batch is saved and the server’s record of the period matches them.`,
      scope: "This is a record of hours. It doesn’t show that a file was loaded into your payroll system, and NEVORA doesn’t pay anyone.",
      openExports: "Open Time exports",
    },
    changed: { title: "The timecards or the people changed", line: (dropped: number) => dropped ? `Your choices are kept, except ${count(dropped, "break that is", "breaks that are")} no longer there.` : "Your break choices are kept.", dismiss: "OK" },
    entry: { title: "Paid time export", line: "Decide every recorded break, then send the hours in batches." },
  },
};

export type PayrollImportCopy = typeof en;

const es: PayrollImportCopy = {
  locale: "es-PR",
  common: {
    payroll: "Nómina", timeExports: "Exportar horas", back: "Atrás", cancel: "Cancelar", tryAgain: "Intentar de nuevo", signIn: "Iniciar sesión",
    stepOf: (step, total, name) => `Paso ${step} de ${total} · ${name}`,
    loading: "Cargando…",
    offlineTitle: "No tienes conexión",
    offlineLine: "Tu trabajo se guarda en este dispositivo hasta que cierres esta página. Vuelve a conectarte para guardarlo.",
    deniedTitle: "Tu acceso a esta página terminó", deniedLine: "No se envió nada más. Pregúntale a un dueño si todavía lo necesitas.",
    signedOutTitle: "Tu sesión terminó", signedOutLine: "Inicia sesión otra vez. No se envió nada más.",
    loadFailedTitle: "No pudimos cargar esto", loadFailedLine: "Revisa tu conexión e intenta de nuevo.",
    stay: "Quédate en esta página hasta que esto se resuelva.",
    receipt: "Recibo",
    people: n => count(n, "persona", "personas"),
  },
  imp: {
    title: "Importar pagos", titleCorrection: "Corregir pagos importados",
    steps: ["Añade un archivo", "Empareja personas", "Revisa las cantidades", "Confirma", "Resultado"],
    reviewBack: "Revisar nómina",
    hold: {
      missing: { title: "Esta nómina no está disponible", line: "Puede que una revisión más reciente la haya reemplazado.", action: "Ir a Nómina" },
      noRun: { title: "Elige una nómina para importar", line: "Abre una nómina desde Nómina y elige Importar pagos.", action: "Ir a Nómina" },
      native: { title: "Esta nómina no acepta cantidades importadas", line: "Se calcula en NEVORA con el tiempo registrado.", action: "Revisar nómina" },
      noTeam: { title: "Todavía no hay nadie en el equipo", line: "Añade a tu equipo antes de importar sus pagos.", action: "Abrir Equipo" },
      tooManyPeople: { title: "Este equipo pasa del límite de importación", line: "Una importación cubre hasta 300 personas.", action: "Ir a Nómina" },
      pending: { title: "Otra acción de nómina todavía se está verificando", line: "Termina de verificarla en Revisar nómina antes de empezar una importación.", action: "Revisar nómina" },
    },
    add: {
      heading: "Añade el archivo de tu sistema de nómina",
      lead: period => `Usa el archivo con el pago de cada persona para ${period}. NEVORA guarda estas cantidades tal como están. No las calcula ni las cambia.`,
      needs: "Lo que necesita el archivo",
      needsCsv: "Un CSV con estas cinco columnas, en este orden:",
      needsList: ["Una fila por persona, con el ID de la persona en NEVORA.", "Cantidades en dólares con hasta dos decimales, como 1000.01. Sin signo de $ y sin comas.", "Hasta 300 personas y 256 KB.", "También sirve un archivo JSON en el formato de importación de nómina de NEVORA, de hasta 512 KB."],
      exampleCaption: "Ejemplo",
      starter: "Descargar un archivo inicial", starterHelp: "Un CSV con los ID de tu equipo y cantidades en cero.",
      drop: "Suelta el archivo aquí", or: "o", choose: "Elegir un archivo", another: "Elegir otro archivo",
      fileLabel: "Archivo de pagos (CSV o JSON)",
      loaded: (name, people) => `${name} está cargado. ${count(people, "fila", "filas")}.`,
      reading: "Leyendo el archivo…",
      sourceName: "Sistema de nómina", sourceNameHelp: "El sistema o el contador de donde vienen estas cantidades.",
      sourceReference: "Informe o referencia", sourceReferenceHelp: "El nombre o número del informe en su sistema, para encontrarlo después.",
      fromFile: (name, reference) => `De ${name}, referencia ${reference}.`,
      reason: "Razón de la corrección", reasonHelp: "Hasta 300 caracteres. Se guarda con la nómina corregida.",
      settle: "Si el pago cambia, resuelve la diferencia con la persona fuera de NEVORA.",
      next: "Emparejar personas",
      needFile: "Añade un archivo para continuar.", needSource: "Escribe el sistema de nómina y su referencia para continuar.", needReason: "Escribe la razón de la corrección para continuar.",
      sourceInvalid: "Usa de 1 a 300 caracteres en una sola línea",
      periodMismatch: (period, payday) => `Este archivo es de otro período de pago o de otro día de pago. Esta nómina es ${period}, día de pago ${payday}.`,
    },
    problem: (problem): string => {
      switch (problem.code) {
        case "wrongType": return "Este archivo no es CSV ni JSON. Elige un archivo que termine en .csv o .json.";
        case "empty": return "Este archivo está vacío. Elige el archivo con las cantidades de pago.";
        case "tooBig": return `Este archivo pasa del límite de ${problem.limitKb} KB. Pide un archivo solo con este período de pago.`;
        case "tooManyRows": return "Este archivo tiene más de 300 personas. Una importación cubre hasta 300.";
        case "wrongColumns": return "Las columnas no coinciden. La primera línea tiene que ser exactamente: employeeId,gross,employeeDeductions,employerContributions,net";
        case "extraColumns": return "Una fila tiene más de cinco columnas. Quita las columnas de más y añade el archivo otra vez.";
        case "cellTooLong": return "Un valor tiene más de 200 caracteres. Acórtalo y añade el archivo otra vez.";
        case "quoting": return "Hay unas comillas sin cerrar en el archivo. Guárdalo como CSV otra vez y añádelo.";
        case "lineEnding": return "No se pueden leer los saltos de línea del archivo. Guárdalo como CSV (separado por comas) y añádelo otra vez.";
        case "badAmount": return `Fila ${problem.row}, ${problem.column}: usa dólares con hasta dos decimales, como 1000.01. Sin signo de $, comas ni cantidades negativas.`;
        case "rowShape": return `La fila ${problem.row} no tiene cinco valores. Hace falta cada valor, también los ceros.`;
        case "notJson": return "No se puede leer este archivo JSON. Expórtalo otra vez desde tu sistema de nómina.";
        case "jsonShape": return "Este archivo JSON no está en el formato de importación de nómina de NEVORA. Necesita el período de pago, el día de pago, una fuente con su referencia y cantidades en centavos enteros para cada persona.";
        case "unreadable": return "No se puede leer este archivo. Guárdalo como CSV y añádelo otra vez.";
      }
    },
    match: {
      heading: "Empareja cada fila con una persona",
      lead: "Una fila se empareja sola únicamente cuando su ID es exactamente el ID de una persona en NEVORA. Empareja las demás tú.",
      summary: (matched, rows) => `${matched} de ${count(rows, "fila emparejada", "filas emparejadas")}`,
      toMatch: n => `${n} por emparejar`, twice: n => `${n} emparejadas dos veces`,
      rowsTitle: "Filas del archivo",
      row: (n, id) => `Fila ${n} · ID ${id}`,
      amounts: (gross, net) => `Bruto ${gross} · Neto ${net}`,
      byId: "Emparejada por ID", byYou: "Emparejada por ti", notMatched: "Sin emparejar", matchedTwice: "Emparejada dos veces",
      twiceLine: name => `${name} tiene más de una fila. Una persona solo puede tener una.`,
      person: "Persona", personFor: n => `Persona para la fila ${n}`, searchPlaceholder: "Busca por nombre o ID",
      noResults: "Nadie del equipo coincide con eso.", taken: "Ya tiene fila", clear: "Quitar emparejamiento", inactive: "Inactiva",
      nobodyTitle: "Ninguna fila coincide con alguien del equipo", nobodyLine: "Los ID de este archivo no son ID de NEVORA. Empareja cada fila abajo, o descarga el archivo inicial y pide las cantidades otra vez.",
      missingTitle: "Personas que no están en el archivo",
      missingLead: "Elige qué pasa con cada persona. Se guardan con $0.00 para que nadie quede fuera sin una razón.",
      missingNone: "Todas las personas del equipo tienen una fila.",
      choiceFor: name => `Qué pasa con ${name}`,
      disposition: { NOT_PAID: "Sin pago en este período", INACTIVE: "Inactiva", LEFT_OUT: "Fuera de esta nómina" },
      undecided: n => `${n} por decidir`,
      next: "Revisar cantidades",
      blocked: (unmatched, twice, undecided) => [unmatched ? `Empareja ${count(unmatched, "fila más", "filas más")}` : "", twice ? `corrige ${count(twice, "fila emparejada", "filas emparejadas")} dos veces` : "", undecided ? `elige para ${count(undecided, "persona", "personas")} que no ${undecided === 1 ? "está" : "están"} en el archivo` : ""].filter(Boolean).join(", ").replace(/^./, first => first.toUpperCase()) + " para continuar.",
    },
    review: {
      heading: "Revisa cada cantidad",
      lead: "Estas son las cantidades del archivo, al centavo. Selecciona una cantidad para corregirla. El valor del archivo sigue a la vista y puedes deshacer el cambio.",
      columns: { person: "Persona", gross: "Bruto", deductions: "Deducciones", contributions: "Aportaciones patronales", net: "Neto" },
      edit: (field, name) => `Corregir ${field.toLowerCase()} de ${name}`,
      amountFor: (field, name) => `${field} de ${name}, en dólares`,
      was: amount => `Archivo: ${amount}`, undo: "Deshacer", undoFor: (field, name) => `Deshacer la corrección de ${field.toLowerCase()} de ${name}`,
      done: "Listo", invalid: "Usa dólares con hasta dos decimales, como 1000.01",
      locked: { itemised: "El archivo detalla esto en varias líneas. Corrígelo en el archivo y añádelo otra vez.", earnings: "El archivo detalla ingresos que suman este bruto. Corrígelo en el archivo y añádelo otra vez." },
      gap: amount => `El bruto menos las deducciones tiene que ser igual al neto. Esta fila se pasa por ${amount}.`,
      changedRow: "Corregida",
      totals: "Totales", fromFile: "Del archivo", afterChanges: "Con tus correcciones", difference: "Diferencia",
      reconciles: "Los totales coinciden con el archivo.", differs: n => `${count(n, "fila se corrigió", "filas se corrigieron")}, así que los totales difieren del archivo por las cantidades que se muestran.`,
      zeroTitle: "Se guardan con $0.00", zeroLine: (name, reason) => `${name} · ${reason}`,
      next: "Verificar y guardar",
      blocked: n => `${count(n, "fila no cuadra", "filas no cuadran")}. ${n === 1 ? "Corrígela" : "Corrígelas"} para continuar.`,
    },
    confirm: {
      heading: "Guarda estas cantidades", headingCorrection: "Guarda esta corrección",
      people: "Personas", peopleValue: (total, fromFile, zero) => zero ? `${total} (${fromFile} del archivo, ${zero} con $0.00)` : String(total),
      net: "Pago neto", gross: "Pago bruto", period: "Período de pago", payday: "Día de pago programado", source: "De", file: "Archivo", reason: "Razón",
      asUploaded: name => `${name}, guardado exactamente como lo subiste.`,
      asReviewed: (name, corrected, rematched, added) => `Se guardan las cantidades que revisaste, no el archivo (${[corrected ? count(corrected, "fila corregida", "filas corregidas") : "", rematched ? count(rematched, "fila emparejada por ti", "filas emparejadas por ti") : "", added ? `${count(added, "persona añadida", "personas añadidas")} con $0.00` : ""].filter(Boolean).join(", ")}). Guarda ${name} para tus récords.`,
      nextTitle: "Qué pasa después",
      next: ["Las cantidades se guardan en esta nómina.", "Tú revisas y apruebas la nómina antes de que se comparta algún talonario."],
      nextCorrection: ["Se crea una nómina corregida, enlazada a la aprobada.", "Tú la revisas y la apruebas antes de que se comparta algún talonario corregido."],
      notTitle: "Qué no pasa",
      not: ["NEVORA no le paga a nadie ni envía contribuciones.", "Todavía no se comparte nada con tu equipo."],
      save: "Guardar cantidades", saveCorrection: "Guardar corrección",
      tooBig: "Estas cantidades pasan del tamaño que acepta el servidor (1 MB). Importa menos líneas por persona.",
    },
    result: {
      sendingTitle: "Guardando las cantidades…", sendingLine: "Deja esta página abierta.",
      savedTitle: "Cantidades guardadas", savedLine: (people, period) => `${count(people, "persona", "personas")} para ${period}. Revisa la nómina antes de aprobarla. No se le ha pagado a nadie.`,
      savedCorrectionTitle: "Corrección guardada", savedCorrectionLine: period => `Hay una nómina corregida para ${period} lista para revisar. No se ha compartido ni pagado nada.`,
      review: "Revisar nómina",
      refusedTitle: "Las cantidades no se guardaron", refusedNothing: "No se guardó nada. Tu trabajo sigue aquí.",
      fix: { amounts: "Volver a las cantidades", match: "Volver a emparejar", file: "Volver al archivo", included: "Elegir quién está incluido", timecards: "Abrir Tarjetas de tiempo", settings: "Abrir ajustes de nómina", payroll: "Ir a Nómina" },
      unknownTitle: "No pudimos confirmar que se guardó",
      unknownLine: "Puede que las cantidades se hayan guardado o no. Verifica antes de hacer otra cosa. Esta página guarda las cantidades exactas que enviaste.",
      noReceipt: "Todavía no hay constancia. Aún puede llegar. Verifica otra vez, o envía las mismas cantidades otra vez: enviarlas de nuevo no puede guardarlas dos veces.",
      checkFailed: "No pudimos verificar. Puede que no tengas conexión. Intenta de nuevo.",
      check: "Verificar otra vez", checking: "Verificando…", resend: "Enviar las mismas cantidades otra vez",
      neverChanged: "Un archivo cambiado nunca se envía con el mismo recibo.",
      blockedTitle: "Esta importación necesita que una persona la revise", blockedLine: "El servidor tiene otra solicitud con este recibo. No se reemplazó nada. Abre Revisar nómina para ver qué se guardó.",
      reason: (code, issues): string => {
        const issue = issues[0] ?? "";
        switch (code) {
          case "INVALID_PAYROLL_INPUT": return issue === "rows.population" ? "El equipo cambió. Todas las personas del equipo tienen que estar en la importación, una vez."
            : /netMinor$/.test(issue) ? "Una fila no cuadra: el bruto menos las deducciones tiene que ser igual al neto."
            : /employeeId$/.test(issue) ? "Una persona aparece dos veces, o un ID no está en el equipo."
            : issue === "period" || issue === "payday" ? "El período de pago o el día de pago no es válido para esta nómina."
            : issue === "source" ? "El sistema de nómina o su referencia no es válido. Usa de 1 a 300 caracteres en una sola línea."
            : "El servidor no aceptó uno de los valores. Revisa las cantidades.";
          case "REVISION_CONFLICT": return "Esta nómina cambió mientras trabajabas. Compara tus cantidades con la nómina actual y guarda otra vez.";
          case "RUN_STATE_CONFLICT": return "Esta nómina se aprobó o cambió mientras trabajabas, así que ya no acepta esta importación.";
          case "IMPORT_PERIOD_CONFLICT": return "El período de pago o el día de pago del archivo no es el de esta nómina.";
          case "POPULATION_REVIEW_REQUIRED": return "Primero elige quién está incluido en este período de pago. Eso se hace en Exportar horas.";
          case "POPULATION_SOURCE_CONFLICT": return "El equipo o las tarjetas de tiempo cambiaron después de que elegiste quién está incluido. Revisa otra vez quién está incluido.";
          case "SOURCE_CONFLICT": case "REVIEW_CONFLICT": return "Las tarjetas de tiempo o el equipo cambiaron mientras esto se guardaba. Revisa la nómina y guarda otra vez.";
          case "FINALIZED_TIME_REQUIRED": return "Finaliza las tarjetas de tiempo de las personas incluidas antes de aprobar la nómina.";
          case "SETTINGS_REQUIRED": return "Guarda los ajustes de nómina de la empresa antes de preparar esta nómina.";
          case "NATIVE_AMOUNT_INPUT_FORBIDDEN": return "Esta nómina se calcula en NEVORA con el tiempo registrado, así que no acepta cantidades importadas.";
          case "RUN_UNAVAILABLE": return "Esta nómina no está disponible. Puede que una revisión más reciente la haya reemplazado.";
          default: return "El servidor no aceptó esta importación. Revisa la nómina e intenta de nuevo.";
        }
      },
    },
    changed: {
      title: "Algo cambió mientras trabajabas", kept: "Tus emparejamientos y correcciones se conservan donde todavía aplican.",
      line: (change): string => {
        switch (change.kind) {
          case "peopleAdded": return `Se añadió al equipo: ${list(change.names, "y", n => `${n} más`)}. Elige qué pasa con estas personas en Empareja personas.`;
          case "peopleRemoved": return `Ya no está en el equipo: ${list(change.names, "y", n => `${n} más`)}. Las filas emparejadas con estas personas necesitan un emparejamiento nuevo.`;
          case "payrollUpdated": return "Esta nómina se actualizó. Tus cantidades se guardarán en la versión actual.";
          case "periodChanged": return "El período de pago o el día de pago de esta nómina cambió. Verifica que el archivo sea de las fechas nuevas.";
          case "nowApproved": return "Esta nómina se aprobó. Guardar estas cantidades ahora será una corrección y necesita una razón.";
          case "noLongerOpen": return "Esta nómina ya no está disponible. Ve a Nómina para encontrar la actual.";
        }
      },
      dismiss: "Entendido",
    },
    entry: {
      title: "Importar pagos de otro sistema de nómina", titleCorrection: "Corregir las cantidades importadas",
      line: "Añade un archivo CSV o JSON, empareja cada fila con una persona y revisa cada cantidad al centavo.",
      lineCorrection: "Añade el archivo corregido. Se crea una nómina enlazada para que la revises.",
      action: "Importar pagos", actionCorrection: "Empezar una corrección",
    },
  },
  exp: {
    title: "Tiempo pagado",
    steps: ["Revisa los descansos", "Planifica", "Envía", "Termina"],
    hold: {
      title: (hold): string => {
        switch (hold.kind) {
          case "peopleNotReviewed": return "Primero elige quién está incluido";
          case "peopleChanged": return "El equipo o las tarjetas de tiempo cambiaron";
          case "tooManyPeople": return "Este equipo pasa del límite de exportación";
          case "notFinalized": return `Primero finaliza ${count(hold.names.length, "tarjeta de tiempo", "tarjetas de tiempo")}`;
          case "alreadyComplete": return "Este período ya está completo";
        }
      },
      line: (hold): string => {
        switch (hold.kind) {
          case "peopleNotReviewed": return "Repasa a todas las personas del equipo para este período y vuelve aquí.";
          case "peopleChanged": return "La exportación usa exactamente la lista de quién está incluido.";
          case "tooManyPeople": return "Una exportación de tiempo pagado cubre hasta 300 personas.";
          case "notFinalized": return `Siguen abiertas: ${list(hold.names, "y", n => `${n} más`)}. El tiempo pagado se exporta solo de tarjetas de tiempo finalizadas.`;
          case "alreadyComplete": return "El servidor ya tiene un registro completo de este período.";
        }
      },
      action: (hold): string => hold.kind === "notFinalized" ? "Abrir Tarjetas de tiempo" : hold.kind === "tooManyPeople" ? "Ir a Nómina" : hold.kind === "alreadyComplete" ? "Ver los archivos" : "Revisar quién está incluido",
    },
    breaks: {
      heading: "Decide cada descanso registrado",
      lead: "El tiempo registrado no dice qué se paga. Elige cómo se paga cada descanso. NEVORA no elige por ti y no decide lo que exige la ley.",
      attest: "Elegir «Comida sin paga» es tu declaración de que la persona quedó totalmente relevada de sus tareas durante ese descanso.",
      workedThrough: "Elige «Trabajó durante el descanso» si la persona trabajó durante todo el descanso. El intervalo completo cuenta como horas pagadas.",
      partialWork: "Si solo trabajó durante parte del descanso, solicita una corrección antes de exportar.",
      correction: "Solicitar una corrección de descanso",
      correctionFor: name => `Solicitar una corrección de descanso para ${name}`,
      originalPunch: when => `Ponche original del descanso · ${when}`,
      originalOpenPunch: when => `Ponche original del descanso · ${when} · Sin ponche de regreso`,
      progress: (decided, total) => `${num(decided)} de ${count(total, "descanso decidido", "descansos decididos")}`,
      undecided: n => `${num(n)} por decidir`,
      personBreaks: n => count(n, "descanso", "descansos"), personNone: "Sin descansos registrados", personDone: "Todos decididos",
      recordedAs: (label, place) => `Registrado como ${label} · ${place}`,
      choiceFor: (name, when) => `Cómo se paga el descanso de ${name} del ${when}`,
      treatment: { PAID_REST: "Descanso pagado", UNPAID_RELIEVED_MEAL: "Comida sin paga", PAID_AS_WORKED: "Trabajó durante el descanso" },
      noneTitle: "No se registraron descansos en este período", noneLine: "La exportación lo indica. El tiempo pagado es igual al tiempo registrado para todas las personas.",
      nobodyTitle: "No hay nadie incluido en este período", nobodyLine: "No hay horas que exportar. Aun así puedes confirmar el período en el último paso.",
      next: "Planificar la exportación",
      blocked: n => `Decide ${count(n, "descanso más", "descansos más")} para continuar.`,
      overLimit: "Una persona tiene más de 1,000 descansos en este período. Exporta un período más corto para esa persona en Exportar horas.",
      lockedLine: "Ya se envió un lote, así que estas decisiones no pueden cambiar en esta exportación.",
    },
    plan: {
      heading: "Cómo se enviará la exportación",
      lead: "Las personas se agrupan para que cada archivo quede bajo el límite de tamaño. Una persona nunca se divide entre dos lotes.",
      batch: (index, total, people) => `Lote ${index} de ${total} · ${count(people, "persona", "personas")}`,
      detail: (names, breaks, kb) => `${names} · ${count(breaks, "descanso", "descansos")} · ${kb} KB`,
      names: names => list(names, "y", n => `${n} más`),
      covered: (included, zero, excluded) => `${count(included, "persona incluida", "personas incluidas")} · ${zero} sin tiempo · ${excluded} fuera`,
      planning: "Planificando los lotes…",
      noBatches: "No hay nadie incluido, así que no hay nada que enviar. Continúa para confirmar el período.",
      tooBigTitle: "Los descansos de una persona no caben en un solo archivo", tooBigLine: "NEVORA no divide a una persona entre archivos. Exporta un período más corto para esa persona en Exportar horas.",
      coverageTitle: "Las personas de este período cambiaron", coverageLine: "Revisa otra vez quién está incluido en Exportar horas y empieza la exportación de nuevo.",
      next: "Ir a enviar", fixedNote: "Cuando se envía el primer lote, el plan y las decisiones de los descansos quedan fijos para esta exportación.",
    },
    run: {
      heading: "Envía cada lote",
      lead: "Los lotes van uno a la vez. Cada uno queda guardado solo cuando la respuesta del servidor se compara con lo que se envió.",
      status: { waiting: "En espera", sending: "Enviando…", saved: "Guardado", unknown: "Sin confirmar", refused: "No aceptado", blocked: "Detenido" },
      sendAll: "Enviar lotes", sendRest: "Seguir enviando", sending: "Enviando…",
      checkBatch: "Verificar este lote", checkBatchFor: index => `Verificar este lote, lote ${index}`,
      download: "Descargar CSV", downloadFor: index => `Descargar CSV, lote ${index}`,
      unknownLine: "La respuesta no llegó o no se pudo verificar. Verificar envía exactamente el mismo archivo otra vez, así que no puede guardarse dos veces. Un archivo cambiado nunca se envía con el mismo recibo.",
      conflictLine: "Las tarjetas de tiempo, las personas o el formato del archivo cambiaron después de hacer este plan, y el servidor no tiene constancia de este lote. Este plan se detiene aquí. Empieza una exportación nueva desde Exportar horas.",
      duplicateLine: "Estas horas ya se exportaron con otro recibo, que no puede sustituir a este lote. Este plan se detiene aquí. Abre Exportar horas para ver los archivos que se enviaron.",
      refusal: {
        LEGACY_MAPPING_REVIEW_REQUIRED: "El formato de archivo guardado necesita una revisión en Exportar horas antes de usarse.",
        BREAK_CLASSIFICATION_REVIEW_REQUIRED: "Los descansos de este lote cambiaron. Empieza una exportación nueva y decídelos otra vez.",
        PAID_TIME_REVIEW_REQUIRED: "Hacen falta las decisiones de los descansos para las horas pagadas. Empieza una exportación nueva.",
        INEXACT_HOURS: "Algunas horas no se pueden escribir exactas con los decimales del archivo, y NEVORA no redondea por ti. Elige una regla de redondeo en el formato de archivo en Exportar horas.",
        PROVIDER_EMPLOYEE_MAPPING_REQUIRED: "Alguien de este lote no tiene ID para tu sistema de nómina. Añádelo en el formato de archivo en Exportar horas.",
        FINALIZED_TIMECARDS_REQUIRED: "Una tarjeta de tiempo de este lote ya no está finalizada. Finalízala y empieza una exportación nueva.",
        INVALID: "El servidor no aceptó este lote. Empieza una exportación nueva desde Exportar horas.",
      },
      next: "Ir a terminar", allSaved: "Todos los lotes están guardados.",
      progress: (saved, total) => `${saved} de ${count(total, "lote guardado", "lotes guardados")}`,
    },
    finish: {
      heading: "Termina",
      incompleteTitle: "Todavía no está completo",
      missing: (item, total): string => item.kind === "batch"
        ? `El lote ${item.index} de ${total} (${count(item.count, "persona", "personas")}) ${item.status === "waiting" ? "no se ha enviado" : item.status === "sending" ? "se está enviando" : item.status === "unknown" ? "está sin confirmar" : item.status === "refused" ? "no fue aceptado" : "está detenido"}.`
        : item.status === "waiting" ? "El servidor todavía no ha confirmado el período." : item.status === "sending" ? "El servidor está confirmando el período." : item.status === "unknown" ? "La confirmación del período no llegó." : "El servidor no confirmó el período.",
      backToRun: "Volver a los lotes",
      confirm: "Confirmar el período", confirming: "Confirmando…", check: "Verificar otra vez",
      confirmLead: "Todos los lotes están guardados. El último paso le pide al servidor verificar que cubren exactamente a las personas incluidas en este período.",
      unknownLine: "La confirmación no llegó. Verificar envía exactamente la misma solicitud otra vez.",
      refusedLine: "Las personas, el tiempo finalizado o una exportación cambiaron, así que este plan no se puede confirmar. Sus lotes guardados quedan registrados. Revisa el período en Exportar horas.",
      completeTitle: "La exportación de tiempo pagado está completa",
      completeLine: (people, batches, period) => `${count(people, "persona", "personas")} en ${count(batches, "lote", "lotes")} para ${period}. Todos los lotes están guardados y el registro del período en el servidor coincide con ellos.`,
      scope: "Esto es un registro de horas. No demuestra que un archivo se cargó en tu sistema de nómina, y NEVORA no le paga a nadie.",
      openExports: "Abrir Exportar horas",
    },
    changed: { title: "Las tarjetas de tiempo o las personas cambiaron", line: dropped => dropped ? `Tus decisiones se conservan, menos ${count(dropped, "descanso que ya no está", "descansos que ya no están")}.` : "Tus decisiones de descansos se conservan.", dismiss: "Entendido" },
    entry: { title: "Exportar tiempo pagado", line: "Decide cada descanso registrado y envía las horas por lotes." },
  },
};

export const payrollImportCopy: Record<PayrollImportLang, PayrollImportCopy> = { en, es };
