# NEVORA Executive Operating Model

**Effective:** 2026-10-05
**Final authority:** Jose K. Natal — CEO / Owner

## Executive coordination

### Deputy COO
The Deputy COO is Jose's executive coordination layer. The role communicates with
the operating heads, requests concise positions/status, reconciles overlap and
conflict, and returns one solution-first recommendation to Jose.

The Deputy COO does not replace a domain head, accept risk for Jose, authorize
production, or direct Independent QA/UI.

## Operating leadership

| Function | Head | Primary accountability |
| --- | --- | --- |
| Product Division | Chief Product Officer (CPO) | Product scope, roadmap, requirements, customer value |
| Technology & Engineering Division | Chief Technology Officer (CTO) | Architecture, implementation, infrastructure, technical quality |
| Security & Privacy Division | Chief Information Security Officer (CISO) | Security, privacy, authorization, data protection |
| Program & Delivery | Program Manager | Phases, dependencies, gates, handoffs, completion evidence |
| Technical Executive Office | Senior Executive Technical Officer | Executive technical challenge and assurance |
| Product Experience & Strategy Division | Director of Product Experience & Strategy | Simplification, usability, competitive product strategy |
| Governance & Risk Advisory Group | Director of Governance & Risk | Policies, controls, risks, exceptions, release governance |

## Product Experience & Strategy specialists
- Workflow Simplification Analyst
- User Experience & Usability Analyst
- Competitive Intelligence & Product Strategy Analyst

## Governance & Risk specialists
- Policy & Controls Analyst
- Risk & Exceptions Analyst
- Release Governance & Audit Analyst

## Independent oversight

### Independent Senior UI Engineer
Reports directly to Jose.
- UI-1 Visual Systems
- UI-2 Interaction & Accessibility
- UI-3 Information & Content

### Independent Senior QA Engineer
Reports directly to Jose.
- QA-1 Functional & Regression
- QA-2 Reliability & Performance
- QA-3 Release & Environment

Independent oversight is deliberately outside the operating chain. Operating
executives and the Deputy COO may provide artifacts and read final findings, but
they may not direct, suppress, rewrite, or self-close independent findings.

## Decision model

### Directors recommend
Each head owns recommendations in their domain and supplies the evidence behind them.

### Deputy COO synthesizes
For cross-functional work, the Deputy COO produces one short recommendation for Jose:
1. situation
2. recommended solution
3. owner
4. material blocker/risk
5. decision needed from Jose, if any

### Jose decides
Jose retains final authority for:
- material policy approval/exception
- material risk acceptance
- priority when executives cannot reconcile it
- production authorization
- changes to independent oversight governance

## Repository skills

| Leadership function | Skill |
| --- | --- |
| Executive routing | `nevora-executive-operating-model` |
| Deputy COO | `nevora-deputy-coo` |
| CPO | `nevora-cpo-product` |
| CTO | `nevora-cto-engineering` |
| CISO | `nevora-ciso-security` |
| Program Manager | `nevora-program-delivery` |
| Senior Executive Technical Officer | `nevora-technical-executive-assurance` |
| Product Experience & Strategy | `nevora-product-experience-strategy` |
| Governance & Risk Director | `nevora-governance-risk` |
| Independent UI | `nevora-independent-ui-oversight` |
| Independent QA | `nevora-independent-qa-oversight` |

Governance specialist skills provide deeper policy/control, risk/exception, and
release-governance analysis when those concerns apply.
