# Native cloud checks

The active workflow source is `.github/workflows/native-spike.yml`. It runs only
on `development`, through a matching push or manual dispatch. No production,
signing or store credentials are used. It does not deploy the application.

## Evidence

- Each job checks out and records the exact `github.sha`; artifact names include
  that same SHA. The jobs use read-only repository permissions and do not persist
  checkout credentials.
- Android builds a debug APK, verifies its signature, and runs the packaged
  fictional fixture's native WebView/Back/restart checks on an API 36 x86_64
  emulator with KVM required. It fails instead of silently falling back to the
  software emulator that could not boot in the interactive cloud workspace.
- iOS compiles an unsigned simulator app on standard `macos-26`, then installs
  and launches it on an available iPhone simulator. The launch screenshot and
  surviving process establish launch smoke evidence, not working authentication,
  WebView interactions, accessibility or passkeys. The `.app` is tarred to preserve
  executable permissions when downloaded.
- Diagnostic logs are retained even when a job fails. The workflow does not turn
  a partial run into a pass. Both jobs have bounded 35-minute timeouts and share
  no concurrency group with the release pipelines.

## Sources checked November 2, 2026

- [GitHub runner images](https://github.com/actions/runner-images/blob/main/README.md)
  lists standard `ubuntu-24.04` x64 and `macos-26` arm64. No paid larger-runner
  label is requested by this workflow.
- [macOS 26 arm64 software](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md)
  lists Xcode 26.6 and installed iOS simulator runtimes.
- [Android emulator runner](https://github.com/ReactiveCircus/android-emulator-runner)
  documents KVM-backed Ubuntu execution and the required action inputs.
- Every action is pinned to the commit resolved from its stated version tag on
  that date. Availability of a runner/account quota is established by the actual
  hosted run, not by this file.

The existing locked `tools/ci-browser-runtime` package supplies Playwright for
the Android device driver. Native production dependencies remain separate.
