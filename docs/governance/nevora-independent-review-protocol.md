# NEVORA — Independent Phase Review and Final System Audit Protocol

**Decision:** Approved by Jose on 2026-10-07.
**Effective scope:** Phase D (after D8) and every subsequent normal development phase. The earlier Phase D-specific three-reviewer whole-phase requirement is replaced by one independent reviewer; the final integrated 3/3 audit remains mandatory.
**Authority:** Jose (CEO / Owner).
**Integration:** Adopt through a reviewed governance-only PR to development. This document does not authorize a product merge or a deployment.

## 1. One independent reviewer at the end of each phase — Phase D onward

The implementation team completes the phase and its embedded executive, QA, security, UI/UX, accessibility, and regression checks. Freeze the exact candidate commit and tree, then assign **one independent senior reviewer** to conduct a whole-phase review. The reviewer:
- Works in a separate, independent review context and does not author or remediate the code they certify.
- Checks phase acceptance criteria and regression risk across application behavior, authorized roles, security/privacy, data integrity, Clocker, usability/accessibility, responsive states, error/retry states, migrations, and relevant environment/CI evidence.
- Reports **GO or NO-GO**, exact commit/tree, tests and environments observed, defect IDs/severities, remediation conditions, and remaining release-only requirements directly to Jose.
- Must not treat embedded author tests, a preview deployment, or executive perspectives as an independent verdict. Lack of evidence on a mandatory phase requirement is NO-GO.
- Requires the implementing team to fix any blocking defect; the same independent reviewer (or another qualified reviewer who did not implement the fix) must independently verify closure at the new SHA before a phase GO.
- Does not authorize merging or starting the next phase by themselves; transition still follows the approved program integration process and Jose's decisions.

**Review assignment:** The appointed phase reviewer may be drawn from NEVORA's standing independent QA/UI or other qualified independent audit capacity. It is **one mandatory phase signoff**, not one reviewer per discipline. The standing independent QA and UI offices continue reporting directly to Jose, retain audit rights, and may be consulted, but are not automatically additional routine per-phase signoffs.

## 2. Risk-based escalation and non-waivable controls

Where the phase contains critical authentication/authorization, sensitive employee information, financial/payroll export data, raw timekeeping history, irreversible schema change, concurrency, or a P1 blocker, the reviewer and CISO/Governance & Risk must assess whether an additional independent specialist is needed. Escalate material risks or gaps in reviewer competence to Jose. No reviewer may silently certify an untested discipline.

An additional specialist review may be ordered by Jose or required by a pre-existing control. **This reduction in routine phase-review count does not waive** standing independent security/privacy audit departments, their existing unanimous approvals where required, the independent QA/UI reporting line, open audit findings, FR-AUTH-001, hosted Preview/Neon verification, migration/rollback checks, accessibility obligations, or other release gates. The stricter previously approved control applies in case of conflict until Jose explicitly revises that specific control.

## 3. Phase D transition — one independent reviewer after D8

Phase D's D3–D8 implementation and embedded tests continue unchanged under the controlling Phase D execution authorization. **After D8 completes**, freeze the exact whole-Phase-D candidate and require **one qualified independent senior reviewer** to issue evidence-backed GO or NO-GO before controlled Phase D integration. This 2026-10-07 decision **explicitly supersedes only the prior Phase D-specific three-reviewer whole-phase signoff count**. The reviewer must cover the entire Phase D, including D1–D8, inherited Clocker regressions, data/time corrections, password recovery and payroll-ready exports. Escalate critical or unreviewable risks under section 2.

This is **not** an independent GO, permission to skip D8, waive a separately mandatory specialist review or release control, merge the existing draft PRs, deploy, or authorize production. Phase D will be reviewed again alongside all other integrated phases by the three-reviewer final panel under section 4.

## 4. Final consolidated all-phase audit — three independent reviewers

After integration of every development phase included in the intended initial system/release candidate, and before pilot/production release authorization, freeze an exact system-wide SHA/tree and initiate **three separate independent reviewer contexts**:

1. **Senior QA & Reliability** — end-to-end business workflows, role permissions, regression coverage, Clocker/timekeeping, failure and recovery, scale and performance, CI/reproducibility.
2. **Senior UI/UX & Accessibility** — Manager, Owner, Lead, Employee and shared Clocker journeys; responsive/mobile, keyboard, screen-reader/physical-device evidence or clearly documented remaining holds; error/empty/offline/focus/privacy states, content clarity, consistency.
3. **Security, Architecture & Data Integrity** — authorization and workspace isolation, secrets/privacy, schema/data provenance and immutability, migrations and rollback, time/payroll export boundaries, concurrency, audit trail, integration and hosted transport.

Each reviewer independently reports GO / NO-GO, candidate SHA, supporting evidence and findings to Jose. **Final audit passes only with unanimous 3/3 independent GO.** One NO-GO, abstention, insufficient evidence, or unresolved blocking finding prevents the consolidated audit from passing. Three executive opinions in the implementation session are not independent reviewers.

The panel must test the **integrated** system across all included phases, not just each phase in isolation. Relevant specialized audit departments retain their own previously approved independent gate, including any department-specific 3/3 requirement.

## 5. Controlled pilot, release, and changes after approval

A passing consolidated audit permits a **recommendation** for the next controlled milestone; it is **not production authorization**. Required hosted and isolated-database checks, FR-AUTH-001, branch/PR custody, rollback and backup evidence, physical-device/accessibility evidence, specialist audit gates, residual-risk decisions, and Jose's explicit production GO remain separate.

If the code, schema, or deployment candidate changes after approval, record the new SHA and rerun every affected gate. A pilot finding that requires implementation changes must be independently reverified; material changes may require repeating the three-reviewer final audit. Production stays NO-GO until its own release-control checklist is independently satisfied.

## 6. Minimum review handoff record

Each phase and final audit record must contain:
- Phase/scope, implementation owner, separate reviewer(s) and independent-context evidence.
- Exact repository, source branch, immutable commit SHA and tree, intended integration target.
- Acceptance criteria mapped to tests; CI, PostgreSQL/migration, Chromium/WebKit and security/UX evidence as applicable.
- Findings with severity, owner, remediation SHA, independent retest, unresolved risks and explicit GO / NO-GO.
- Explicit distinction: **implemented**, **embedded-tested**, **independently accepted**, **integrated**, and **release-approved**.
- Jose's transition or production authorization where required.

## 7. Change control

This is an approved **governance** adjustment, beginning with Phase D after D8. It must not rewrite historical findings, present incomplete audits as complete, modify runtime behavior, bypass D8 verification, or waive any Phase D security, specialist audit or production hold. Any further change to the number of required reviewers or a standing specialized audit gate requires Jose's explicit authorization.
