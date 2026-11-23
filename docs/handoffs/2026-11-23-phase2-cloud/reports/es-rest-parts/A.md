# es-rest fork A: Insights (reports) and premium

## components/reports and /app/reports
- Files: `src/components/reports-copy.ts` (new, `REPORTS_COPY {en, es}`), `src/components/reports.tsx`, `src/app/app/reports/page.tsx`,
  `src/app/app/reports/christmas-bonus/page.tsx`, `src/app/app/reports/christmas-bonus/error.tsx`; tests `src/components/reports-copy.test.tsx`
  (new: key sets, Spanish render of the screen cards, the printed report, the waiting states and the whole page) and
  `src/app/app/reports/page.test.tsx` (expects the new `lang: 'en'` prop).
- About 150 strings moved: the screen cards (CorpReportsView), the printed report (ReportsView), QuietReportsView, the page
  (periods, Export menu, Custom period form, Yearly reports, Refresh), the closed and unavailable notices on both routes,
  and the Christmas bonus error boundary. Dates follow the language (`es-PR`: "lun", "16–18 nov", "mié, 14 oct"); the
  time zone reads "hora de Puerto Rico". English output is unchanged (existing tests pass).
- Wiring: the page reads `readPageLang()` and passes `lang` to `Reports` (its lifetime tests call `Reports()` as a plain
  function, so it takes the prop rather than the hook); `CorpReportsView`, `ReportsView` and `QuietReportsView` take `lang`
  or fall back to `usePortalLang()`. Page titles use `generateMetadata`. `reviewCopy(lang)` (review-details) supplies its
  existing Spanish lines.
- "Insights" in Spanish is **Informes** here; the shell session's nav label should match (or this should change to theirs).

### Gaps
- The report read's own sentences (definitions, clock-in observations, coverage and stability definitions, overtime
  reason) come from `src/lib/reports/*` in English and stay English.
- `loading.tsx` labels ("insights", "Christmas bonus hours") stay English: an async read there would delay the skeleton.
  The shell's `RouteSkeleton` could take the language from the provider instead (shell owner).
- `ChristmasBonusView` (`components/christmas-bonus-report`) and the `OperationalUnavailable` reason lines (company-access)
  belong to other areas; only the titles these routes pass are translated.
- `QuietReportsView` is exported but no route renders it; translated anyway since it shares the state words.

## components/premium
- Files: `src/components/premium-home.tsx`, `src/components/premium-home-copy.ts` (new), test `src/components/premium-home-copy.test.tsx`.
- Home's live summary line (four fallback sentences plus "… today.") follows the language; `reviewCopy(lang)` for its counts.
- Skipped: `premium/treatments.tsx`, `premium/clocker.tsx`, `premium/surfaces.tsx`, `premium/feedback.tsx`: no route imports
  `@/components/premium` (only its CSS), so their text never renders. The Quiet (non-corporate) branch of
  `PremiumHomeSurface` (QuietRightNow, QuietNeedsYou, QuietPending) is unreachable: every caller passes `corporate`.
- `components/auth-premium` is the signed-out sign-in shell (public, with its own language switch); not taken.

## For Jose to review (pay and payroll lines)
- "Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied." → "El tiempo registrado incluye los descansos. Los descansos se muestran aparte; no se aplican reglas de pago ni de descuentos."
- "Clock-ins compared with each person’s schedule and break targets. These notes don’t decide lateness, discipline or pay." → "Las entradas comparadas con el horario y las metas de descanso de cada persona. Estas notas no deciden tardanzas, medidas disciplinarias ni pago."
- "Late means after the scheduled start. It doesn’t change pay." → "Tarde quiere decir después de la hora de inicio programada. No cambia el pago."
- "These are not payroll hours." → "Estas no son horas de nómina."
- "Christmas bonus hours" → "Horas para el bono de Navidad"; "Who reached the Puerto Rico hours threshold" → "Quién llegó al mínimo de horas de Puerto Rico"
- "This report follows Puerto Rico’s Christmas bonus rules, and this workspace is set to another time zone." → "Este informe sigue las reglas del bono de Navidad de Puerto Rico, y esta empresa tiene otra zona horaria."
- "Christmas bonus hours apply to Puerto Rico workspaces" → "Las horas para el bono de Navidad aplican a empresas en Puerto Rico"
