# Android minimum-OS qualification — November 5, 2026

Owner: Codex/root. Jose asked to continue Android after approving the precise
WebView 156.0.8078.50 minimum. Android 10/API29 remains the declared minimum.
This continues local preparation; it does not authorize hosting, distribution,
production, a new subscription, or a different runtime baseline.

Execution status: API29 actual old-provider and large-text/keyboard diagnostics
passed. The retained Play APK's API32 requirement was confirmed by a normal
API29 install rejection. Matching-package acquisition remains blocked by browser
access/download availability; full API29–31 qualification is not complete.
Task-owned services and the disposable AVD are closed. Results and next action:
[minimum-OS evidence](../../native/evidence/2026-11-05/android-minimum-os/README.md).

## Starting evidence and controls

- Clean detached checkpoint: `c8211cd2a71655bedba067eed2437b5ee7c2c3a4`.
- Freshly fetched development: `e9c3a66da330959738100884f87cb76fd2af8296`,
  already included in this checkout. The source check still reports a fourth
  remote branch and collaboration-head drift. Preserve both; shared release
  integration remains blocked.
- The earlier Google Play package is signed by the verified Google WebView
  certificate, but its manifest requires API32. That artifact cannot establish
  API29–31 support. Chromium's pinned 156.0.8078.50 source defaults to API29;
  source configuration alone does not prove an available retail package works.
- Paid hosting remains on hold. Existing user devices, SDK images, worktrees,
  key custody, production and Clocker environments remain preserved.

## Execution

1. Obtain an official disposable API29 image. Preserve official metadata,
   archive checksum and extracted-file hashes. Reuse Jose's SDK license
   acceptance only after verifying the complete text is byte-identical.
2. Create a uniquely named private AVD. Verify its process identity, actual API
   and provider before testing. Keep fixtures and accounts fictional and local.
3. Exercise the existing actual old-provider update/browser-intent regression
   and large-text/keyboard profile without changing assertions or timeouts.
   Record these as fallback diagnostics, never supported-runtime acceptance.
4. Obtain the matching API29-compatible provider if available. Independently
   verify APK signatures against the existing Google certificate, package,
   exact version, ABI and manifest; do not rely on download-page claims or
   patch/re-sign the APK. A mirror download, if used, is explicitly identified
   and does not establish Google Play delivery on that OS.
5. If a verified supported provider is available, run the original full native
   matrix and independent cold restart, then qualify additional API30/31 images
   sequentially within local storage limits. Retain failures. If unavailable,
   record the precise missing artifact/access requirement without changing the
   approved baseline or converting fallback passes into runtime qualification.
6. Close only invocation-owned processes/AVDs after identity and serial-lock
   checks. Save public evidence and a handoff; keep account screens, credentials,
   APKs and private signing material outside Git.

## Acceptance and leadership positions

Engineering keeps the existing shell and precise version admission policy.
Security retains session/privacy controls and verifies provider provenance.
Technical assurance distinguishes actual supported-runtime results from source
inspection, fallback diagnostics and package-install rejection. Governance keeps
shared-source, physical-device, signing, hosted and distribution gates open.
Delivery records exactly which OS/provider pairs were tested. No independent
audit closure or product-baseline change is part of this step.

Independent upload-key recovery, an approved isolated HTTPS environment and
physical-phone testing remain later dependencies for a usable signed beta.
