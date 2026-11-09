# Calendar subscription — design extension record

Date: 2026-10-26. Scope: the fictional Employee mobile calendar-link lifecycle and provider guidance.

This bounded documenter substitutes for the unavailable shipped Impeccable documenter, using the installed [document reference](/Users/josek0514/.codex/skills/impeccable/reference/document.md) for source-to-system comparison. This is an ordinary extension of the established clean teal Light/Dark Employee system. It establishes no new visual identity or token authority. This document is the only file written by this documenter; source, PRODUCT, DESIGN, 21st and Impeccable metadata were preserved.

Artifact: [index.html](index.html), directly recomputed SHA-256 `d3ee3f1a98a6ef1e386658aabf4bcb72cb50ee8bdbcb0b1e761beb33d9e32a76`. The workspace and prototype folder are outside Git; this documentation creates no branch, commit or deployment. Relative paths beginning `src/`, `references/` or `evidence/` below resolve under `../../work/employee-mobile/`.

## System agreement

The [calendar plan](calendar-plan.md) extends the existing account and schedule tasks. Profile and More use shared action rows; Schedule uses the existing text action. All three open the dedicated Calendar subscription screen without creating a link. Its hierarchy is contextual Back, page heading, link status and action, private-link explanation, provider setup, then link management. The five-destination shell stays intact.

Direct comparison uses the frozen source files immediately inside `evidence/calendar-pass/before/`, not a nonexistent `before/src/` directory or historical screenshots refreshed by later runs. It finds four new source files—Calendar, CalendarProviders, calendar-model and Calendar CSS—and six changed integration files: App, Profile, More, Schedule, model and session-model. Fifty-two existing source files match their baseline bytes. Shared primitives and foundations remain unchanged:

| Unchanged source | Current and baseline SHA-256 |
| --- | --- |
| `src/tokens.css` | `ec8ce48039735e3401b446dab7e2da823bff54bdfa5972136e8c09af1a830f1e` |
| `src/Appearance.css` | `4f8e971b4cf41b7683febeed6b3c1714ca53f19e484e3d450682af5d5019be63` |
| `src/ui.tsx` | `a45c1b5a9942710dff9da15fbb35762bc29a262e897e500c41e04212dd76fcdf` |
| `src/components.css` | `3736353195bdfe41ec87f8887c3ed0332904e8930cbcb315af61def1ed2bec32` |
| `src/layout.css` | `ed187a75801c22644c768d50472104ded7eec887f037771f632c030943498d0f` |

All 23 Light color roles agree exactly across tokens CSS, DESIGN color frontmatter, 21st colors and Impeccable color metadata. All 20 Dark overrides agree across Appearance CSS and both metadata extensions. The following is an evidence snapshot of those existing roles; their authority remains in the source and incumbent design records.

| Role | Light | Dark override |
| --- | --- | --- |
| canvas | `#f4f7f6` | `#0c1817` |
| surface | `#fff` | `#172725` |
| ink | `#172622` | `#f5f2eb` |
| muted | `#5f6d68` | `#b8b7b0` |
| line | `#e3e9e6` | `#2c3b39` |
| teal | `#0b6e69` | `#a9e2da` |
| teal-press | `#07534f` | `#bdeae3` |
| teal-wash | `#eaf4f1` | `rgba(169,226,218,.12)` |
| amber | `#845417` | `#ebbc74` |
| amber-wash | `#fff4e3` | `rgba(235,188,116,.12)` |
| red | `#b53327` | `#f3a79d` |
| red-wash | `#fdf0ed` | `rgba(243,167,157,.12)` |
| focus | `#087fca` | `#f5f2eb` |
| control-border | `#7a8882` | `#7a8882` |
| secondary-border | `#cbd7d1` | `#5a6764` |
| track | `#e8eeea` | `#20302e` |
| scrim | `#162b2580` | `rgba(0,0,0,.55)` |
| selection-surface | `#bce7df` | `#30403e` |
| selection-ink | `#123d34` | `#f5f2eb` |
| scroll-thumb | `#c9d5cf` | `#5a6764` |
| review-canvas | `#e9efec` | No override |
| review-ink | `#4f6158` | No override |
| review-border | `#c8d6cd` | No override |

Dark remains scoped to the phone, including sheets and native fields. The review canvas and existing wordmark treatment are retained. Calendar CSS declares no literal color or custom property.

System typography remains `-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`: page 32px/720/1.2, section 19px/680/1.3, title 18px/650/1.35, body 16px/1.45, supporting 14px and caption/navigation 12px at a 16px browser default. The calendar-card heading consumes the existing title role. The inherited sheet title is 24px. No font family, type scale, radius, color or global layout role is added.

