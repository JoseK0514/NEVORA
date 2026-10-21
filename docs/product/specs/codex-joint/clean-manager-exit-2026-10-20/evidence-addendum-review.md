# Task 1 final evidence addendum review

- specVerdict: PASS
- qualityVerdict: PASS
- codeQualityStatus: CLEAR
- recommendation: APPROVE evidence report only
- blockers: []

Reviewed the scoped documentation changes f4171de1..62cb5dd7 under `docs/product/specs/codex-joint/clean-manager-exit-2026-10-20/`: README, manualQa matrix, matrix-summary.json, and the independent touch-target report addendum. Later browser-suite commits are excluded. This is not authority to close independent findings or approve the UI/release.

## Findings by severity

CRITICAL: none in this evidence addendum.
HIGH: none in this evidence addendum.
MEDIUM: none in this evidence addendum.
LOW: none requiring correction. The earlier temporary-retention caveat is addressed by the verified durable local copy; this is local retention, not an assertion of off-device backup.

## Verified evidence

1. Aggregate: the original three P1 and one P2 plus IS-MAN-02 P1, IS-MAN-03 P2, and IS-MAN-04 P2 correctly yield four P1 and three P2. README's seven-row table agrees with the independent report. Findings remain open.
2. Actual tablet hit testing: durable `manual/target-overlap-results.json` has both Chromium and WebKit records at 768×900,125%,touch. Inbox is y228..260. A tap at y258 dispatched pointerdown and click to Schedule and recorded `/app/schedule`; a subsequent center tap navigated to Inbox. The sampled exclusive vertical span is34px. The retained script installs event collection before navigation and performs actual touchscreen.tap calls. The report correctly rejects nominal44px pseudo geometry as proof of a usable44px area.
3. Inbox width: both-engine target-results records show39.453125px visible width and44px pseudo height, right+2px taps select Act now, and top−4px taps select All. Point scans independently support the limited horizontal extent. The report distinguishes working vertical expansion from insufficient width.
4. Day strip: both engines record43.421875×64px Monday geometry with no pseudo expansion; point scans and actual boundary taps select the neighboring day. The report explicitly notes coordinate rounding and limits the result to a subpixel contract shortfall rather than a major usability or WCAG-AA claim.
5. Landscape: all four fresh844×390 touch contexts (two engines × two mobile-emulation modes) record sidebar invisible and matching phone landscape media. The report confines dismissal to those fresh scenarios and does not claim to disprove every navigation/resizing history.
6. Durable retention: parsed manualQa at62cb5dd7:24 surface rows,10 adversarial rows,77 artifacts. Every reference resolves. Recomputed all77 SHA256 hashes and byte sizes against the README-mapped durable `manual/` copies; zero discrepancies. Root: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/manager-owner-exit/`. Existing temporary reference paths are explicitly mapped by README to this retained copy.
7. Matrix summary: independently counted6160 cells and308 navigations in durable matrix.json; zero bad navigation statuses/errors and zero document-width overflow cells. Counted296 clipped candidate cells/elements and1037 short-target cells (13574 candidate elements). README correctly calls1037 cells, not individual controls. All matrix-referenced screenshots exist. The exact helper is retained and shows post-hydration resizing/text scaling and reduced motion, consistent with the README's limitations.

## Scope and quality assessment

The evidence distinguishes raw candidate estimates from independent actual hit-test findings, preserves errors/limitations, and makes no unsupported all-controls, all-states, zero-exit, or production-ready claim. The geometry matrix does not certify every lifecycle state, and the report explicitly retains large-data/adversarial, native assistive technology, and WebKit keyboard-preference gaps. Four P1 and three P2 are findings about the candidate, not blockers to accepting an honest NO-GO audit document.

The remove-ai-slops and programming perspectives were consulted in the initial review and applied again here. No production code or tests are added by this scoped documentation diff; no deletion-only/prose-pinning/tautological/constant-mirroring tests, unnecessary production parsing, escape hatches, or abstraction were introduced. No skill-perspective violation found. External measurement scripts are evidence collectors rather than an automated product pass gate; their waits are not used to infer universal success.

No tests or browser scenarios rerun, implementation changes, subagents, commits, pushes, database writes, or finding closures. Read-only artifact parsing/hashing and script inspection only, plus this report artifact. Canonical fallback addendum is `.omo/evidence/clean-manager-task-1-code-review.md`; requested delivery is this file. The prior review remains a historical initial-review verdict.
