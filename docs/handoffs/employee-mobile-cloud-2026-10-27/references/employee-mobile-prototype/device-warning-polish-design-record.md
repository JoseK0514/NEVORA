# Device warning polish — design comparison

Disposition: **fits the existing Employee visual system**. This is a bounded ordinary refinement and a substitute comparison for the unavailable shipped Impeccable documenter. The user rejected the yellow device warnings. That instruction authorizes this local neutral treatment; it establishes no new global palette.

Reviewed authority: Employee `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.21st/design.json`, `.impeccable/design.json`, and Impeccable `reference/document.md`. Existing design records remain authoritative. Their preexisting metadata omissions are preserved; this comparison does not regenerate them.

| Component | Baseline → refinement | System fit |
| --- | --- | --- |
| Device attention badge | Amber fill/text → neutral outlined surface with a 14px Phosphor warning-circle | Reuses `--surface`, `--ink`, `--line`, `--muted`, existing caption type and small radius. Explicit Needs attention/Blocked wording carries meaning. |
| Cleanup notice | Amber paragraph → aligned 20px warning-circle, strong condition title and separate muted explanation | Reuses `--canvas`, `--line`, `--ink`, `--muted`, supporting type, 16px padding, 12px gap, 4px title/copy separation and 12px control radius. Existing 620 emphasis and 1.5 line height support hierarchy. |
| Shared controls/statuses | Existing Button, Status and Icon retained | Scope is confined to the device header/cleanup notice. Shared pending statuses retain amber; enabled retains success styling. Recovery actions and uncertainty wording remain intact. |

The source diff changes only `src/DeviceAlerts.tsx` and `src/DeviceAlerts.css` against the frozen before copies. The state-stage predicate is factored without changing its membership. Permission, enrollment, cleanup/retry gates and model behavior are unchanged. `device-alerts-model.ts`, `tokens.css` and `Appearance.css` independently compare byte-identical to baseline, preserving both Light tokens and centralized Dark adaptation.

Final saved HTML SHA256: `09384581c0106600a436d9cfd0f6c2acbf0f9e6a62780419b41e0ac1a9ddcbf1`.

Baseline HTML SHA256: `00bcc2615af63ad23d21109f3eca90ff24cfab8950a470bf4984ae9e6d00619c`.

Final source SHA256:

- `DeviceAlerts.tsx`: `37b5568d0e814043b7b776bbbda883a437dfabd9e337111a71e5c12d6fed0b93`
- `DeviceAlerts.css`: `b1cb9fffee722d4ab671d5ce59e292703c84dcecdccb6a1dff71683ff8be75a2`

Evidence: independently opened before/after Light/Dark captures and verified all 18 image hashes in `evidence/device-warning-polish/captures.json` against disk. The full [UI review](device-warning-polish-ui-review.md) records ship approval after corrected 200% warning/badge captures and separate recovery captures; it inspected all 16 current images. Its three-engine results are executor evidence, not browser checks independently run for this record. This comparison adds source/capture review only.

This remains a fictional local prototype. No actual device, browser permission, native integration or production behavior changed. No branch, commit or deployment was created by this documentation task; the workspace has no Git repository.
