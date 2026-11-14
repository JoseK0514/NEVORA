# SCRUM-84 original archive custody recovery

Read-only collection for Jose and the sole finisher in local thread
01a1d175-7de0-7a80-b607-5418fde6ed50. Current development identity supplied by the
finisher is 70866e964ee8fd8fa5ae65df952d06cd3fcef06d. This historical archive is
not relabelled as an archive from that development revision.

## Original archive and custody

Path: /workspace/nevora-scrum-84-85-89/.omo/evidence/scrum84-hosted-20261112/hosted-synthetic.dump
Regular file, not symlink; owner agent (UID1000), group agent (GID1000),0600,
961879 bytes, single hard link. SHA-256:
08c57ad9417bb094678953b4d17a7b7aeeddbfc9b0d1095046ee52878d8651eb

The actual existing bytes were read with O_RDONLY|O_NOFOLLOW|O_NOATIME.
The archive's device/inode, owner/group/mode, size, access/modification/change
nanosecond timestamps and hash remained unchanged. All33 originally fingerprinted
source/report/log files also retain their hashes and recorded metadata.
Custody is the existing Jose-authorized producer workspace and OS account;
no independent vault attestation or retention-duration guarantee is asserted.
The raw dump remains there privately and is EXCLUDED from this transfer packet.
No key, userHandle bytes, database credential, raw row or provider URL is included.

## Actual archive inspection

Tool: /workspace/environment-local/postgresql/17/bin/pg_restore
Version: pg_restore (PostgreSQL)17.6. Header reports custom format1.16-0, gzip,
database scrum84_fresh2, archive created2026-11-13 02:23:43 UTC
(November12,22:23:43 America/Puerto_Rico), source PostgreSQL17.12 (14c6cec),
pg_dump17.6. Inspection location: this existing /workspace execution environment.
Exact collection time is in preservation-verification.json.

Actual --list exit0, stderr empty. archive-toc.txt contains its COMPLETE127918
stdout bytes, SHA-256:
76dabf3f9b6fa3e231e22e174be52acd8d3636aabcf9a3d4b16f29684c9a365d
Header TOC count1280; selected printed entries1276. These are distinct observed
counts, not a claim that all header entries are printed by --list.

Selected kinds:99 FUNCTION,24 ACL,155 TABLE,14 VIEW,1 SEQUENCE,155 TABLE DATA,
1 SEQUENCE SET,224 CONSTRAINT,2 CHECK CONSTRAINT,95 INDEX,179 TRIGGER,
313 FK CONSTRAINT,7 ROW SECURITY,7 POLICY.
All155 tables and155 table-data entries are in public. The catalog named schema
has ZERO tables and ZERO table-data entries. This is a company database archive,
not proof of a separate catalog backup.

Offline --data-only --no-owner --no-privileges --file=- also exited0 with empty
stderr. Its SQL output was parsed only in memory, NEVER executed or persisted.
It contains155 COPY sections,58 total rows, no INSERT mode and no unfinished COPY.
Complete per-table row counts and the exact command/output fingerprint are in
offline-data-counts.json. Selected counts: workspaces1; employee_passkeys4;
auth_passkey_users1; auth_passkey_audit5; payroll_runs1; native_payroll_ledger1;
payroll_documents1. No row values are included.

## Original acquisition/source attribution

Original local runner/log/report provenance attributes scrum84_fresh2 to synthetic
source project morning-salad-93941233, branch br-odd-pond-bbjzv1wi. The retained
hosted reports name source60eb107c4e3a1f7e8615d670f9b4e78328fcc011, with earlier
phase965839e847c4e48b7947bfe44b1399a0625a4e99. These are historical local report
attributions; the archive header independently names only the database/version/time,
not a provider project, Git commit or snapshot LSN. No stronger binding is invented.
A separately retained snapshot report names snap-red-wave-bbsimczs and
LSN0/3A42000 at02:29:11Z, later than the archive start; it must NOT be relabelled
as the exact dump snapshot. final-copy-comparison.json reports subsequent
source/recovery facts for recovery project lucky-wind-29844564/database
scrum84_restored3. Those original files remain unchanged and fingerprinted.

## Historical command/result gap

historical-restore-command-and-results.txt preserves the full reconstructed
nonsecret argv/environment description and the complete available original logs.
historical-command-source-selected.json retains the relevant source lines.
The source invokes pg_restore --jobs=4 --exit-on-error --dbname scrum84_restored3
against this retained path, but the available logs report a terminated prior
attempt and an unavailable subsequent run. A complete successful child stdout,
stderr and exit-0 receipt is UNAVAILABLE in the inspected retained evidence.
Do not treat reconstructed source or later behavioral checks as that missing receipt.
The thread-history API also refused an oversized historical turn; no truncated
response is represented as complete original evidence.

## Signer availability

ORIGINAL PRIVATE SIGNER: UNAVAILABLE in the inspected existing evidence.
The helper generates a fresh EC key inside fictionalAuthenticator(); its private
key remains in an unexported closure. Enrollment puts device and user.id in the
in-memory fixture. No private-key serializer/export exists in that helper.
A bounded scan of154 existing task-evidence files found no PEM/private-JWK or
serialized signer/handle fixture and no heap/core capture. No matching original
runner/helper/restored-behavior Node process survives. Search bounds are recorded
in signer-search.json; this is not a claim about every file on every machine.

ORIGINAL STORED USER HANDLE: PRESENT privately in the archive's one nonempty
auth_passkey_users.user_handle row. Its bytes were not printed or copied out.
The archive has four employee_passkeys records containing public verification
material, not private signing keys. The handle/public keys cannot recreate the
missing signer. Same-old-key login/replay continuity remains UNPROVEN by these
historical records because runner-7/restored-behavior enroll before authenticating.
The finisher's separately labelled new owned-loopback regression is outside this
collection and must not relabel this historical archive.

## Private reviewer route and scope

Jose approved owner-retained access or this sanitized transfer. The original raw
archive remains owner-only at its existing path; the reviewer can inspect the
complete TOC and receipts reconstructed from this packet on the Mac. No public
URL, Git/Jira upload, raw dump, private signer, credential or source database
connection is part of the packet. The sole finisher forwards this packet to
independent Chat3; independent closure decisions remain with that reviewer.

No provider/restored database was invoked, no replacement dump/signer or enrollment
was created, no tests were run, no grants were renewed, and no admin work changed.
New files exist only in the separate read-only collection directory.
