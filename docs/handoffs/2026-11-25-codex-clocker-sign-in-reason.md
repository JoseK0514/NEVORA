# Codex request: a reason code on the tablet sign-in mode save (Nov 25, 2026)

Jose approved this on Nov 25. It doesn't block the release.

## Why

`manageClockerDeviceAction` with `operation=SET_SIGN_IN_MODE` answers two different failures with the same shape,
`{ ok: false, refresh: true }`:

- **Stale:** another Owner changed the tablet first ("This device changed. Reload its current details and try again.").
- **Couldn't confirm:** the save may or may not have happened ("We could not confirm the update. Refresh Devices before
  trying again.").

The Owner screen (`src/components/clocker-device-manager.tsx`) can only tell them apart by the English sentence, and
the UI rule is to read codes, never words. Today both show the title "Check this tablet" with the server's sentence
under it.

## Ask

Add a stable reason to the refusal, keeping every field that's there now:

```ts
{ ok: false, refresh: true, reason: 'stale' | 'unconfirmed', message: string }
```

- `stale`: the version check failed; nothing was written.
- `unconfirmed`: the write's outcome isn't known.

The other `manageClockerDeviceAction` operations can return the same field. If they do, list which ones.

## What the UI does once it lands

- `stale`: the title is "This tablet changed" and the action is **Reload**.
- `unconfirmed`: the title is "Not confirmed" and the action is **Refresh the list**, matching the existing
  `notConfirmedTitle` pattern.
- A reply with no `reason` keeps today's "Check this tablet".

Spanish strings follow the voice guide (tú).
