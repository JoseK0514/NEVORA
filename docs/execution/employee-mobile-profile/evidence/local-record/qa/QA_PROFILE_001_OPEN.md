# QA-PROFILE-001 — System appearance remains dark after the device becomes light

**ISSUE · MEDIUM · OPEN** on `4bf7257950f898b97b93293470f0677bdb70b6bf`.

Run the exact selector-free combined argv/environment in 4bf72579/combined/invocation.json. In Profile after the light/dark width matrix and 200% keyboard case, emulate dark, select System, then emulate light; the root theme stays dark through the existing assertion window.

Expected: With Appearance=System and matchMedia(prefers-color-scheme: dark).matches=false, rendered root data-theme becomes light.

Observed: `theme=dark`, `choice=system`, `stored=null`, `matchMedia dark=false`, `visibility=visible`. The failure screenshot was personally inspected and shows the dark Profile with System selected.

Reproduced during the first valid full combined attempt; no retry or app/test mutation. Root previously observed a similar failure in preflight5. Chromium and WebKit passed their System checkpoints in this attempt.

Not established. This evidence proves the observed Firefox system-following mismatch; an application defect versus browser-emulation defect needs an isolated, evidence-backed determination. Do not assert a global theme fix or dismiss as flaky.

Blocks clean Profile acceptance until remediation or proven environment limitation receives independent re-verification.

Full artifact hashes and exact paths: `QA-PROFILE-001.json`. Combined run is still in progress; this is not a final suite summary.
