# Wave A — ac99ed31 recheck

Not zero: retained TC-WA-3, P2, in the shared ShiftBlock. The full exit remains open.

- IS-WA-12: exact accessible names pass on Employee details, Owner New employee, and Employee More details. Status retains its actual hint as a description. Names exclude Optional, hints and character counts.
- IS-P4-11: receiving and outgoing links pass four complete Owner/Manager round trips across both engines; selection is retained.
- AL-WA-10: approved 0caadb35 was ported as 7bed90ce. All 24 genuine eligible replacement geometry samples meet the published criterion: phone card x16 with viewport minus32px width; desktop reading card 720px. The unchanged replacement checker passes 24/24 across Owner/Manager, 320/390/1440, 100/200%, both engines.
- TC-WA-16: approved 2ddb833f was ported as e90abeaf. Four live payroll pending paint traces retain a minimum 5.13895:1 contrast; no transient low-contrast frame was measured.
- TC-WA-3: approved 08159520 was ported as ac99ed31. Add-shift summary and genuine replacement separator observations pass. Remaining rendered-site results are in the final named-ID table.

[Corrected naming/pending observations](../evidence/corrected-named-rechecks.json), [replacement geometry judgment](../evidence/replacement-qualified.json). Initial harness mistakes are retained separately: Access role has no hint on Employee details, the payroll button changes accessible name while pending, and Add shift has two elements labelled Shift summary. These are setup/contract gaps, not product findings. The initial desktop band-edge assertion was outside AL-WA-10's published 720px reading-width criterion; retained geometry satisfies that criterion. No application code or acceptance rule was changed to create a pass.

All other prior Wave A findings and full-state/large-data requirements retain their previous status until the full exit is completed.

## Retained TC-WA-3 — P2, shared ShiftBlock

At Manager Shift requests, the first pending swap's `.wa-shift__when`, 390px / 200%, the separator still starts a new line. Chromium's last time character is y942.016–983.016; the dot is y986.016–1027.016, 44px lower. WebKit has the same 44px line change (y942.516 →986.516). The visible line reads `· 8h` below `4:00 PM`.

[Chromium crop](../crops/chromium-TC-WA-3-manager-shift-block.png), [WebKit crop](../crops/webkit-TC-WA-3-manager-shift-block.png), [raw rectangles](../evidence/coverage-separators.json).

Cause: `src/components/wave-a/shift-block.tsx:32` leaves the NBSP/dot in a sibling after the `.nv-keep` time span. `.nv-keep` is an inline-block (`kit.css:153`), so the following sibling can wrap after the whole inline box even though the final time glyph is farther left. Move the styled NBSP/dot **inside** the preceding time span; leave the normal break before the duration. Recheck this shared component on Manager Shift requests at 320/390 and 150/200% in both engines. The other three modified sites have passing browser evidence. No additional application patch was applied here.
