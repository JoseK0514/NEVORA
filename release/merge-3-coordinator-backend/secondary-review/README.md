# Independent review of the preserved merged-build evidence

Source: **`98b037b855b30d0494885e0e8c5b0c3bc78d228f`**, from the publishing task’s preserved `../probe.json`, `../checks.json`, `../pending.json` and screenshots. This is a secondary artifact review, not a fresh browser run, a full source exit, or evidence for `bf6c030` or a later candidate.

Reviewed raw measurements and four available screenshots: Add shift, Team availability, Manager More and the pending Swap. The 60 rendered samples all return 200 with no page errors. The 256 checker cells cover 390 and 1440 at 100/200% in both browsers: 128 pass and 128 fail the desktop text floor, with no non-text failures. All eight role/engine More tests pass. Four held submissions each issue one intercepted POST; mutations reaching the server: zero.

The five area reports distinguish measured passes, known defects and missing coverage. Existing Wave A height findings and Desktop typography findings remain assigned to those owners; this review does not count aliases as new source defects. The broad matrix and full state sweep are incomplete. These files do not certify a zero exit or replace the publishing task’s newer candidate gates. The later source exits and coordinator commits require their own verification.

Evidence gap: **8/16 Home/Inbox captures still contain loading text** (see `summary.json`). Wait for the actual private-read panel to settle in a fresh probe; permit its read-only action-center POST while blocking mutations. Those captures prove rendering and shell behaviour, not a ready-state pass. This is a harness-coverage gap, not a product finding.
