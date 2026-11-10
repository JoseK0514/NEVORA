# Remaining review wording decisions

Jose authorized these prepared exact changes with “get those left done asap”; Employee ID + PIN was separately selected explicitly. Implementation and verification are tracked in the server final-closeout plan. No production publication is authorized here.

| Item | Approved change | Preservation |
|---|---|---|
| NV186 | Add Spanish brand slogan `Un trabajo más brillante por delante` beside English `Brighter work ahead`. | English slogan and brand identity remain. |
| NV188 legal navigation copy | In existing recovery/deletion guidance, link label `Forgot access` becomes `Forgot password?`; destination `/forgot-access` remains. | No change to rights, deletion/recovery authorization, account-existence privacy or recovery behavior. |
| NV308 new Spanish statement template | New template V3 uses `Monto` and `Montos de la nómina aprobada.` instead of `Importe`/`Importes de la nómina aprobada.` | Existing V1/V2 approved statements retain their recorded template, exact bytes and fingerprints. All amounts, calculations, tax/legal meaning and payment disclaimer remain. Newly prepared statements alone select V3. |

The exact wording is implemented. Regression tests/review and development delivery remain required; this approval does not enable workers, production or native apps.

Jose separately chose Employee ID + PIN: the server now supports per-person limits and returns a scope-bearing remaining delay. Claude owns field/countdown integration. Existing workspace ceilings remain. A company worked-hours ceiling and person-to-person messaging remain separate unapproved product decisions.