Spacing remains 4/8/12/16/20/24/32px, with the existing 28px section gap, 24px page inset and 20px inset below 360px. Calendar's local vertical flow uses existing 24px spacing; card heading/body padding uses existing 16/20px steps. Cards retain 16px corners, controls 12px, small details 8px and sheets 24px. Primary/secondary Button minima are 48px; compact text/icon controls are 44px; inherited native disclosure summaries are at least 64px. These control measurements do not assert that every inline provider-guide text link has a 44px box.

## Components, states and focus

| Calendar element | Existing implementation vocabulary |
| --- | --- |
| Profile/More entry | Row, Section and card/list; 22px Phosphor regular icon and 18px chevron |
| Schedule entry and contextual Back | Shared text action and existing back-icon pattern; exact opener ids retained |
| Link card | Existing card, stack, Heading/Section, Status and body/supporting text; wrapping teal-wash heading |
| Create, copy, select and recovery | Shared Button; explicit sample action labels and textual status feedback |
| Private sample URL | Field with labeled native read-only textarea, spellcheck off, wrapping URL and native selection |
| Replace/revoke | Shared native dialog sheet, stack/button-row, secondary Keep current link and explicit consequence copy |
| Apple/Google/Outlook setup | Existing native Disclosure from PolicyReader; ordinary ordered steps and semantic guide anchors |
| Loading, unavailable, denied and paused | Existing skeleton, Empty and secondary recovery controls; unconfirmed status stays explicit |

The calendar-specific modules remain small: Calendar 51, CalendarProviders 8, calendar-model 41 and Calendar CSS 18 nonblank/noncomment lines. Source hashes are recorded in [reviewed-source.json](../../work/employee-mobile/evidence/calendar-pass/review/reviewed-source.json), alongside the baseline diff. The official embedded wordmark, Phosphor regular symbols and retained license remain the existing assets. No provider logo, decorative week illustration, rasterized interface, catalog component installation or new motion system is introduced.

Not created, Link active, Link revoked and Unconfirmed are written labels; color alone carries no state. Active describes link lifecycle only. Opening setup never issues a link, and creating/copying never claims an external connection. Denied/foreign authority withholds mutation; unavailable/loading/paused views offer a status check without a lifecycle action. No eligible locations blocks creation/replacement while preserving revocation of an own existing active link.

Contextual Back restores the Profile, More or Schedule opener. Replace/revoke preserve the existing dialog focus trap, Escape and opener restoration; pointer handlers focus their opener before opening. Feedback receives programmatic focus and scrolls into view without a control-like ring. Controls retain the existing 3px keyboard focus outline. At 320px/200% text, inherited wrapping and the existing button-row reflow keep headings, Close and scrolled dialog actions reachable. In particular, `Communications.css` already supplies page-heading wrapping; the review's potential overflow concern required no source change. Existing reduced-motion behavior remains in force.

## Source truth and integration boundary

The frozen [application-source manifest](../../work/employee-mobile/references/calendar-source/manifest.json) names read-only development commit `46e202786863279302026ee03a0e225c359fa55c`. All seven frozen source files directly match their recorded SHA-256 values. This documenter checked those local copies without reopening or modifying the real application checkout.

The inspected source permits EMPLOYEE/LEAD own-session calendar management with current workspace/membership authority; no separate calendar feature flag is present in the inspected Profile. Eligible own locations are required for ISSUE/ROTATE, while REVOKE can still act on an existing own link without eligible locations. Employee targeting and management revocation of another employee remain absent from this prototype. Source feed content is own published shifts under issued and current allowed location scope, with source cancellation handling; it does not expose timecards, pay or team records. Feed credentials have a lifecycle independent of portal sign-out.

The prototype models these distinctions using fictional in-memory state. It deliberately creates only nonworking `calendar.nevora.invalid` sample URLs, with no real token, feed or calendar subscription. The transient URL appears after deliberate creation/replacement, then clears on navigation, pause, blur/pagehide/offline/hidden visibility, 45-second reveal expiry, sign-out or authority loss. Safe resume checks status and never retrieves plaintext. The final resume guard refreshes only after an actual previous pause, preserving initial unavailable/loading/paused fixtures when Firefox delivers initial pageshow/focus events.

Uncertain operations retain the original identifier/payload across in-app navigation, block new link changes, and require a result check before deliberate original replay. A committed recovery returns safe status only. Generation conflicts and old receipts cannot replace newer state. Replacement explains that the previous link stops working and each calendar app needs the new URL; revocation explains that already copied shift details cannot be recalled. Signing out clears the private preview without claiming to revoke an external feed.

