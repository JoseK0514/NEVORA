# Pinned migration lexical journal — bounded F10 first slice

This tool reads exact committed SQL blobs and partitions them without executing SQL.
It does not classify tenant ownership, interpret DDL/ALTER ancestry, parse function
bodies, enumerate all raw database consumers, migrate data, test RLS, or verify F10.
F10 remains **IN_PROGRESS**. Lexical success cannot satisfy F10.01/A002 or a tenant
foundation gate.

## Direct invocation

Use the existing installed tsx runtime. Specify the authorized checkout, exact
40-character commit and expected tree, plus a new absolute output outside that
checkout. The output parent must already exist.

    node --import tsx scripts/phase-f-source-inventory.mjs \
      --repo /absolute/authorized/checkout \
      --source <exact-commit> --tree <expected-tree> \
      --out /absolute/external-evidence/new-journal.json

No implicit HEAD, working SQL, tenant mapping, policy flags, or overwrites are
accepted. Run focused tests with the existing configuration:

    node_modules/.bin/vitest run src/lib/tenancy/inventory

The CLI has no database, service, application bootstrap, hosted connection, fetch,
new runner or orchestrator dependency. It reads local Git objects using cat-file
and ls-tree. A minimal child environment preserves only PATH and fixed metadata
guards: optional locks off, replacement refs off, lazy fetch off, global/system
configuration off and terminal prompts off. NODE_ENV=test is fixed only in this
Git child environment to satisfy the existing Next-augmented environment type;
the caller's environment is not mutated. Git transports are also denied.
Commit inspection uses plumbing, so signature helpers and pagers are unnecessary.
Local SQL is inert text; function/DO dollar bodies stay opaque.

## Output and limits

The source commit and expected tree, each migration Git blob ID, raw SHA-256 and
byte length bind output to the capture. schemaDigest is SHA-256 over the sorted
migration path/blob-ID/raw-hash/length tuple JSON; it is not a tenant classification
or a full application source digest. The external test evidence records the full
working source manifest separately. JSON contains no generation clock or host
custody path, so identical input produces identical bytes.

parts partition every source character exactly once in order. Statement parts
include preceding whitespace/comments; comment-only, empty-semicolon and trailing
trivia remain explicit. Offsets use JavaScript UTF-16 units and separate UTF-8 byte
positions. Lines are one-based; CR, LF and CRLF are supported, with CRLF counted
once. endOffset/endByte are exclusive; endLine is the last included character's
line. Per-part hashes are of the exact raw text. leadingKeyword is a lexical hint,
including quoted identifiers; it is not an AST node or ownership classification.

Supported lexical envelopes include doubled single quotes, E-string escapes,
newline literal continuations through whitespace/-- comments (block comments break
the continuation), doubled quoted identifiers, tagged/untagged dollar
bodies (including non-ASCII tags), identifier dollar characters, parameters, nested
block comments and line comments. An initial UTF-8 BOM is retained. UTF-8 must
decode without replacement. The envelope assumes standard_conforming_strings=on;
explicit SET/RESET of that setting, COPY FROM STDIN and psql meta commands block
completion. SQL syntax, runtime configuration changes through executable code,
dynamic SQL and body semantics require the later parser/semantic slice. A closed
EOF statement is retained without a terminator; that is not a SQL-validity claim.

Unterminated quotes/comments/dollar bodies and NUL yield explicit ERROR diagnostics.
Unsupported envelopes yield UNSUPPORTED diagnostics. Diagnostic and source spans
remain available even when the journal is blocked. Empty capture, duplicate/invalid
paths, inconsistent raw hashes/byte lengths or mismatched pins fail before output.
The source adapter accepts the current numbered migration namespace; an unfamiliar
new file fails closed and requires a reviewed adapter change.

Exit 0 means LEXICAL_JOURNAL_COMPLETE under this envelope. Exit 2 writes a new
LEXICAL_JOURNAL_BLOCKED artifact. Exit 1 indicates custody/argument/source/output
failure. Existing output is never truncated. Output parents resolve symlinks before
the source-checkout exclusion; an existing symlink output also fails exclusive
creation. This assumes an owner-controlled local output parent, not an attacker
racing filesystem changes.

Every artifact keeps semanticOwnership=NOT_IMPLEMENTED, rowMapping=NOT_RUN,
runtimeIsolation=NOT_RUN and F10=NOT_VERIFIED. All 68 tables, ALTER/view/function/
trigger lifetimes, raw consumers, ownership ancestry and immutable sidecar mappings
remain for the subsequent authorized semantic inventory work.
