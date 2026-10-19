# Wave A retained-finding patches, prepared only

Base: candidate `56570fd0fc5e23503dbb50550af9dfcd965861ec`. Inspection snapshot: `aa5e07e83039d9448eaebcec50a7f3928821ffca`. Prepared review tree: `563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea`.

The crosswalk covers 51 Wave A finding IDs: 44 original and seven later findings. It identifies two retained causes (IS-WA-12 and ST-WA-1, the latter also covering the Coverage subcase of IS-WA-5). The other 48 IDs have an implementation or explicit integration disposition; final browser review remains required. Cross-owner IS-P4-11 is a separate retained finding awaiting the coordinator's assignment. This is no zero-finding exit certification.

## IS-WA-12

Original measured citation: `docs/product/specs/p35-wave-a/inspection/interaction-states.md:28` in the Wave A source. Status and Access role help formed part of the accessible name and also the description. Email and More details also included Optional. The earlier help-separation fix did not change shared SelectField or hide the Optional markers.

`IS-WA-12.patch` preserves the shared native select, wrapping label, class names, click behavior, options, controlled/default selection, required/disabled and change handler. It names the select explicitly from the existing label-words span via a unique ID and aria-labelledby, while retaining aria-describedby for help. Two aria-hidden additions complete the original Optional-marker scope in Field and ReviewedCalloutForm. No DOM layout restructure is proposed.

Required browser proof after application/freeze: exact accessible names Status, Access role, Primary location, Email, Reason and More details; descriptions reference the help once; no help, Optional or character count in the name. Check clicking label and hint still focuses the native select, option/default/controlled value behavior, required/disabled/inactive selection, and validation's field name. Include real callout reason changes, without sending a business write. Source routes are `/app/employees/new`, `/app/employees/AUDIT-E`, and `/app/exchange/callout?shiftId=audit-next-0-1` (the reported team/callout display names are not route aliases).

## ST-WA-1 / IS-WA-5 Coverage subcase

Original measured citations: `docs/product/specs/p35-wave-a/inspection/stability.md:19` and `interaction-states.md:21`. Coverage inherited the Schedule 21-cell grid, Loading schedule announcement and 244px band despite the ready Coverage band being 312px at 390. The candidate has the Coverage page and intended wa-coverage CSS at 312px, with 228px landscape rules, but still has no Coverage loading.tsx.

`ST-WA-1.patch` adds only that existing route's own loading.tsx using the existing RouteSkeleton, cards shape, coverage label and wa-coverage selector. It activates the existing per-width CSS rather than adding a dangling route or new CSS.

Required browser proof after application/freeze: hold a real server read or passively capture an actual emitted visible loading state; verify Loading coverage, cards shape, 312px band at 320/390 and 228px at 844x390 coarse-pointer landscape for Owner/Manager. Verify the real ready state and transition. A fully withheld navigation response cannot prove a streamed loading state, and injected/truncated skeleton markup cannot certify it. Desktop should obey the existing hidden-band presentation. Large-text geometry must be judged against the existing scale rules, not assumed equal to the 100% fixed band.

## Separate explicit deferral: IS-P4-11

Original Desktop interaction-states.md:43 measured that Browser Back preserved `?item=TIME_OFF%3Aaudit-timeoff` and its selection, while the Inbox back link lost the item. Later statuses at lines137 and230 explicitly await Wave A. Both audited candidate and ready Wave A still carry only from/filter. The coordinator owns the next assignment; no IS-P4-11 patch is included here. The action-center item ID is not interchangeable with the business requestId.

Both supplied patches passed read-only `git apply --check` against the exact candidate base. Neither has been applied by this worker. No source edits, commits, preview, database writes, browser work, tests, lint or typecheck were performed for this preparation. Patch hashes and exact old blobs are in patch-manifest.json. Full 1792-cell axe review and required manual five-area judgment remain in the separate prepared exit joblist.