Copy requires an explicit button action and supports manual native selection when unavailable. Provider guidance distinguishes Apple phone/Mac, Google computer setup and Outlook web subscription; it promises no refresh cadence. Current official instructions were checked in the recorded [provider-source note](../../work/employee-mobile/references/calendar-source/provider-guides.md). This documenter did not open provider links, log in, subscribe, write the OS clipboard or issue network mutations.

## Evidence and disposition

Direct documenter checks recomputed the HTML and frozen-source hashes, compared baseline bytes and all Light/Dark role values, checked Calendar CSS for new colors/custom properties, and parsed PNG metadata/checksums. A standard-library PNG decoder inflated/unfiltered each new canonical source/output pair and compared dimensions and RGBA pixels: all nine pairs match at 390×819. Encoded PNG bytes differ as expected after origin/hash metadata is added to public copies.

The canonical nine are [Calendar](calendar.png), [Created sample link](calendar-link.png), [Apple setup](calendar-apple.png), [Dark active link](calendar-active-dark.png), [Replace](calendar-replace.png), [Revoke](calendar-revoke.png), [Revoked](calendar-revoked.png), [Uncertain recovery](calendar-recovery.png) and [Profile entry](profile-calendar.png). Their [capture manifest](../../work/employee-mobile/evidence/calendar-pass/captures.json) and the six-image [supplemental manifest](../../work/employee-mobile/evidence/calendar-pass/review-packet/manifest.json) both bind to the final HTML hash. The canonical contact sheet was viewed directly. Some captures intentionally show a scrolled state or confirmation, rather than the top of a full page.

All 51 public image records in [asset-provenance.json](asset-provenance.json) have the current HTML hash, the correct encoded-image SHA-256, and matching embedded `impeccable:prompt` origin/hash text. Origins identify local browser captures of fictional prototype content; no image generation is claimed. The nine-pair decoded-pixel check above applies specifically to this pass's new canonical captures.

Read execution evidence in [calendar-verification.md](calendar-verification.md), the full [manual QA matrix](../../work/employee-mobile/evidence/calendar-pass/calendar-manual-qa.md), and per-engine results records 32/32 calendar scenarios in each of Chromium, WebKit and Firefox plus 15/15 pure model checks, all at the final hash. Each engine records no runtime errors, external/API requests or failures. The three regression logs preserve 237 prior passing checks per engine, giving 269 browser checks per engine after this extension. These were executed by implementation/QA, not rerun by this documenter. Build-check reports byte-for-byte source/output agreement; typecheck reports no diagnostics; the 21st review log reports eight files and zero findings.

Coverage includes 320/390/430/884px, Light/Dark, 200% text, focus/keyboard/target geometry, native disclosures/dialogs, all initial read/authority states, clipboard failure, exact 45-second expiry, lifecycle cleanup, sign-out/history/restart guards, original-operation recovery and conflict protection. Browser lifecycle/visibility events and clock progression were injected; clipboard calls were intercepted. These executions establish browser-fixture behavior, not a real provider or physical phone result.

The final [independent UI review](calendar-ui-review.md) records `disposition: ship`, with no material fixes or local-prototype finish blockers at the same final hash. Its scope is source and supplied rendered-evidence inspection, including the canonical nine, all six supplemental captures and responsive/state QA images. The reviewer inspected result assertions but did not independently execute a browser session or rerun the suite. This record preserves that distinction.

## Retained recording gaps and handoff

Existing recording gaps remain unchanged: DESIGN frontmatter contains colors without complete typography/spacing/radius/component groups, its prose uses incumbent custom headings, 21st typography/radius summaries are partial, and Impeccable has no tonal ramps or typography metadata. Static component snippets do not execute every running interaction. The default 21st color mode remains Light, with Dark recorded as an extension. Its broad no-persistence wording does not enumerate the previously authorized anonymous ended-tab boolean. None of these preexisting schema/documentation gaps was repaired or expanded by this calendar pass.

For reproducibility, preserved record hashes are PRODUCT `77ea1d548536b8177cb06a592fea0e1f1c3c581704d5843d3eb074579d106897`, DESIGN `9115fdb648201e2637434ab1144e3f751e5b50b009a3fa06eb4d9ec74a7bc68d`, 21st `343036554f492e084520824bd1fb135f80ecaabe0a1d1030970690f27040fb99` and Impeccable `44d87e2101eba853247cbe2fe159850f6e66ddfa3bb43955c21c7c8f9523d729`.

No user action is required for this documentation handoff. Real server authorization, token secrecy, concurrent persistence, feed serialization/refresh behavior and actual subscription remain later integration work. No production, security, native-device, screen-reader or complete Employee-parity certification is claimed. Any subsequent HTML or reviewed-source change requires renewed hash binding, capture/provenance validation and affected QA/review before carrying this disposition forward.
