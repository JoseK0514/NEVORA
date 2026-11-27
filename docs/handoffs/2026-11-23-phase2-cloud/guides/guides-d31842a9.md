# Guide build on d31842a9 (final; payroll exports switch notes)

`guides-d31842a9.bundle` holds two commits on ref `guides-d318`, tip `fdda95ddc98d757dda831afc75160c4d1c97cc90`:

1. `9a58b09c53c90058f25ae0f1956a5e8084b3d1da` (parent `d31842a9`): guide text only, approved by Jose. Owner: one sentence under **Time exports**
   on deployments with payroll exports turned off. Operations: `NEVORA_PAYROLL_EXPORTS_DISABLED`, what it turns off,
   what stays available, launch keeps it `true` per `.env.example`. `sources.json` adds
   `src/lib/payroll-export/launch-guard.server.ts` and `.env.example` as evidence for both guides.
2. `fdda95ddc98d757dda831afc75160c4d1c97cc90` (parent the text commit): the six PDFs and `manifest.json` (`--date 2026-11-27`).

No file under `src` changes after `d31842a9`.

    git fetch docs/handoffs/2026-11-23-phase2-cloud/guides/guides-d31842a9.bundle guides-d318

Application hash `03cadb121a6786e7ed61581b67ab0769614f313d19f3ad6e054e1c8fc1353ab7`; `check-manuals` verifies all six;
manual-publication and manual-bundle 57/57; pages: owner 8, manager-lead 4, employee 3, rondo 5, developer 7,
operations 7. Against `f6403f75`: text differs only by the two new passages and the markers; Owner page 4 and
Operations pages 5–7 reflow (checked rendered: no clipping, headings stay with their text); fonts unchanged; nothing
past the right margin.
