# Clocker name picker and location access

The source baseline is Development at `b5264836e9093d88dc32edc70924bda601c823d5`. Codex owns the backend and hosting. Claude owns the Owner and iPad screens. Integrate and verify the combined application on Development before any promotion. Main and production require Jose's approval.

## Owner screens

- Tablets use `ClockerDeviceView.signInMode`. Only an enrolled, active iPad at an active location can be switched. Submit `manageClockerDeviceAction` with `operation=SET_SIGN_IN_MODE`, `deviceId`, the current `expectedVersion` and `signInMode=EMPLOYEE_ID|NAME_PICKER`. Use the returned device/version. An enrollment replacement defaults to `EMPLOYEE_ID` and requires a fresh opt-in. Label the picker for staff-only areas.
- Employee profiles use `readClockerLocationAccess` on the server with the current Owner proof. The result contains `employeeId`, `mode`, `locationIds` and the exact `updatedAt` to send as `expectedUpdatedAt`. Submit `saveClockerLocationAccessAction` from the employee profile with those keys and one `locationId` field per selection. Refresh stale or uncertain saves.
- `ASSIGNED` inherits the current workforce location assignments. `SELECTED` permits one or more active company locations, including a list that omits the primary work location. `ALL` permits active company locations added later as well. `ASSIGNED` and `ALL` send zero `locationId` fields. These controls govern Clocker. The separate scheduling assignments stay intact.

## Enrolled iPad

Use the existing same-origin JSON POST to `/api/clocker/[location]/pin` with `X-Nevora-Clocker: 1` and the device cookie.

- Request `{ "action": "roster" }` when entering or returning to the sign-in screen. `{ "state": "employee_id" }` means show the existing Employee ID form. `{ "state": "name_picker", "people": [{ "displayName": "Ana R.", "selection": "<opaque reference>" }] }` allows client-side search of an in-memory list. An empty list and matching display names fall back to Employee ID. Keep Employee ID access visible in picker mode.
- Submit `{ "action": "verify", "selection": "<opaque reference>", "pin": "<four digits>" }` for a selected name. Submit the existing `employeeId` verify body for manual entry. HTTP verification requires exactly one of `employeeId` or `selection`; a PIN-only request is invalid in either mode. All existing identity responses, cookie handling and `Retry-After` semantics apply. Refresh the roster when returning to sign-in and after a stale selection is denied.
- Store the roster and selection only in memory. Clear them when leaving sign-in, losing the tablet credential, switching modes or locations, or when backgrounded. Discard late responses for an old screen. A roster read failure keeps the Employee ID path available. The PIN and punch flow continue to use the existing reset and receipt behavior.
- If the employee is limited, use the existing PIN support and authorized Timecards correction flow. The ID form shares the name route's attempt budget. Photo and biometric behavior are separate.
- Suggested labels include “Employee ID + PIN” / “Núm. de empleado + PIN”, “Name picker + PIN” / “Elegir nombre + PIN”, and “Use employee ID” / “Usar núm. de empleado”.

## Qualification

Run the combined English and Spanish flow on a physical iPad against a protected Development candidate using fictional staff. Record source, build and device. Cover IP29–IP32 in the iPad matrix, including Owner disable during an open picker, wrong-person/duplicate-name fallback, revoked access and a manager recording the verified actual start time. Keep the picker opt-in and public signup closed during protected acceptance.

## Local evidence

The disposable PostgreSQL regression run passed 207 checks across device custody, PIN verification, PIN transport, punches and time corrections. After tightening the HTTP contract, all 58 focused PostgreSQL checks and 56 unit checks passed. The final transport replay verified PIN-only denial in both modes and proved a fictional employee could use the picker at an explicitly allowed secondary location. Repeating the same punch produced the original receipt, one time entry and one ledger row. Type checking and the onboarding manifest check passed. The first lint run passed with four warnings in unchanged files.

Apply `0078_clocker_picker.sql` to the authorized Development workspace database before running the combined application. The local backend candidate has no hosted or physical iPad acceptance for the new screens.
