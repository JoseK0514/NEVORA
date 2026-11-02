# Disposable full-backend native verification

Run only from a clean, committed candidate. Neither production project is a test source.
Select the installed PostgreSQL binaries explicitly with `NEVORA_TEST_PG_BIN` and
unset all inherited database selections. The wrapper rejects existing database URLs,
copies the committed application into a private external directory, initializes its
own cluster and database, and stops only resources whose ownership it can prove.

```sh
node scripts/native-owned.mjs --mode owned-local --expected-sha "$(git rev-parse HEAD)" --platform contract
node scripts/native-owned.mjs --mode owned-local --expected-sha "$(git rev-parse HEAD)" --platform android --android-serial emulator-5558
node scripts/native-owned.mjs --mode owned-local --expected-sha "$(git rev-parse HEAD)" --platform ios --ios-simulator OWNED-SIMULATOR-UUID
```

Android also requires `ANDROID_HOME` and an explicitly owned running emulator.
iOS requires an explicitly owned simulator and Xcode. Allocate at least 4 GiB
free before the backend, with additional space for simulator creation. Large
environments must run serially. No signing, uploads or hosted deployment occur.

Contract mode uses real Next.js, ordinary sign-in, browser-owned test sessions,
fictional roles, local SMTP capture and PostgreSQL. It checks private responses,
role access, representative writes, invitation activation, expiration, revocation
and a database-read outage. It does not qualify a native platform by itself.

Platform mode adds real container UI tests. A separate loopback test controller
can reset only the owned fictional data and induce/recover an outage; it requires
the invocation receipt and rejects browser requests. It is never an app route.
SDK tests do not extract native session cookies or bypass business writes.

Android evidence records its WebView package/version and accessibility mode before
and after the run. Full-backend qualification requires `platform-default` and
refuses any WebView command-line override. A transport fixture may explicitly
select `--accessibility-mode renderer-complete`; this reads an already installed,
nonce-owned QA flag and never creates or overwrites one. Unknown or changing
flags fail closed. Keep the flag's ownership/removal receipt beside that result.

On the owned API36 image's WebView133, the raw static transport pages intermittently
lost accessibility descendants while their native window/document stayed focused,
visible and loaded. The same binary's nine fixture cases and process-restart check
passed with Chromium's renderer accessibility enabled; the default-mode control
failed again. These mode-qualified transport results establish navigation/CSP
behavior in that environment. Default physical-device accessibility remains a
release gate. The real Next/PostgreSQL acceptance uses default settings.

Chromium documents [on-demand accessibility and renderer modes](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/accessibility/accessibility_switches.cc)
and [debug-emulator command-line flags](https://chromium.googlesource.com/chromium/src/+/0f46ff87434118e9bcb51e7cb1393f100c8d3fd9/android_webview/docs/commandline-flags.md).

The wrapper prints its evidence directory. Accept only a successful named-check
matrix with verified source and closed ownership. Retain failed logs/results;
incomplete runs, transport fixtures and unsigned builds are separate evidence.
Physical devices, HTTPS associations/passkeys, provider sends and store signing
remain distinct acceptance steps.
