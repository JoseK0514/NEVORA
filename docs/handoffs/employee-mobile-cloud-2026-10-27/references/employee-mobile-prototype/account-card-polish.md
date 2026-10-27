# More: Your account refinement

Added an explicit Your account section using the existing Section primitive. The profile entry now uses the shared white card surface/radius,20px insets,16px gaps, a48px teal avatar and18px name. The chevron and supporting role/location retain the existing visual system. Hover, press and visible keyboard focus remain available.

The same profile dialog opens; Employee work details remain read-only. Initials are decorative for assistive technology because the employee’s full name labels the button. No new permissions or account actions were added.

Current HTML SHA-256: `f93b814910cdb6b9ba4e710f4a159a6845e91ff2fe81f3e628b3b04dcf0589ab`. Built/saved/served bytes agree.

## Checks actually run

- TypeScript compile and React/esbuild build pass.
-38existing scenarios pass in each of Chromium, WebKit and Firefox.
-10account-card scenarios pass in each engine: explicit account grouping; read-only profile; keyboard activation, Escape/focus return;320/390/430/884px layout;200% text at320/390px; empty work data preserving account identity; no runtime errors.
-9Today-card scenarios rerun and pass in each engine.
- Current320/390px and enlarged-text captures inspected; actual in-app browser More screen checked.
-14flow captures and8delivered raster images refreshed; source/origin/image hashes verified.
- White avatar initials on teal use the existing6.09:1 color pairing.

This narrow refinement was self-reviewed. Previous independent UI/gate reports apply to their recorded earlier artifacts. No new full feature coverage, production integration or server authorization is claimed. The [desktop parity audit](desktop-parity-audit.md) remains applicable.

All edits stay in the Employee prototype’s owned directories. This projectless workspace has no Git branch, commit, PR or deployment. Existing design-record format drift remains the documented follow-up; it was not repaired as a side effect.

[More screenshot](more.png) · [Prototype](index.html?page=more) · [Detailed checks](checks.json)
