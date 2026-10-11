# NEVORA employee home — local visual handoff

## Scope and implementation

Jose authorized a mobile and desktop visual refresh, with bounded employee-home
layout refinements, while retaining NEVORA's established structure, navigation,
animations, and workforce behavior. This follows the earlier Typeface paint
refresh; its original handoff describes that earlier checkpoint only.

The employee home now uses white elevated panels on the specified #FAFAFA canvas,
quiet neutral insets, restrained orange accents, clearer date tiles, readable
weekly totals, and consistent buttons. Today and recorded clock status remain
first; upcoming shifts and the weekly summary follow. Desktop retains two
columns, and mobile stacks the same content. The supplied Inter and JetBrains
Mono fonts remain intentional. Existing success, warning, and danger meanings
are retained.

Shared navigation and employee actions use individually imported SSR-compatible
Phosphor icons from the pinned `@phosphor-icons/react` 2.1.10 package. The shared
palette also replaces remaining blue paint literals in global CSS with existing
theme-compatible tokens. Every other byte of that stylesheet is preserved.

Original workday and planner artwork was generated using the built-in image
model, inspected, refined once, and saved under `public/assets/illustrations/`.
The manifest records full prompts, dimensions, hashes, transparency, and usage.
AGENTS.md links this folder and DESIGN.MD. Decorative images have empty alt text,
reserved dimensions, and remain secondary to real schedule and time information.
The inventory contained official branding rather than stock content photos;
official logos, wordmarks, and PWA icons remain unchanged.

## References and choices

DESIGN.MD records Phosphor, the Luma and Givingli date/agenda references, and the
Square workforce reference from Mobbin. The 21st MCP catalog supplied three
suitable options: Dashboard Activities, App Dashboard Layout, and Coach
Scheduling Card. The review page shows their previews and source links. These
inform hierarchy and date treatment; no paid component code was fetched or
imported, and no new booking or scheduling workflow was introduced.

## Evidence

| Check | Observed result |
|---|---|
| Full `npm test` | 202 files, 2,125 tests passed; 87.17 seconds |
| Final `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| Final `npm run build` after palette tokenization | Exit 0 |
| Source-reading CSS/brand/profile/governance checks after tokenization | 5 files, 23 tests passed |
| `git diff --check` | Exit 0 |
| System browser matrix | 480 cases; no findings or runner errors |
| Final palette and employee-state matrix | 232 passes, no findings; eight focus-runner errors retained |
| Targeted final state rerun | 12 cases passed; no findings or runner errors |
| Finance browser matrix | 42 cases, no runner errors; eight inherited payroll clearance warnings |
| Review viewer | Chromium/WebKit at 320, 390, and 1440px; seven comparison choices, three catalog previews, two artworks; no overflow or focus failures |
| Source/scope guards | 641 application files per final scratch snapshot match the checkout; business/API/database/auth code, clock behavior, official branding, and established motion remain intact |

The system matrix preceded the final global paint token substitutions. The final
palette matrix covers twelve representative surfaces across widths 320, 375,
390, 430, 768, 1024, and 1440 in Chromium and WebKit, plus schedule/time states.
Its eight errors came from focusing a disabled Refresh button. The rerun uses
enabled controls, activates keyboard modality, and retains the same visible
focus threshold. Loading, paused, refreshing, failed-read, denied-session,
clocked-in, break, published, unpublished, unavailable, empty, and long-name
states are represented in the retained evidence.

A first targeted run logged eight passes but failed the added published-empty
cases because a lazy image was checked before loading. A subsequent runner
change closed the login page before its artwork requests finished; that owned
runtime stalled on WebP image responses. The raw asset and an independent Sharp
WebP conversion succeeded. Those runs and diagnostics are retained. The final
runner restores the login settling wait, scrolls lazy images into view and waits
for successful loads, bounds font readiness, and settles intercepted requests
before closing browser contexts. A programmatic focus check was inconsistent in
one WebKit case, and plain Tab skipped the representative controls in the macOS
runtime. The final check reaches the same enabled target through Tab in Chromium
and Option-Tab in WebKit, then requires native focus-visible and a minimum 2px
outline. This follows [Apple's keyboard navigation guidance](https://support.apple.com/en-ie/guide/safari/cpsh003/mac).
All twelve cases pass. Original observations remain retained; no application
assertion or test was weakened.

Eight owner-payroll-export mobile bottom-navigation clearance warnings recur at
320, 375, 390, and 430px in both engines, matching the earlier original/styled
baseline. They remain open for separate triage; this employee-home refresh does
not self-close them. Timecard and report surfaces have no findings in this
finance matrix. These are observations, not independent accessibility or release
certification.

## Ownership, environment, and release state

Implementation and evidence owner: Codex. Visual review and integration decision
owner: Jose. Product/CPO scope is clarity in existing employee tasks; Engineering/
CTO scope is reversible presentation changes without behavior or data changes.
Governance, Policy, Risk, and Release constraints retain open inherited findings
and existing release gates. These positions apply the repository agreements;
they do not represent independent director sign-off.

The branch is `codex/nevora-typeface-visual-refresh-20261010`, based on development
commit `b58496b84b21690f7be22474f7570da2d81af6c3`. The original checkout and other
worktrees remain untouched. The follow-up is a local candidate only; no push,
PR, merge, or deployment was performed.

Browser runs use fictional accounts, owned loopback PostgreSQL clusters, and
scratch Next copies. Only the scratch database transport and authenticated
state fixture route are substituted. No production credentials, customer data,
real messages, orders, or publication/punch writes are used. Owned test runtimes
are disposed after verification. The separate read-only preview server serves
the review package locally.

Local Chromium/WebKit evidence does not certify physical mobile devices, real
screen readers, hosted behavior, production data, or all workflows. The review
viewer is a screenshot comparison, with the Next development toolbar hidden in
captures. Source manifests and the scope guard identify the exact tested files.

## Handoff and rollback

The latest review package is under
`/Users/josek0514/Documents/Codex/2026-10-10/np/outputs/nevora-typeface/employee-home/`.
It includes the comparison viewer, DESIGN.MD, AGENTS.md, asset prompts and PNGs,
verification notes, reports, source guards, and a binary Git patch. The exported
verification JSON records the final local candidate commit.

The next gate is Jose's visual review, followed by development-line integration
under the existing release process. No additional permission is needed to
inspect these local results. After integration, revert the employee-home commit
for a full follow-up rollback; revert the earlier Typeface commit separately if
that earlier refresh also needs removal. No data migration is involved.
