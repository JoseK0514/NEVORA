# Profile part 1 — design extension record

Date: 2026-10-26. Scope: Employee mobile account overview, Appearance and sign-in Language preferences only.

The exact Impeccable documenter agent was unavailable; this fresh bounded documenter substitutes using `reference/document.md` and `reference/degraded/documenter.md`.

Artifact: [index.html](index.html), SHA-256 `5dcb9f1050c56a533c0fc72150ccbec588e470eadf14dd61f3ecd13eacf7fe58`. This record is the only file written by this documenter. Existing system records and implementation were read, not edited. The prototype directory is not a Git repository; no branch, commit or deployment was created.

## System agreement

Profile extends the approved clean teal identity. The default fictional preference is Light. Dark and Match this phone are authorized functional Appearance choices within the same component system, not a replacement visual identity. Identity, Preferences, then read-only Work details follow the source Profile order and product boundary.

Five-line system summary:

1. Palette: all 23 canonical Light color roles agree across CSS, DESIGN frontmatter, 21st colors and Impeccable color metadata; `tokens.css` is byte-identical to the captured pre-pass file.
2. Dark: 20 phone-scoped semantic overrides agree across `Appearance.css`, the DESIGN table, both metadata extensions and `dark-token-map.json`; the outer review canvas remains Light.
3. Type: the approved system stack and 32/19/18/16/14/12px page/section/title/body/supporting/caption roles remain; the sheet title is the existing 24px role, doubling under 200% text.
4. Geometry: the existing 4/8/12/16/20/24/32px rhythm, 28px section gap, 16px cards, 12px controls and 24px sheet corners remain; large actions use 48px and compact targets 44px.
5. Existing rules retained: text accompanies semantic states; shared controls carry interaction and focus; local outcomes identify the sample. No new named rule or visual prohibition was invented.

The frozen Midnight source is `references/profile-source/signature-tokens.css` at recorded development commit `46e202786863279302026ee03a0e225c359fa55c`. Its SHA-256 was directly recomputed as `41f2c3037087cfc3c81d42911137e6e59c88d945c58eb35038a67671bfe880d8`. The source supplies page/card/ink/muted/rule, action/hover/wash, warning/error, track, scrim and focus roles. Selection and secondary edges adapt existing semantic roles. The Light control edge is intentionally retained for contrast. Signature typography, layouts and shadows were not imported. The official wordmark remains the embedded asset, with a monochrome CSS treatment in Dark.

## Primitive mapping

| Profile element | Existing primitive and token relationship |
| --- | --- |
| Account title and sections | `Heading` / `Section`; existing page/section type, page inset and section gap |
| Identity | Existing card/avatar vocabulary; surface/line/card radius, 20px padding, 48px avatar, teal fill |
| Appearance and Language launchers | Shared `Row` in card/list; body/supporting roles, 22px regular Phosphor symbols and 18px chevrons |
| Work details | Semantic `dl`; shared detail-list, muted labels, body values and hairline separation; stacks below 360px |
| Choice sheets | Shared native-dialog shell; native fieldset/radios, card radius and dividers, teal-wash selected row, existing secondary `Button` for Done |
| Unavailable work details | Shared `Empty` and secondary `Button`; trusted own identity and independent preferences remain visible |
| Focus and reflow | Shared focus token; native radio group plus modal Tab handling; title `overflow-wrap: anywhere` preserves the Close target at enlarged text |

`Profile.css` consumes established color/spacing/radius roles. Its radio dimensions and weight are bounded component values consistent with the incumbent controls. Dark changes tokens and native `color-scheme` on `.phone[data-theme="dark"]`, including its dialog descendants. It does not create parallel component layouts.

## Behavioral boundary

`profile-model.ts` explicitly projects only own identity and work fields. Foreign or disallowed-role records fail closed. Work information is read-only; correction guidance points to a manager. Trusted own identity can retain preferences when the separate work-details read is unavailable; denied identity withholds both identity and preferences.

Language exposes English/Español for sign-in pages only. The prototype does not write the production auth-language cookie, reload or translate workplace screens. Appearance is in-memory phone state; `useAppearance` listens to live `prefers-color-scheme`, with explicit Light/Dark overriding it. Refresh resets choices. No OS setting, storage, real API, customer record, account-security tool, Pay feature or deployment was added by this bounded slice. Source inspection establishes prototype structure, not production authorization or durability.

