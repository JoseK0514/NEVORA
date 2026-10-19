# DeleteShiftButton integration conflict proposal

Authoritative target:4aaa79383f82a3c6023f9d2a2c2f492ba3152fce. Candidate33:b68f250129e2d21731624652e0aad7412b042bc3. Prepared review:563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea.

**Resolve this file to resolved-delete-shift-button.tsx**, exact Git blob0d873878194b2724fa83d786182b7b693e74aaa9. This is already identical in candidate33 and ready Wave A. The authoritative4aaa blob a65a799592d641062afb32cfc822dbc7733c4c37 is identical to Wave A a05f26a, so it contains no later Delete-specific UI changes to preserve beyond those represented here.

The external patch preserves the authoritative kit danger styling, block layout, submit type, Delete this shift / Deleting… words, useFormStatus source and existing caller. It replaces the measured useKeepHeight pixel hold with the candidate ST-WA-8 reserved-label grid; both text widths/heights participate before pending and the shorter pending label stays centered. It preserves the candidate IS-RC-DELETE-01 focus behavior: native enabled button, aria-disabled while pending, click/Enter activation guard. The existing ActionForm/single-submit guard remains responsible for synchronous duplicate exclusion; this proposal changes no command, action handler, hidden shiftId, role eligibility, confirmation text, error boundary or caller.

**Shared dependency:**4aaa alone does not export PendingLabel from employee-submit-button.tsx. The candidate33 version adds that shared export with centered label alignment; keep it during the +33 merge.4aaa already contains nv-label-swap's inline-grid/overlap CSS. Applying only this one-file patch to raw4aaa without the candidate33 shared export would leave an unresolved import. Do not add an independent duplicate label component.

This patch resolves the selected integration conflict and carries only the already-requested ST-WA-8 and IS-RC-DELETE-01 behaviors. It does not import any later historical candidate repairs beyond33. Parent owns application and verification in verify-preview-33. No app/source/index/refs edits, tests, browser, CI, preview or database activity were performed here.

Required frozen-review proof remains: held Delete button and Enter, one attempted command under repeated activation, focus retained while pending, stable reserved label/button geometry at normal and large text, resize under held send, then interrupted feedback and retry behavior. Browser mutation must remain intercepted.
