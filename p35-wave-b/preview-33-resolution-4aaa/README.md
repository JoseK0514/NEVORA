# Exact33 Wave B conflict resolutions for Claude preview integration

Authoritative UI `4aaa79383f82a3c6023f9d2a2c2f492ba3152fce`; incoming fix checkpoint `b68f250129e2d21731624652e0aad7412b042bc3` (33 fixes). Read-only preparation: no source, merge index or refs were edited; no browser/CI run.

All four relevant files at exact4aaa are byte-identical to frozen9bd Wave B. This was verified with immutable git blobs, not inferred from branch names. Therefore the three previously reviewed resolutions in ready368e98a preserve every exact4aaa UI addition. MANIFEST.json records per-file blob equality and resolved hashes. Only these four files are reused; do not copy the entire ready branch or later completion proposals.

## Concrete root-owned resolution

In `/workspace/verify-preview-33`, replace the conflicted TSX files with the matching files under this directory's `resolved/`:

- `src/components/communication-compose.tsx`
- `src/components/communication-detail.tsx`
- `src/components/payroll/payroll-settings.tsx`

Keep `src/components/communication-compose.css` deleted. Claude4aaa deliberately removed it and no Compose import remains. Do not select incoming obsolete CSS. Preserve its applicable pending style intent by applying the3-line addition in `premium-wave-b.css.port.diff` (or use the exact resolved premium-wave-b.css, after confirming no other in-flight edits). This preserves opacity1, inset/muted/hairline pending contrast treatment and transform:none against Wave B's higher-specificity pending opacity/transform rules. No portal-premium.css change is proposed.

`resolution-from-4aaa.patch` is a clean unified diff against authoritative4aaa, for review or application after selecting its UI side. During the unresolved merge, copying the three exact resolved TSX files and then staging only those resolved paths is the direct equivalent. Root owns all source/index/ref mutations.

## Relevant33 behavior preservation

| Finding/commit | Concrete preservation on Claude UI |
|---|---|
| IS-74 `4b041f7`, IS-RC-COMPOSE-01 `b9567ab` | Keep source kit markup; original action guards/aria-disabled remain. Pending Publish reserves its native-disabled only for settled unknown/stale state, retaining focus during the pending activation. |
| ST-WB-15 `980e823` | Compose uses existing PendingLabel to reserve Publish update/new-version and Publishing labels. |
| IS-WB-34 `0443030` | Actual recovery region has ref/tabIndex; unknown publication reveals that region then its actual Check status. Preview heading effect runs only for a new preview, so a retained preview cannot steal recovery focus. |
| IS-79 `f16da25` | Compose and Detail handle signed-out actions explicitly; Detail excludes signed-out from ready content and renders Sign in. Existing polite review live region remains mounted before pending. |
| ST-RC-ACK-01 `e05d661` | Detail acknowledgment and Mark read use PendingLabel while retaining source confirmation/disclosure/status markup and original guards. |
| TC-B-16 `2e40573` | Detail reads retain session_ended reason;401 says Your session ended with actual Sign in,403 remains access changed. Requires incoming33 client HTTP metadata, which is already auto-merged; do not revert client.ts. |
| IS-B12 `21e603b` | Parent Detail retains retry initiator across disposable read child; focuses/reveals source's actual ready article after success unless user moved. Company save guarded while locked, submit stays outside disabled fieldset, and existing settled feedback reveal survives. Source SavingForm, labels, rule editor, cards, financial wording and fields remain intact. |
| TC-WA-16 `fe77095` |3-line scoped pending style preserves pending colors/opacity/transform without resurrecting removed legacy Compose CSS. |

Other33 fixes (including candidate32 Payroll desktop guidance and candidate33 Home CLS) remain the merge's independent automatically merged files; these four files do not replace or roll back them. All API action payloads, operation/retry identity, authority and financial/legal strings remain unchanged by these resolution ports.

## Deliberately excluded later scopes

No IS-B12 completion lookup/auth focus/read retry, IS-B31 Payroll pending-fields helper, IS-B33 Runs metadata/Backlog changes or IS-B29 expiry preference restoration is included. No wave-b-forms.tsx copied, so ready's separate IS-B31 Rules commit is not introduced by these resolutions. They remain separate unpublished proposals as root instructed.

Static resolution is not a browser result, full exit zero, hosted readiness or production approval. Exact merged-tree verification remains root/Claude's next gate.
