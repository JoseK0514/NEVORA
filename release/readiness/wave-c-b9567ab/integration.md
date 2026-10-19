# Wave C isolated review target

**Prepared, not accepted.** `codex/ready-wave-c` at `/workspace/ready-wave-c` is now `de8b15851d6280fd31fba3db63dcbe976a19584a` (tree `7d8f3716efa735008919356aea8f8c026e594d42`). The initial approved merge `77784e6` combined candidate `b9567ab` and Wave C `5f7c166`; a normal second merge adds candidate `9ec3adc` and only its six payroll-guidance CSS lines. Current parents are `77784e6` and `9ec3adc`. No `claude/*`, main or release-candidate ref was changed. No preview or browser was started for either merge.

Root reviewed and approved the following five conflict resolutions before the merge commit:

| File | Resolution |
|---|---|
| `src/app/app/layout.tsx` | Exact candidate file, including Inter WOFF2 preload. |
| `src/app/app/portal-premium.css` | Exact candidate/coordinator file, including winning textarea/search `--nv-field-border` specificity. |
| `src/app/app/premium-wave-c.css` | Complete incoming Wave C stylesheet, followed by the exact candidate WR-WC-25 flex/centering and ST-13 feedback rules. Their position at the end is deliberate. |
| `src/components/payroll/use-payroll.ts` | Exact candidate file, preserving ended-session handling and existing backend decisions. |
| `src/app/app/account-recovery/assisted-recovery.css` | Delete the obsolete legacy stylesheet. Incoming AssistedRecovery has replaced its DOM/classes and removed the import. Shared field-edge coverage on the replacement fields still needs measured verification. |

`src/app/layout.tsx` is byte-identical to the candidate: the async development inspection hook and text-scale script remain. `root-loading.tsx` adds only thirteen Wave C route entries; existing coordinator shapes remain. Two imported whitespace defects were normalized to pass `git diff --check` (a historical report's blank line and AssistedRecovery's final blank line).

[Preservation ledger](preservation.json) accounts for all 32 candidate finding commits. Twenty-nine retain their affected files byte-for-byte; two staged Wave C repairs are present as the exact override tail; TC-RC-ASSISTED-01's old stylesheet is retired with its old DOM, so equivalent contrast on the replacement remains a gate. The seven critical shared files in the ledger are byte-identical. Backend/API source is unchanged from the candidate.

Still required on **this exact review SHA**:

- TypeScript, relevant tests and release checks after the candidate canonical gate window permits them.
- Full 960-cell unchanged checker sweep with `--axe` on every cell, followed by the complete five-area/state review. The prior separate 240-cell axe appendix is subsumed; no duplicate visits.
- Real merged-UI proof of WR-WC-25, ST-13, and all new field idle/hover/focus contrast. Prior source injections are historical evidence and do not close these gates.
- Recheck all thirty earlier/current Wave C IDs, then report five complete area verdicts. `5f7c166` remains nonzero/incomplete; this merge commit has no zero verdict yet.

The actual release candidate must not receive this branch before the exact completed zero review and required gates.
