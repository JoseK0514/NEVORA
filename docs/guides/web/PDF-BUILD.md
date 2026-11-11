# Rebuilding the source-qualified web PDFs

The six distributions are selected by `docs/guides/web/sources.json`: Owner,
Manager/Lead, Employee, Rondo, Developer and Operations. The source Markdown
remains the editable master. This bundle describes development source; it does
not establish hosted availability, native acceptance or production deployment.

Finish and commit application changes, guide text, evidence files and linked
repository references before generation. Preserve other people's work. The
builder refuses changed or untracked application inputs and refuses any guide,
evidence or local-reference bytes that differ from its recorded commit.

From the repository root, using the existing pinned browser runtime:

```sh
node scripts/manuals/build-manuals.mjs --date 2026-11-11
node scripts/manuals/check-manuals.mjs
```

The build requires the already-declared dependencies in
`tools/ci-browser-runtime/package.json` and an installed Chromium for that
runtime. `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE` may select an existing absolute
runtime package path; its Playwright version must match the repository's pin.
The build command does not install packages, browsers or services. It uses the
repository's Inter and JetBrains Mono TTFs and official wordmark as inline data.
Network requests and page JavaScript are disabled.

Outputs are the six `<guide-id>.pdf` files and `manifest.json` under
`docs/guides/web/publication/`. Each A4 PDF has its preparation date, development
scope, full source/application markers and numbered pages. The small Markdown
dialect supports headings, paragraphs, emphasis, inline/fenced code, lists,
tables, quotations and safe links. Raw HTML and code are escaped. Local source
links must remain inside the repository and identify existing committed files;
external links are retained as references and are never fetched during build.
Check the distribution's links when moving PDFs away from the source checkout.

The schema-version-1 manifest records:

- `sourceSha`: the full build commit, which must remain an ancestor of HEAD.
- `applicationHash`: SHA-256 over the sorted path-and-Git-blob-ID inventory of
  tracked `src/`, `db/`, `services/`, `ops/`, `public/`, `scripts/`, `functions/`,
  package metadata and root web runtime/build settings (`next.config.*`,
  `next-env.d.ts`, `tsconfig.json`, `vercel.json`, `postcss.config.*`).
  Git blob IDs bind file contents; the inventory additionally binds file names,
  additions and removals. The verifier recomputes both source and current
  application identities.
- `sourceIndex`: the index's repository path and SHA-256 hash.
- `guides`: six unique IDs, titles, Markdown and evidence paths/hashes, plus
  final PDF paths, SHA-256 hashes and page counts.

The verifier uses only Node.js, Git and the existing `pdf-lib` dependency. It
does not load Playwright, Python, fonts or a browser. It loads every PDF,
checks its A4 pages, nonzero page count, title and subject binding, checks all
file hashes and requalifies the current source inputs. PDF subjects bind the
guide ID, full source SHA, application hash, Markdown hash and preparation date.
Traversal, symlink aliases and foreign source commits are rejected. A later
documentation-only commit can pass when the application, index, guides,
evidence and local-reference bytes remain unchanged.

Run the focused fixture regression with:

```sh
npm test -- src/test/manual-bundle.test.ts
```

These tests use owned temporary Git repositories and synthetic PDFs. They do
not generate the actual publication or contact services. After actual build,
inspect extracted text and rendered pages for readable fonts, source markers,
table/list continuation, clipping, page numbering and links before committing
the generated bundle. A passing structural/hash check does not replace that
visual review.

PDF repository references open the exact source commit on GitHub. The reader
needs access to the private repository; standalone PDF text is readable offline.
The builder fetches nothing while rendering these links.