## Evidence read and directly verified

All relative project paths below resolve under `../../work/employee-mobile/` unless they link to this output directory.

Read: `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.21st/design.json`, `.impeccable/design.json`, `package.json`; Profile/PreferenceChoices/profile-model/employee-identity/useAppearance; App, ui, tokens, components, layout, Profile and Appearance styles; `evidence/profile-pass/source-authority.md`, frozen Midnight CSS and dark-token map; capture/model runners and results; typecheck/build logs; all three Profile engine results; final independent recheck and [profile-ui-review.md](profile-ui-review.md).

Direct documenter scenarios and binary observations:

| Scenario / invocation | Observable | Captured evidence |
| --- | --- | --- |
| Node `crypto.createHash('sha256')` over final HTML and frozen palette | Both hashes equal the values recorded above | This record; `evidence/profile-pass/captures.json`; `evidence/profile-pass/dark-token-map.json` |
| Node CSS-property extraction and JSON/frontmatter/table comparison | 23 Light roles agree; pre-pass token bytes equal; 20 Dark roles agree in every representation | This record; source files and `evidence/profile-pass/before/tokens.css` |
| Node hash comparison of model-result `source_hashes` against current modules | Both current source hashes match | `evidence/profile-pass/model-results.json` |
| `view_image` of all seven Profile capture PNGs plus Chromium Dark 320px/200% | Real grouped components visible; complete work-details capture includes all four fields; enlarged title wraps clear of Close | `evidence/profile-pass/{profile,profile-work-details,appearance-light,appearance-dark,profile-dark,profile-language,profile-recovery}.png`; `chromium/appearance-dark-text200-320.png` |
| Bundled Python/Pillow: SHA-256 each public PNG, compare manifest source hash, compare dimensions and decoded RGBA bytes with raw capture | All seven manifest hashes match; all seven refer to final HTML; all seven decoded images equal their raw captures, each 390×819 | [asset-provenance.json](asset-provenance.json), public PNGs below, and this record |

Public images: [Profile](profile.png), [Work details](profile-work-details.png), [Light choices](appearance-light.png), [Dark choices](appearance-dark.png), [Dark Profile](profile-dark.png), [Language](profile-language.png), [Recovery](profile-recovery.png). Provenance embedding changes PNG encoded bytes legitimately; decoded pixels were independently compared using `/Users/josek0514/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` and Pillow.

The read Profile results contain 26 groups per Chromium/Firefox/WebKit, each bound to the final HTML hash with `failure: null`, no captured errors and no external requests. The model artifact contains 15 assertions with verified source hashes. Typecheck and build-check logs were read. These executions were performed by the implementation/QA agents, not rerun by this documenter; no independent full-suite or compiler pass is claimed here.

The independent review's final section supersedes its initial rejection. Its final-hash `recheck-results.json` contains eight Chromium/WebKit cases (320/390px, Light/Dark, 200% text), `failure: null`, 44×44px Close targets and at least 35.70px text-to-Close separation. Its disposition is APPROVE for local part 1, with no remaining review blockers. The earlier title collision and incomplete work-details image are resolved, not canonized as design rules. This documenter read that evidence and inspected the refreshed capture; it did not independently rerun those browser interactions.

## Drift and limitations left explicit

Pre-existing recording gaps remain: DESIGN frontmatter records colors but not the full typography/spacing/radius/component schema; its body uses incumbent custom headings rather than the document skill's canonical section set. The 21st type summary is partial. Impeccable metadata has no tonal ramps and its component snippets are not a complete behavioral mirror of the running application. The Light-centric `colorMode` remains the default, with Dark represented explicitly as an extension. These omissions were not repaired or promoted into new system requirements because this assignment is a bounded extension record, not a schema migration.

The user-approved system typography controls this extension despite generic skill display-face advice. No fresh creative metaphor or unrelated craft prohibition was introduced. No production integration, real-device assistive-technology certification, exhaustive nested-workflow theme audit or production security approval is established. Existing source-authority prose is supporting context; the frozen palette hash, current implementation and captured artifact comparisons above are the direct evidence for this record.
