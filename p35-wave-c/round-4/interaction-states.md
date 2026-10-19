**Incomplete — 0 P0, 0 P1, 0 P2 newly verified in this area; no zero verdict.** Exit round 4 on `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. Dialog checks are underway. The large-text action-label defect is counted once as WR-WC-25.

## Status of earlier findings

**IS-6: fixed in the completed destructive-dialog samples.** Archive break type, Replace tablet and Revoke access start on **Cancel**, rather than the destructive submit. Other IS findings remain under the full exit re-check.

## Findings

None newly verified in the completed interaction scope.

## Checked and correct

- Add/Edit break and Add/Rename device begin in the name input. At 390/100, name fields are **48px** high; at 320/200 they are **96px**.
- In the completed samples, Escape, Cancel and Close each close the dialog and restore focus to the **exact opener**. Root/body overflow is hidden while open and restored afterward.
- Tab cycles have not reached a background page control. Chromium briefly reports BODY when focus passes through browser chrome; that is not reported as page focus escaping behind the modal.
- All actions here are opening, navigating or dismissing dialogs. No destructive submit or data write was sent.

## Gaps

The [dialog evidence](dialogs.json) is partial. Remaining browser/width samples, wheel/scroll analysis, all form validation and held/failure/401/success/double-submit states, offline/recovery and role access still need completion. Native keyboard/blur tests remain on the Mac.
