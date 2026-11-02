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

The wrapper prints its evidence directory. Accept only a successful named-check
matrix with verified source and closed ownership. Retain failed logs/results;
incomplete runs, transport fixtures and unsigned builds are separate evidence.
Physical devices, HTTPS associations/passkeys, provider sends and store signing
remain distinct acceptance steps.
