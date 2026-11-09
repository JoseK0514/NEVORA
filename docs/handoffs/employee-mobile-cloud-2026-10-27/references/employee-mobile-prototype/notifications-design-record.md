# Employee notifications and updates — design record

Recorded 2026-10-26. This is a bounded documentation pass for `work/employee-mobile`, an ordinary extension in Operate mode of Jose’s approved clean teal Owner direction. The existing Employee contract remains authoritative. No new visual direction, system-token change, production Signature change or backend integration is approved here.

Substitution: a fresh bounded design documenter performed this pass because the shipped Impeccable documenter role was unavailable.

The only file written by this pass is this report. Existing PRODUCT.md, DESIGN.md, `.21st/design.json`, `.impeccable/design.json`, source, prior reports and concurrent Owner/access/desktop work were preserved. The prototype workspace is not a Git checkout; no branch, commit, push or deployment was created.

## Five-line system summary

1. Palette: existing pale green-gray canvas, white surfaces, dark ink and teal actions; amber/red/teal statuses retain explanatory text.
2. Type: incumbent system stack; page 32px, section 19px, title 18px, body 16px, supporting 14px and caption 12px at the default root size.
3. Layout: existing mobile shell and five destinations; shared spacing scale, 24px page inset/20px below 360px, with 20px related communication-section gaps.
4. Shapes and controls: existing 16px cards, 12px controls, 8px details, 48px primary controls, 44px compact targets, Phosphor regular icons and blue keyboard focus.
5. Rules: reuse semantic primitives; distinguish opening, reading and acknowledging; keep actions and recovery explicit; no new named visual rule or decorative system is introduced.

## Design agreement and pattern mapping

Read the local AGENTS.md, PRODUCT.md, DESIGN.md, `.21st/design.json`, `.impeccable/design.json`, package/build configuration, frozen-reference manifest and Owner stylesheet, notifications plan, source-authority record, shared `ui.tsx` and CSS, and the new notification/update React modules and models. Applied Impeccable `reference/document.md` and `reference/degraded/documenter.md`. Its ordinary-extension instruction calls for preserving the incumbent system and reporting existing drift rather than repairing it incidentally.

Direct comparison finds all 23 recorded color values equal across `src/tokens.css`, DESIGN frontmatter, `.21st/design.json` and the sidecar canonical colors. Twenty-two occur in the frozen Owner stylesheet; the existing Employee scrim is the exception. `tokens.css`, `layout.css`, `components.css` and `ui.tsx` are byte-identical to the pre-notification source snapshot. All five frozen reference hashes match their manifest. This extension therefore inherits the established Employee adaptation, rather than importing concurrent Owner changes.

`Communications.css` adds scoped composition rules, not token declarations. It uses shared colors, spacing, type and radii. The 20px native checkbox and article line-height of 1.6 are local content/control choices; they are not new global tokens. Full-page long content follows the existing scroll region. No new shadows, imagery, font, icon family or motion system is added.

| New pattern | Incumbent foundation and meaning |
| --- | --- |
| Notifications with dates, search and All/Unread/Action needed | Heading, Field, ViewSwitcher, Section, Row, Status and existing card/list separators. Icon plus text identifies the record; opening resolves the source action and does not invent a read receipt. |
| Updates with All/To review/Reviewed | Existing selector, rows, status tones and secondary Button. Published time and author remain supporting information. |
| Full update article | Existing card, 20px inset, normal body text with preserved line breaks and long-word wrapping. Metadata and status remain outside the article. |
| Required acknowledgement | Native checkbox in a labeled 48px-minimum row, existing primary Button and explicit receipt-of-version explanation. Informational Mark read is distinct from generic inbox management. |
| Today’s-team compose and review | Existing Field, native input/textarea/date-time control, Button, stack and detail-list styles. Review presents audience, business date, eligible count, optional acknowledgement, expiration and full draft before publication. |
| Publication receipt and own withdrawal | Existing receipt layout/icon and Buttons, with sample-only copy; withdrawal has a separate confirmation. The receipt layout is reused directly rather than through the shared Receipt function. |
| Unconfirmed action recovery | Existing card, pending Status, detail-list, supporting copy and secondary Button. Status check precedes deliberate original replay; the retained action is visible. |

Directly inspected all six public communication captures: `notifications.png`, `updates.png`, `update-detail.png`, `team-compose.png`, `team-message-review.png`, `update-recovery.png`. The white header/tab bar, pale canvas, restrained separators, teal controls and status labels agree with source and contract. Also inspected `../../work/employee-mobile/evidence/notifications-review/recheck-chromium-320-200.png`: review starts with the heading and audience at enlarged text, and navigation reflows below the reserved scroll area.

## Artifact-bound evidence

Current HTML SHA-256, independently recomputed:

`f22cdd5636fb14f2c1da8c67d0e8de70348adea2475fcb2875599f0f03a3fcb7`

Paths below are relative to workspace root. Checks performed by this documenter are distinguished from inspected executor/reviewer records. No browser suite is represented as rerun by this pass.

