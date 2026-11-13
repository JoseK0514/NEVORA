# SCRUM-156 app policy clarification

Prepared November 12, 2026 (Puerto Rico), from freshly fetched development
`f6baaaa6d988f34fb1c3388d0e1fe4c410bcbfd5`, in the isolated Linux checkout.

The two policy-text changes distinguish the workforce database's seven-day
restore-history window from purpose-limited recovery snapshots, provider logs
and mailbox copies. Account deletion no longer promises immediate erasure of
every provider-held copy. Existing statutory retention periods, deletion-request
timing, trial rules, accepted-policy version and authorization behavior remain
the existing contracts. No deletion operation or timer is added.

The English website mirror and complete Spanish website policy/support routes
are prepared in the Velani SCRUM-156 source packet. The app paragraphs and the
English website paragraphs are byte-identical. The Spanish wording carries the
same limits and uses the existing website glossary.

Validation: 22 legal model/render/context tests; TypeScript; scoped ESLint;
`git diff --check`. These checks qualify the text change locally, not the combined
release, hosted deletion, provider erasure or a restore rehearsal.

The existing SCRUM-190 finisher is active and retains NEVORA assembly,
development publication, CI and the finite hosted window. This local commit is
provided as a patch/bundle in the Velani handoff; it is not pushed to NEVORA
development and does not start a competing candidate or workflow. Apply it to
the finisher's combined source before freezing that release, then run its normal
affected gates. Preserve all independent findings and the original custody.

Governance: source preparation is conditionally compliant; business/legal review,
selected-source hosted EN/ES readback and publication remain open. Jose retains
those decisions and main/production authorization. No runtime/provider/data
mutation, message, payment, Tax operation or spending occurred here.
