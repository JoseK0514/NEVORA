# Light appearance by default — October 27, 2026

Jose requested Light appearance unless the person deliberately changes it.

The shared before-paint bootstrap previously treated an absent, invalid or unreadable `nv-theme` preference as `system`, so a device in dark mode opened Nevora in dark mode. The Profile appearance store also used System as its server snapshot.

The default is now Light in the bootstrap, preference reader and server snapshot. Explicit Light and Dark preferences remain valid. Explicit System is now stored as `nv-theme=system`, so it remains distinct from no selection and still follows device changes. Older System selections were represented by a missing key and cannot be distinguished from no selection; missing keys now use the requested Light default.

No CSS, frozen mobile screen, authentication, permission, database or delivery behavior changes. All 33 frozen mobile runtime file hashes remain unchanged. Production is outside this change; review and deploy only to Preview.

Verification:

- Reproduced before the fix: six of the ten theme regression assertions failed, including a dark device with no preference opening dark.
- Theme and adjacent Employee/Manager Profile suites: 27 tests passed across three files.
- TypeScript check and targeted ESLint passed; whitespace check passed.
- Hosted dark-device and explicit-preference browser checks are recorded separately with the Preview deployment receipt. Do not infer a hosted deployment from these local checks.

Rollback: revert this bounded change or return to the prior dev Preview. No migration or customer-data rollback is needed. Existing explicit Dark preferences are intentionally preserved.
