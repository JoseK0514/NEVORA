# Wave B exit round4 — Interaction and states

**Verdict:** Not zero: **2 reproduced P2 IDs** (IS-B12,IS-B31). Other earlier IDs remain unverified where noted.

Exact app source: `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7` (remote handoff `564d193` adds documentation only). Source was detached/read-only. Fictional owned PostgreSQL17 and Next development runtime; DB adapter, bounded pool12 and generated type references are recorded in [source-manifest.json](source-manifest.json). No app edits, Claude-branch writes or server-reaching business-action browser submissions. All attempted business-action submissions were intercepted before navigation and held/aborted locally; only report POST reads were permitted.

The unchanged official checker (`e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`) completed **45/48** cells: Owner, six base routes (except Update detail),320/390,100/200%,Chromium/WebKit. [Raw checker](checks-smoke.json), [log](checks-smoke.log). This was followed by limited manual proofs after the coordinator’s CPU pause. **No full matrix or axe pass; no zero certification.** The preview and browsers are closed; source/mirror verification and PostgreSQL shutdown passed ([manifest](manifest.json)).

## Earlier IDs

| ID | Status and measured evidence |
|---|---|
| IS-B12 | **Not fixed**: Update retry success and Payroll settings pending/failure still leave BODY focused; details below. Compose offline→online retains draft and focuses Title in both Owner/Employee390. |
| IS-B29 | Pending: quiet refresh now starts at remaining/3 in source; slow-read focus/disclosure retention was not run. |
| IS-B30 | Pending: focusin nudge exists; WebKit keyboard sweep was not run. |
| IS-B31 | **Partly fixed, P2 open**: original field gets focus back after failed staffing save, but focus is BODY while the request is held. |
| IS-B32 | **Update Withdraw fixed at844×390**: Withdraw178–230, Keep242–294, tab bar322–390, so Keep has28px clearance. Rules Remove remains a harness gap: the first matched control was in a closed disclosure, not an app defect. |
| IS-B33 | Pending for Payroll runs actions. Payroll settings floating feedback was separately verified visible. |

## Findings

| ID | Screen, role, width | Element | Measured issue and reproduction | Crop/data | Cause | Smallest fix | Severity |
|---|---|---|---|---|---|---|---|
| IS-B12 | Update detail, Owner and Employee390; Payroll settings Owner390 | Try again; Save company preferences | Detail GET503 locally, focus Try again, remove interceptor, press Enter: ready article appears but activeElement=BODY in both roles. Payroll Save:1 intercepted POST; held and failed states both activeElement=BODY. Feedback is correctly visible at480–760 held and352–760 failed, above tab776; it is focus that remains wrong. | [Detail](crops/detail-recovered-AUDIT-E.png), [Owner](crops/detail-recovered-QAOWNER.png), [payroll held](crops/payroll-save-held.png), [failed](crops/payroll-save-failed.png); [states](manual-states.json), [payroll](manual-payroll.json) | `communication-detail.tsx:133` replaces View with CurrentDetail, resetting `hadFailure` at49–51; `payroll-settings.tsx:58–60,101,126` tries to focus a button inside a disabled/locked fieldset. | Keep detail recovery tracking in the stable parent, then focus the ready article. Preserve payroll submit/recovery focus outside disabled fields with existing busy guards; no payroll words changed. | **P2** |
| IS-B31 | Scheduling rules, Owner390 | Enter from minimum-staff input |1 intercepted POST. Held: BODY active, fieldset disabled, Saving… button remains focusable342×52. Aborted: original minimum-staff input is focused again. Thus completion restoration passes while pending focus still fails. | [Held](crops/rules-enter-held.png), [failed](crops/rules-enter-failed.png); [states](manual-states.json) | `wave-b-forms.tsx:12–15,90–104`: rememberFocus acts only after completion; disabling the focused fieldset drops focus. | Before disabling fields, move focus to the form submit button when the active element is inside that fieldset. Preserve current single-flight guards and completion behavior. Owner patch required where the candidate lacks this source component. | **P2** |

## Checked and correct

- Staffing save and Payroll company save each sent exactly1 intercepted POST;0 reached the server.
- Staffing failed-save text and retry action remain visible above the phone tab bar; entries retained.
- Update Withdraw landscape confirm shows both choices clear of the tab bar, with focus on Withdraw.
- Compose offline→online retains “Fictional retained draft” and focuses `communication-title` for Owner and Employee390. [Offline/reconnect data](manual-offline.json).
-0 undersized targets and0 page/console errors in48 checker observations.

## Gaps

Full functional/state/role matrix, WebKit focus, double taps, privacy-expiry/slow reads, decided states and large data. Rules Remove confirm was not measured because the harness needed to open its disclosure. One payroll harness run first failed because its reason selector matched2 inputs; the scoped rerun succeeded, and that harness failure is not counted as an app issue.

