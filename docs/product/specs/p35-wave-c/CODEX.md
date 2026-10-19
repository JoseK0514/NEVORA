# Wave C: set aside for joint testing with Codex

October 19, 2026. Wave C rebuilt the UI of the Settings hub, every Settings page, Account recovery and Clocker recovery. No server code changed: no route handler, server action, SQL, `src/lib/data/*`, auth or delivery code. Every form posts exactly the fields it posted before, to the same action or route, with the same headers. These items need Codex's side and are tested together.

## 1. Real outcomes of every action

The UI side (before, pending, blocked failure, double tap, slow network) is tested on the local preview. What the server saves, sends and returns is joint testing.

| Page | Action | Goes to | Check together |
|---|---|---|---|
| Company profile | Save changes | `saveWorkspaceProfileAction` | Name saved; a locked timezone stays locked; the answer's wording (see 3) |
| Locations, new | Add location | `createLocationAction` | Key generation when blank; duplicate key answer; the "not confirmed" path (the UI asks to check Locations before retrying) |
| Location detail | Save changes | `updateLocationAction` | `expectedUpdatedAt` conflict answer; deactivation keeps eligibility and history; Clocker link unchanged after a rename |
| Positions | Add position, Save position | `createPositionAction`, `updatePositionAction` | Revalidation refreshes the list; conflict answer on a stale `expectedUpdatedAt` |
| Break types | Create, Save, Archive, Reactivate | `saveBreakTypeAction` | The action accepts exactly `id, expectedVersion, name, category, targetMinutes, active`; `refresh: true` answers (STALE, FORBIDDEN, UNAVAILABLE) |
| Clocker devices | Add device, Rename, Replace tablet / New setup code / Reconnect, Revoke | `manageClockerDeviceAction` | Setup code issued and its expiry; a tablet connecting with the code; revoke cutting access at once; existing punches kept |
| Branding | Save brand, Upload logo | `POST /api/workspace-presentation`, `/logo` | Retry with the same `operationId` never applies twice; 409 conflict; logo validation messages |
| Features & words | Save changes | `POST /api/workspace-presentation` (words, then modules) | Module with waiting requests answers 409 `busy`; words saved when modules fail |
| Company policies | Save policies, Retry the same save | `POST /api/company-policies` | Retained command reused on retry; 400 and 409 answers; effective dates in company time |
| Account recovery | Issue recovery code | `POST /api/manager/account-recovery` | Code issued, single use, 15 minutes; attestation recorded; an earlier unused code retired; the employee's reset at `/reset-access` with that code |
| Clocker recovery | Check receipt | `POST /api/manager/clocker-recovery` | Ledger read for a real saved reference; `validForMs`; access ending mid-use |

## 2. Session loss and access, server side

Forced in the browser on the UI side (401 and 403 on the fetch-based pages). For the server-action pages (Company profile, Locations, Positions, Break types, Clocker devices) a signed-out session makes the action throw or redirect; the UI then shows its "not confirmed" message and keeps the entries. Joint test: what each action does on an expired session, so the message can be specific ("Sign in again") instead of generic.

## 3. Server-written wording shown on these pages

Wording that comes from server code. Not changed; listed so Codex and Jose can decide.

| Where it shows | Current text | Note |
|---|---|---|
| Company profile success | "Workspace updated." | The page now shows its own title "Company profile saved" and hides this sentence, because the page is called Company profile |
| Location saved | "Location updated. Its Clocker link is unchanged." | Fine as is |
| Position added / updated | "Position added." / "Position updated. Existing memberships and history are retained." | Shown as a toast |
| Features, module locked | `blockerText()`, e.g. "1 request for time off is waiting for a decision. Decide it first." | Fine as is |
| Locations, setup items | `evaluateLocationReadiness()` issue messages | Fine as is |
| Company profile, locked timezone | `WorkspaceTimezoneLockedError` message | Fine as is |
| Break types and Clocker devices errors | `BreakTypeError`, Clocker owner result messages | Not seen locally beyond validation |

## 4. Reads

- The Settings hub now also calls `getWorkspace()` (an existing read) to show the company name above the title.
- Features & words still reads `getWorkspace()` but no longer shows the name (the band summary is now a fixed sentence, so its loading placeholder matches). The read can be dropped later; left in place so server behaviour is unchanged.

## 5. Not testable here

Real email or push delivery (none of these pages sends one directly), a real tablet connecting with a setup code, VoiceOver and TalkBack on real devices.
