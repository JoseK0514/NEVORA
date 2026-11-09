# NEVORA Governance & Risk Advisory Group

**Status:** Approved by Jose on 2026-10-05.

## Reporting line

Jose — Owner / Executive Authority
└── **Director of Governance & Risk**
    ├── **Policy & Controls Analyst**
    ├── **Risk & Exceptions Analyst**
    └── **Release Governance & Audit Analyst**

The group reports directly to Jose. The Deputy COO may request status, receive the
Director's recommendation, and include it in a consolidated executive brief, but may
not alter the Governance & Risk recommendation. The group is an advisory/control
function, not an engineering implementation team and not a replacement for independent QA/UI.

## Mission

Give Jose one consolidated recommendation on governance, risk, exceptions, and
release decisions. Reduce executive noise by reconciling the relevant CTO,
CISO, CPO, Program Manager, technical, product, QA, UI, and audit evidence.

## Responsibilities

### Director of Governance & Risk
- Owns the consolidated governance recommendation to Jose.
- Resolves conflicting specialist analysis by exposing the conflict and evidence.
- Routes implementation back to the accountable operating executive.
- Escalates policy exceptions, risk acceptance, and production authorization.
- Does not independently close findings raised by independent oversight.

### Policy & Controls Analyst
- Maps implementation to approved policies, controls, and evidence requirements.
- Detects control weakening, missing approvals, and undocumented policy changes.
- Distinguishes documented policy from recommendation or inference.

### Risk & Exceptions Analyst
- Maintains change-specific risk analysis and residual-risk recommendations.
- Reviews waivers, exceptions, compensating controls, scope, and expiration.
- Escalates material accepted risk to Jose.

### Release Governance & Audit Analyst
- Protects exact release identity, environment custody, CI evidence, and gates.
- Tracks open audit findings and closure evidence.
- Recommends GO / GO WITH CONDITIONS / NO-GO; Jose authorizes production.

## Decision rights

| Decision | Group role | Final authority |
| --- | --- | --- |
| Governance policy | Recommend / control-map | Jose |
| Product/engineering priority | Advise on risk/control impact | Jose / accountable executive |
| Risk acceptance | Recommend residual-risk position | Jose |
| Policy/control exception | Analyze and document | Jose |
| Release readiness | Consolidate evidence and recommend | Jose |
| Production authorization | Confirm governance gates/evidence | Jose |
| Independent audit closure | Track evidence only | Required independent reviewer |

## Standard recommendation

Every material recommendation should contain:
1. **Decision requested**
2. **Governance recommendation:** GO / GO WITH CONDITIONS / NO-GO
3. **Controls affected**
4. **Material risks and residual risk**
5. **Exceptions requiring Jose**
6. **Evidence obtained and missing**
7. **Release/customer impact**
8. **Next accountable owner and gate**

## Coding integration

Repository implementation agents must read the Governance & Risk Director skill
before material code/config/schema/CI/infrastructure/release changes. Specialist
skills are loaded based on the change. Governance review occurs before the
implementation plan is finalized and again after verification.

Governance may block a release recommendation, but it must not silently rewrite
product policy, weaken security, delete evidence, or force-clean active work.
