# Author remediation record — November 15, 2026

The original fresh-context review remains BLOCK / REQUEST_CHANGES on the initial
commits. It is preserved unchanged as `initial-code-review.md`. This record maps
its findings to later fixes and author-run evidence; it is not a second reviewer
approval, independent certification, or activation approval.

| Finding | Final behavior and regression evidence |
| --- | --- |
| Native public policy underprices or permits tiny context | Exact direct model/base and reviewed rate floors/context enforced before admission. Three observed failing regressions became green; six owned PostgreSQL tests passed, including zero dispatch/reservation for bad native policies. |
| Legacy public smoke bypasses native controls | Both entrypoints reject native configuration before loading config/DB/model dependencies. RED→GREEN subprocess regressions retained. |
| Configured expiry exceeds verified grant | Both repos reject a later date than Nov18 00:00UTC, permit earlier stops; public checks before admission and again at dispatch. Expired config can load to preserve deletion/retention availability while inference denies. |
| Owner remaining-budget prompt becomes stale | Static signed prefix plus fresh server-owned tool/review allowances appended to tool results. Two observed failing counter cases became green. |
| Truncating sole comparison ledger loses paid history | Exclusive initial claim plus fsynced atomic snapshots. Injected partial write/ENOSPC tests retain the preceding unknown reservation. Original failed test outputs retained. |
| Public no-knowledge mislabeled as model result | Now local_policy, providerDispatches=0, model scores N/A. |
| Public helper broad cast | Replaced with typed Partial<ModelEngineOptions>. |

Minor limitation: existing prompt-phrase assertions remain and do not establish
semantic tone/quality. Wire, server validation, no-read denial, replay, authority,
real SQL budget and interruption tests provide behavioral evidence. Author-scored
fictional live answers are in a separate record, not this code-review decision.

Final runtime fixes: NEVORA `20cd7000958c5780e554382d58f3b015fa5f13b2`;
Velani `fa226f325f8cc7a5c7868366e9b22b3cc61c7c76`.

Open gates: NEVORA manual application hash; unchanged Home test's full-run timeout
(focused recheck passed; cause not established); 91 public legacy full-DB/pgvector
cases; precise hosted access/configuration and combined acceptance; workplace data
approval, finite ongoing dollar control, custody and final source qualification.
Live unauthorized-action results fail closed but have no usable answer; the first
harness did not retain their native stop/body, so exact upstream cause is unknown.
