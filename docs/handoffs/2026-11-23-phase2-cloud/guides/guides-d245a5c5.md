# Guide build on d245a5c5 (shared branch)

`guides-d245a5c5.bundle` holds one commit, `202a1d0e1eb207ec8ea8f0212870a87a852f8533`, whose parent is `d245a5c5`:
the six PDFs and `manifest.json` only, built with `node scripts/manuals/build-manuals.mjs --date 2026-11-26`.
Shipped as a bundle because this branch's superseded Spanish conflicts with the shared branch (242 files).

    git fetch docs/handoffs/2026-11-23-phase2-cloud/guides/guides-d245a5c5.bundle guides-d245
    git log -1 --format='%H %P' FETCH_HEAD   # 202a1d0e… d245a5c5…

Application hash `3485f570fdc210facf9fc8156764a9bd5040efaee82582acb310d4baafc5e6c9`; `check-manuals` verifies all six;
pages: owner 8, manager-lead 4, employee 3, rondo 5, developer 7, operations 7.
