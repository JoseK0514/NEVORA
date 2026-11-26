# Guide build on 0f61b708 (shared branch, Spanish integration)

`guides-0f61b708.bundle` holds one commit, `6f9b4e722745ca58ab731fd6b74486f498231a5c`, whose parent is `0f61b708`:
the six PDFs and `manifest.json` only, built with `node scripts/manuals/build-manuals.mjs --date 2026-11-26`.
It is shipped as a bundle because merging `0f61b708` into this branch conflicts in 233 files (Codex's Spanish and this
branch's Spanish), which is a separate decision.

    git fetch docs/handoffs/2026-11-23-phase2-cloud/guides/guides-0f61b708.bundle guides-es-0f61
    git log -1 --format='%H %P' FETCH_HEAD   # 6f9b4e72… 0f61b708…

Application hash `ed2498ce47d39affeac153e809634b69c978f327c0de3dfd201510dbf808a09d`; `check-manuals` verifies all six;
pages: owner 8, manager-lead 4, employee 3, rondo 5, developer 7, operations 7.
