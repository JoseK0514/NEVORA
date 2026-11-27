# SCRUM-83 audited UI: wording and UI-standards audit (Nov 27, 2026)

**Source:** Jira 10034, `refs/review/SCRUM-83-audited-ui` at `174f016e39dedea31aeac356ac0293b70bc6e02b`. Built on Collab
76fbce9b, 42 Codex commits, 109 files. The bundle verified, and the package checksums matched.

**Merged into Collab** as `5114495d` (merge commit). The two conflicts were both the delegated-correction checkbox (C7).
Collab's QA-verified label hit area was kept.

**Checks on the merge:**
- tsc is clean.
- Lint reports 0 errors.
- Full suite: 16,584 pass.
  - The guide test fails, which is expected until the guides are rebuilt.
  - The managed-runtime CLI test fails intermittently. It fails on its own on Collab before the merge and passes on its
    own on the merge.
- The glossary guard, the Phosphor icon weight guard and the hex-colour guard all pass.

**Not merged:** the backend bundles in the same package. That covers BL-12/BL-20 `074019fe`, workforce retirement
`0710554b`, the payroll export switch `69d86017`, deletion intake, and the Stripe patch.

## Wording

Checked against `docs/design/voice.md`: the glossary, "one concept, one word", truthfulness, tú, and the rule that
payroll, tax, legal and privacy wording stays word for word.

### Must fix (glossary "Never" words)

| Where | Now | Rule | Suggested |
|---|---|---|---|
| `app/app/settings/activity/activity-copy.ts` `SCHEDULE_CALLOUT` | "Schedule changed after a callout" · "Cambio de horario por ausencia" | "callout" is a Never word; the concept is a can't-work request | "Schedule changed after a can't-work request" · "Cambio de horario por una solicitud de no puedo trabajar" |
| `timecards-copy.ts` `approvedCallout` | "Approved callout" · "Ausencia aprobada" | Same | "Approved can't-work request" · "Solicitud de no puedo trabajar aprobada" |
| `payroll-period-close-copy.ts` `markedAsSent` | "Operator reported submission" · "Envío informado por el equipo" | "submission" is a Never word. "Operator" is internal. EN and ES say different things. | Jose to choose (protected payroll wording) |

### Needs Jose's approval (payroll wording changed)

The rule is that payroll, tax, legal and privacy wording stays word for word. These existing strings were reworded:

- `markedAsSent` "Marked as sent" became "Operator reported submission".
- `markedAsImported` "Marked as imported" became "Operator reported import".
- `olderRecordMadeBeforeTheListChanged` "Older record, made before the list changed" became "Historical period record".
- `payroll_approved` "Payroll for this period is approved. Start a payroll correction for it first, then reopen." became
  "Payroll is approved. This timecard stays finalized while a payroll correction is in draft."
  - This is a change in meaning, not just wording: it no longer tells the reader what to do next.

New payroll strings to confirm:
- `PAYROLL_SELF_REVIEW` / `INDEPENDENT_PAYROLL_APPROVAL_REQUIRED`: clear and in tú.
- The "Worked through break" treatment and its help text.

### Consistency (one concept, one word)

- **Location status in Spanish.**
  - The new retirement copy says "En servicio" / "Fuera de servicio" / "sigue en servicio".
  - The rest of the app says "Activa" / "Inactiva" (`settings/locations/page-copy.ts`, `edit-location-form-copy.ts`), and
    the English says "Active" / "Inactive".
  - Use "Activa" / "Inactiva" (and "sigue activa").
- **Retirement result in Spanish.** `inactive` reads "{name} is inactive" in English but "Se desactivó {name}" in Spanish.
  Match the English: "{name} está inactiva".
- **"Offboarding follow-up"** is HR jargon, not product language. Suggest "Still to review" · "Pendientes por revisar".
  Spanish "Pendientes de la baja" reads as an HR term too.

### Good

- **Time-off decision message:** "{name} can check your decision in Time off. A notification may arrive later." It no
  longer promises delivery, which meets the Truthful rule. Spanish uses "Días libres", as the glossary says.
- **Activity log:**
  - "Owner access required" / "Se requiere acceso de dueño" and "Sign in" / "Iniciar sesión" follow the glossary.
  - Loading, failed, offline and empty states all have plain words.
- **Retirement blockers:** each names one action and its place ("Review open time in Timecards", "Revisar ponches
  abiertos en las tarjetas de tiempo"), in tú with "ponche".
- **Hard-coded English text:** none reaches people. The new timecard reason "Missing shift time" goes through the
  existing translation table ("Faltan horas del turno"). "Unverified mapping receipt" is an internal error and never
  shown.

## UI standards

Checked against DESIGN.MD and `nevora-design-os` (HIG floors, tokens, kit, focus, motion) on the 474 added CSS lines.

| Check | Result |
|---|---|
| Colours | Pass: no raw colours, all tokens (the hex guard passes) |
| Type | Pass: no fixed px font sizes; enlarged text uses the page's text scale |
| Focus | Pass: no `outline: none`; new focus work adds visible rings (export card outline, deletion password field ring kept apart from its error) |
| Targets | Pass: no new target under 44px; 12 rules size to `--b-btn-h`/44px; distinct payroll record and selection targets; weekly navigation targets separated |
| Motion | Pass: the one new transition sits under a reduced-motion rule ("Respect reduced motion for payroll actions and saved file links") |
| Hidden content | Pass: no `display:none` on text |
| Icons | Pass: Phosphor bold (guard passes) |
| Language parity | **Fix.** 6 new rules are Spanish-only (`:lang(es)`): the Schedule header actions, "Locations to plan" rows, and the time-off request footer at enlarged phone text. Our rule since Nov 26 is to fix a layout in every language unless it's about Spanish words. These need an English check at the same sizes (320/390 at 200%) and should be shared if English has the same problem. 12 other new rules already use the shared `:not(.nv-any-lang)` marker. |
| Specificity | Note: 6 new `:not(#…)` id-chain selectors. They work, but they make later changes harder. Not blocking. |
| Hit areas | Collab's version of C7 kept (see above). |

## Not yet verified

This audit reads the code and runs tests; it doesn't open the screens. A QA browser pass is needed on Collab 5114495d
for these:
- account deletion;
- location retirement;
- the Activity log;
- payroll export and review;
- timecard sheets;
- publish review;
- time-off request footer;
- in both languages at 320, 390, 768 and 1440, at 100% and 200%.
