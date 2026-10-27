# Employee Profile part 1 — independent finish review

## 1. Disposition / recommendation

**Recommendation: REQUEST_CHANGES. Terminal disposition: FIX, then REBUILD and RECAPTURE.**

Reviewed artifact: `outputs/employee-mobile/index.html`, SHA-256 `d4d840a0cb3f987338ecb1f39f48280cb9b101475c304cb8fb96e98cf22e9414`.

The implementation is a real, reusable, token-driven extension of the approved clean teal Employee mobile prototype. One reproducible enlarged-text layout defect remains: the new Appearance sheet heading overlaps Close at 320px / 200% text. This is a MEDIUM accessibility/finish blocker against the explicit reflow requirement, not a fake-component or palette failure. Fix it before calling this slice finished.

This independent fidelity-review role substitutes for the unavailable exact Impeccable finish-reviewer role. It reviews the approved design and craft-floor mechanics; it does not imply an official Impeccable score, production approval, or security certification. No implementation files were edited.

## 2. Visual hierarchy / fidelity evidence

Inspected `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, root `.21st/design.json` and `.impeccable/design.json`, frozen reference manifest, supplied source-authority record, and `/Users/josek0514/.codex/skills/impeccable/reference/craft-floor.md`. Root records are Owner-scoped reference material; Employee's local visual contract controls this review. The Design System Enforcer skill was applied. Pinned system typography takes precedence over generic display-font guidance.

The full available implementation delta against `evidence/profile-pass/before/` is recorded in `work/employee-mobile/evidence/profile-review/inspected.diff`. This workspace has no Git repository, so this is a captured-baseline diff, not a claim of a Git commit delta. The read-only application checkout was independently confirmed clean at `46e202786863279302026ee03a0e225c359fa55c`; source Profile choices/details and projection were read there.

Visual inspection covered the seven named supplied captures; Chromium account captures at 320/390/884; light and dark choice sheets at normal/enlarged text; dark Home, Hours and Updates; and WebKit enlarged dark choices. Independent captures add actual scrolled work details and dark native dates/selects:

- `work/employee-mobile/evidence/profile-review/chromium-details-light-390.png`
- `work/employee-mobile/evidence/profile-review/chromium-details-dark-320-text200.png`
- `work/employee-mobile/evidence/profile-review/webkit-native-fields-dark.png`
- `work/employee-mobile/evidence/profile-review/chromium-appearance-320-text200.png`
- `work/employee-mobile/evidence/profile-review/webkit-appearance-320-text200.png`

Identity → Preferences → read-only Work details is clear and consistent with the approved hierarchy. White/teal Light retains the existing 32px page heading, grouped rows, 16px cards, system type, regular Phosphor icons and five-destination navigation. Dark preserves the same structure and changes semantic colors. Details wrap and remain reachable, including the timezone and manager-correction guidance. Native Dark fields have light text on the dark surface, a visible control border, and `color-scheme: dark`. No alternate layout or visual theme was invented.

## 3. Token / component / anti-slop findings by severity

**CRITICAL: None. HIGH: None. MEDIUM: None in component/token authenticity.**

React renders actual `Heading`, `Section`, `Row`, `Button`, `Icon`, `Empty`, native `fieldset`/`input[type=radio]`, and `dl` elements. `Profile.tsx:6–29` and `PreferenceChoices.tsx:3–21` consume shared primitives. Runtime inspection found two real preference rows, no rendered canvas, and one image: the legitimate 88×12 official NEVORA wordmark. No screenshot/background-image substitutes for interface elements. The Dark wordmark treatment in `Appearance.css:25` is a legitimate monochrome adaptation of that asset.

`tokens.css`, `components.css` and `layout.css` exactly match the supplied pre-pass baseline. `Profile.css` consumes established color, size, radius and spacing roles; measured section separation is 28px. Its 20px radio, 620 weight, hairlines and breakpoint are consistent with incumbent primitives, rather than a competing visual system. No required cleanup is raised for those existing-value literals.

Dark's 20 semantic overrides are centralized in `Appearance.css:1–24`. The supplied source palette hash `41f2c3037087cfc3c81d42911137e6e59c88d945c58eb35038a67671bfe880d8` was independently verified. `dark-token-map.json` records the source/adapted mapping and retained control-border role. The 21st scanner's literal-color notices point to token definitions, not scattered component colors; they are not evidence of token bypass.

**LOW — incomplete supplied work-details screenshot.** `capture-profile.cjs:3` scrolls the Work details heading, which is already visible. Consequently `profile-pass/profile-work-details.png` repeats the top account view and omits App access and Time zone. This is an evidence-quality issue, not a UI data-loss defect. Independent `chromium-details-light-390.png` shows all four fields. Recapture the named deliverable with the details visible.

## 4. Behavioral / permission / accessibility findings

**MEDIUM — Appearance title overlaps Close at 320px / 200% text.**

Reproduction: open `?page=profile&appearance=dark` at 320×853, set the root font size to 200%, then open Appearance. This also appears in supplied Light/Dark enlarged captures. Shared `src/layout.css:29–31` keeps the heading and fixed 44px Close target on one flex row while the unbreakable 48px Appearance text overflows its shrinking box. The new title is supplied through `src/Profile.tsx:15` and rendered by `src/App.tsx:41`.

Independent Chromium and WebKit measurements: heading box x20–252; rendered text x20–279.64; Close target x264–308; icon x274–298. Text intrudes 15.64px into the Close target and 5.64px into the icon. Both screenshots visibly show the collision. Existing checks only assert sheet/content scroll width and miss this internal overlap. Preserve the approved type hierarchy and 44px target while reflowing the header; add an assertion for actual title/Close separation. It is bounded to enlarged text, and Close remains operable, so MEDIUM is appropriate.

Other checked behavior passed:

- Independent Chromium/WebKit keyboard sequence: heading → Tab Close → Tab checked radio → ArrowUp updates selection → Tab Done → Escape returns to the exact Appearance opener. Recorded in `profile-review/independent-results.json`.
- Supplied current-hash profile results: 26 groups each in Chromium, WebKit and Firefox, all `failure: null`. Reviewed runner and results cover live system theme changes, explicit Light/Dark, Done/Escape return, Back to More card focus, readonly details, withheld denied/unrelated reads, recovery, loading/error, long text, and no cookie/storage writes.
- Own projection is explicit; extra raw fields do not enter the view. Preferences stay available during a work-details read failure, while denied/unrelated profile fixtures withhold account controls. The sample is not a server permission implementation.
- Language clearly says English/Español and sign-in pages only; it does not pretend to translate the workplace UI. Changes and refresh reset are labeled as sample behavior.
- Independent computed-text contrast checks on Profile, Home, Hours, Updates, Requests and Schedule in both themes found no text pair below 4.5:1. Lowest sampled Light ratio 5.03:1; Dark status minimum 6.31:1 (Declined), amber Review needed 6.84:1, and usual supporting text 7.71:1. Alpha washes were composited against ancestor surfaces. See `profile-review/contrast-results.json`; this is a bounded sample, not a full accessibility audit.

## 5. Limitations / next action

`node build.mjs --check` independently passed. Saved and served HTML hashes both equal the reviewed hash in Chromium and WebKit. Review scripts are `profile-review/review.cjs` and `profile-review/contrast.cjs`; their JSON and screenshots are the direct reproduction artifacts. Supplied model evidence contains 15 assertions and source hashes; supplied compiler/build logs were inspected. No production application build, API, OS preference, storage, credentials, or user browser tabs were touched.

Fix the title/Close collision, rebuild, rerun the bounded enlarged-text/focus checks and affected shared-sheet regressions, then recapture all changed-hash deliverables and request a focused re-review. Recapture the named work-details screenshot. No broader redesign is needed. The Profile implementation and approved Light composition otherwise meet this review's fidelity standard.

Not established: real-device Safari, VoiceOver/TalkBack, production authentication/authorization, durable preferences, integration, deployment, or exhaustive theme coverage of every existing nested workflow. No notepad path was supplied; this report and its referenced evidence are the review handoff. No commit or deployment was made.

---

# Final bounded recheck — supersedes initial disposition

## 1. Disposition / recommendation

**Recommendation: APPROVE. Terminal disposition: SHIP the local part 1 prototype. Blockers: none.**

Final reviewed HTML SHA-256: `5dcb9f1050c56a533c0fc72150ccbec588e470eadf14dd61f3ecd13eacf7fe58`. This verdict supersedes the initial REQUEST_CHANGES for `d4d840…`; the initial findings and evidence above are retained as history. “Ship” means ready for this local prototype handoff, not deployment or production certification.

## 2. Visual hierarchy / fidelity evidence

Independently inspected the only UI fix: `src/layout.css:30` adds `overflow-wrap: anywhere` to the shared sheet title. The type size, hierarchy, palette and fixed Close target are unchanged. Rechecked 320px and 390px, 200% text, Light and Dark in both Chromium and WebKit (eight cases). At 320px the title wraps onto two lines; text ends at x228.30 and Close begins at x264, leaving 35.70px clearance. At 390px the title stays on one line with 46.36px clearance. The enlarged heading remains 48px and the Close target remains 44×44px.

Direct evidence: `work/employee-mobile/evidence/profile-review/recheck-results.json` and the eight `recheck-{chromium,webkit}-{light,dark}-{320,390}.png` captures. Visually inspected Chromium Light 320, WebKit Dark 320, Chromium Dark 390, and the refreshed named `profile-pass/profile-work-details.png`.

The refreshed work-details capture now shows Company, Work locations, App access and Time zone in full. `capture-profile.cjs:3` targets `.account-details`, and `profile-pass/captures.json` matches the final HTML hash. The earlier LOW evidence-quality finding is resolved.

## 3. Token / component / anti-slop severity findings

**Open CRITICAL: none. Open HIGH: none. Open MEDIUM: none. Open LOW from this review: none.**

The initial real-component, token/palette and official-wordmark findings remain valid. The bounded wrapping correction adds no new component, color or type role and retains the approved visual language. The MEDIUM collision and LOW capture issue are both closed; no new issue was observed in the bounded recheck.

## 4. Behavioral / permission / accessibility findings

All eight independent cases passed heading overflow and actual text-range/Close separation assertions. Each also passed: Tab to Close, Tab to the checked native radio, Arrow selection, Tab to Done, activation of Done restoring the exact opener, and reopen/Escape restoring the exact opener. Results have `failure: null`.

Inspected the strengthened existing `profile-next.cjs:35` assertion: it now checks both heading `scrollWidth <= clientWidth + 1` and text range right edge at least 8px before Close; prior checks remain. Current-hash profile results show 26 groups passed with `failure: null` in Chromium, WebKit and Firefox. This review independently reran the eight bounded Chromium/WebKit cases, not the entire regression suite. Permission/integration scope is unchanged.

## 5. Limitations / next action

Independently reran `node build.mjs --check`: PASS. Saved SHA-256 and served response bytes matched the final hash in every independent case. No UI edits, live data, storage writes, OS preference changes or user browser tabs were used by this reviewer.

No further fix, rebuild or recapture is required for this review. Proceed with the local part 1 handoff after the separate overall QA/gate completes. Initial limitations still apply: no real-device assistive technology, production authorization, durability, integration or deployment certification. Exact Impeccable finish-reviewer role remains substituted by this independent fidelity review.
