# Employee mobile deletion: incumbent-system comparison

## Overview

This ordinary extension follows [PRODUCT.md](../../work/employee-mobile/PRODUCT.md), [DESIGN.md](../../work/employee-mobile/DESIGN.md), both design sidecars, and the private deletion direction brief. It adds review → confirmation → receipt for the current employee’s own fictional account. The inherited clean teal visual system remains authoritative; no new visual world or metadata amendment is introduced.

Behavioral authority is the ten hash-verified files in [the frozen source manifest](../../work/employee-mobile/references/deletion-source/manifest.json), revision `46e202786863279302026ee03a0e225c359fa55c`. Published access-loss, eligible-erasure and retained-record distinctions are represented as source facts, without certifying their legal validity.

## Colors

The 23 Light roles and 20 central Dark overrides remain unchanged. `src/tokens.css` and `src/Appearance.css` match the deletion baseline byte for byte. Confirmation uses the existing semantic red; guidance, surfaces, field edges and focus use incumbent roles.

## Typography

System typography and the existing page, section, body and supporting hierarchy continue. Phosphor regular symbols and the embedded wordmark remain the established assets.

## Layout

The mobile frame, spacing scale, 48px primary controls, 44px compact targets, and card/control/small/sheet radii are preserved. Account details stack below 360px. Confirmation and receipt use focused, scroll-revealed headings; enlarged actions and references wrap within the existing layout.

## Components

`AccountDeletion.tsx` reuses Heading, Section, Row and Button; `DeletionConfirmation.tsx` uses Field, a native form and labeled checkbox; retention uses the shared native dialog. `DeletionResult.tsx` retains the same receipt language. `AccountDeletion.css` consumes existing tokens. `deletion-model.ts` and App/AccountTools/PolicyReader/session integration model own-account proof, policy gates, pending operations and local closure separately from presentation.

The source’s current-password gate becomes an explicit `demo-only` field, followed by acknowledgement. Received/duplicate outcomes clear private sample state and leave only a transient sample reference. Unknown closes local access without a reference or blind replay. Known pre-acceptance failures remain distinct. No real credential verification, request, erasure, database, authentication or email operation occurs; coworker, workspace and withdrawal controls are absent.

## Do's and Don'ts

Preserve the incumbent contract. Preexisting documentation drift remains recorded without repair: DESIGN frontmatter contains colors only; the sidecar lacks tonal ramps and component `refersTo` links, with empty narrative arrays.

Candidate: [index.html](index.html), SHA-256 `39824ad0714e00496ed97019a2297e9d4b607783993a2ffcbacd94e7ff547cda`.

This documentation pass verified all 31 capture hashes and inspected four representative images: Light 320 review, Dark 390 confirmation, Dark 200% actions, and Light 200% receipt. The [independent full source/image review](../../.omo/evidence/employee-deletion-clone-fidelity.md) records **ship / APPROVE**. Browser execution and regression results are separate executor evidence; this pass ran neither.