| Scenario | Invocation / inspection | Binary observable | Captured artifact |
| --- | --- | --- | --- |
| Saved artifact equals final source | From `work/employee-mobile`: `node build.mjs --check` | Exit 0; “Current source build matches the saved Employee prototype byte for byte.” | This report; existing `work/employee-mobile/evidence/notifications-pass/build-check.log` contains the same result. |
| Type checking | From that directory: `npm run typecheck` | Exit 0; `tsc --noEmit`, no diagnostics | This report; existing `work/employee-mobile/evidence/notifications-pass/typecheck.log`. |
| Contract and frozen authority | Python `hashlib.sha256`, JSON reads, CSS declaration comparison and DESIGN literal comparison | 23/23 colors equal; 5/5 frozen hashes equal; four shared source files byte-equal to the before snapshot | Comparison results recorded below; `work/employee-mobile/references/manifest.json` and `evidence/notifications-pass/before/`. |
| Styles bound to deliverable | Python extracts HTML `<style>` and compares to build.mjs’s six CSS files joined with newline | Exact equality = true | `outputs/employee-mobile/index.html`; build-check result above. |
| Public captures bound to current artifact | Python recomputes all `asset-provenance.json` image hashes and source hashes; compares six PNG IHDR and decompressed concatenated IDAT streams to evidence copies | 25/25 provenance entries match; all six communication image streams equal | `outputs/employee-mobile/asset-provenance.json`; `work/employee-mobile/evidence/notifications-pass/captures.json` and its six PNGs. |
| Focused notification/update scenarios | Read `notifications-next.cjs`; inspected all three result JSONs for `node work/employee-mobile/notifications-next.cjs --engine=<engine>` | Each records 32 completed groups, current HTML hash, null failure, empty errors and external requests | `work/employee-mobile/evidence/notifications-pass/{chromium,webkit,firefox}/results.json`. |
| F1 heading visibility and F2 expiration copy | Read `review-focus-recheck.cjs`, three engine JSON records, revised compose source and current screenshots | All nine recorded configurations show focused heading inside scroll viewport; runner asserts “No expiration” and absence of “Withdrawn” | `work/employee-mobile/evidence/notifications-review/recheck-{chromium,webkit,firefox}.json`; corresponding PNGs; `outputs/employee-mobile/notifications-ui-review.md`. |
| Aggregate existing browser evidence | Parsed `checks.json` browser_results plus next_pass_suites | 181 recorded groups per engine, current HTML hash and no recorded failure/error or false pass | `outputs/employee-mobile/checks.json`; this is an evidence inventory, not an independent rerun of 543 groups. |
| Local model boundaries | Read communications-model.ts, the pure runner and its result file; independently recomputed model hash | 19 named assertions recorded; result source hash equals current model hash | `work/employee-mobile/evidence/notifications-pass/model-results.json` and `model-check.cjs`. |

Captured static-comparison output:

```text
Color equality: 23 True
Frozen reference hashes: 5 True
tokens.css unchanged: True
layout.css unchanged: True
components.css unchanged: True
ui.tsx unchanged: True
HTML CSS equals current six source stylesheets: True
Public provenance: 25 True
Six communication capture image streams equal: True
communications-model.ts SHA-256:
d0523d4710b44c3a77c10584fa885fd4ca3f786dc5f23c9907e499fd8faa8d6d
```

Public PNG bytes differ from the raw evidence copies because the deliverable carries embedded provenance metadata; equal IHDR and decompressed IDAT streams independently confirm unchanged image data. The public provenance manifest hashes the final public bytes. This distinction prevents falsely treating metadata embedding as a different render.

The independent UI reviewer’s appended disposition is APPROVE for this exact HTML hash, limited to the local prototype. This documenter inspected its supporting recheck records; this report does not broaden that approval. The earlier REQUEST_CHANGES applies to the retained historical `efdb…` build. Final source uses a layout effect to focus and reveal the review heading, and review copy now explicitly says “Expiration / No expiration.” Neither historical defect is promoted into design guidance.

## Preserved metadata and limits

PREEXISTING record-format drift: DESIGN.md uses established project-specific headings instead of the current documentation reference’s eight canonical headings, and its frontmatter supplies colors without complete typography/spacing/component groups. The existing sidecar contains eight primitive samples and empty narrative rule lists; `.21st` preferredPrimitives omits the already-existing ViewSwitcher. These are incomplete metadata descriptions, not evidence of a new visual system. They were observed in incumbent records and left unchanged; no speculative North Star, synthesized palette, new prohibition or claimed package provenance was added. The new task-specific compositions are recorded above without replacing the shared contract.

The source-authority record points to read-only development `46e202786863279302026ee03a0e225c359fa55c`; this pass read that record and local simulation, not the full application checkout. It does not independently certify the server’s authorization. Current local model uses a fixed sample clock, location, audience count and in-memory receipts/operations. Session-ended, missing access, changed revisions and uncertain transport outcomes are fixtures. Refresh loses local state; status lookup is simulated. Production needs owning APIs, current grants/assignments/audience, trusted clock, durable operation storage, cross-session recovery and real transport handling.

No real messages, permissions, push subscriptions, customer changes, credentials or production integration were used by this documentation pass. Native device/screen-reader certification and complete Employee feature parity remain unclaimed. No user design decision is required to accept this bounded record; real integration remains separate work.

Not canonized or repaired: preexisting metadata omissions and historical F1/F2 defects; ordinary-extension scope preserves the incumbent contract, and current evidence records the bounded fixes instead of making defects reusable rules.
