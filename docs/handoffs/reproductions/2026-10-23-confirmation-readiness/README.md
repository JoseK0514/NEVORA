# Confirmation readiness and layout regression

This is a portable derivative of the independent merged-source UI fixture retained at `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/ui-readiness-4db5edf5/`. Original reviewer reports and evidence remain unchanged. The actual EmployeeMySchedule parent renders server-side; the real confirmation hydrates in its production action container. The root/app/schedule CSS import sequence and shell selectors are included. Only confirmation hydrates. Router, action, visibility observations and historical baseline are declared fictional test boundaries; no Next server, PostgreSQL, provider or customer data is used.

Changes from the retained reviewer fixture: inputs resolve beside this script, evidence is required outside the repository, the historical TSX is a text fixture, the bundle loader avoids a reserved lint variable, and the geometry evaluator additionally requires a successful functional report with all eight cases. Native controls and geometry thresholds are preserved. The baseline is the original confirmation at `32882297`, a context specimen rather than a layout oracle.

Use the existing installed `tools/ci-browser-runtime` dependencies. From a clean repository checkout, run each theme into its own fresh external directory:

```sh
export PHASE_E_EXPECTED_SHA="$(git rev-parse HEAD)"
export PHASE_E_EVIDENCE_DIR="$(mktemp -d /tmp/nevora-confirmation-light.XXXXXX)"
NEVORA_UI_THEME=light node docs/handoffs/reproductions/2026-10-23-confirmation-readiness/parent-ui-control.mjs
node docs/handoffs/reproductions/2026-10-23-confirmation-readiness/geometry-acceptance.mjs "$PHASE_E_EVIDENCE_DIR/ui-report.json"
```

Repeat with a new directory and `NEVORA_UI_THEME=dark`. Both browser and geometry commands must exit zero. Inspect the recorded screenshots as part of visual QA. This is a bounded manual regression entry point; the existing mandatory Attention CI step separately runs the actual-component CSR/SSR lifecycle regression, and the actual Next/PostgreSQL matrix remains mandatory.

The fixture covers Chromium/WebKit, 320px at 100% and 200% root text, 390px at 200%, and 1440px at 100%. It checks preparing/no command, listener readiness, original-operation retention, native keyboard focus/submit, unavailable feedback and retirement. Separate geometry criteria require readable containment, no copy/action overlap, targets at least 44px and at most 1px preparation-to-ready card/following-content movement. Root text scaling is not physical-device, screen-reader, OS-setting or browser-zoom certification. Historical cloud timing and transport causes cannot be inferred from this fixture.

The retained `c048` complete-cascade geometry fails six of eight cases. Independent `cb115` passes twelve profiles; merged `4db5edf5` passes sixteen light/dark cases with exactly zero movement. Their reports remain attributed to their actual source commits. Never overwrite retained failed or passing evidence when replaying.
