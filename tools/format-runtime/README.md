# Formatting runtime

Prettier 3.10.1 (MIT) is pinned in this directory's lockfile, independently of the application runtime. Install with `npm ci --prefix tools/format-runtime`.

`npm run format:check` and `npm run format:write` cover the six handwritten transaction and scheduling modules listed in `scripts/format-critical.mjs`. Expand that list only with a reviewed formatting change. Generated files, database migrations, evidence and public assets are outside this scope.
