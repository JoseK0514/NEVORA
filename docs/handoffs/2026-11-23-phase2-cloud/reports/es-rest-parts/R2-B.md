# es-rest second release, part B: Insights' report sentences (src/lib/reports)

Base 836964e4 (staff tip). One table, `src/lib/reports/report-copy.ts` (`REPORT_COPY` `{en, es}` and `reportText(text, lang)`).

## What changed
- `src/lib/reports/project.ts` writes the same English as before, now from `REPORT_COPY.en`. This covers the six report
  definitions, the overtime reason, the coverage and stability definitions, and the fallbacks "Position not captured" and
  "Historical employee". A test checks the projection's output byte for byte.
- `src/components/reports.tsx` (es-rondo's version) shows those sentences in the person's language through
  `reportText(text, lang)`. Only three places call the lib: the definitions list in the printed view (`ReportsView`), the
  definitions list in the Quiet view (`QuietReportsView`), and the names in the hours tables and Scheduled and recorded.
  The view's own copy (`REPORTS_COPY`) is untouched.
- **The projection stays English:** a report is data shared with the CSV export, so translating at render keeps the data
  contract and the export the same.
- **CSV:** headers and the definition rows stay English. The export is a data file with fixed columns and the same
  content in every language.

## Files with nothing to translate
- `insights.ts`: `periodInsights` has English sentences, but nothing imports it. I left it alone.
- `christmas-bonus.ts`, `period.ts` and `scheduled-days.ts`: they hold only internal error messages and comments.
- `christmas-bonus.server.ts`: I didn't change it.
- The Christmas bonus pages and components get no text from lib/reports, so nothing needed wiring there.
- The board view (`CorpReportsView`) doesn't show the lib's sentences; it uses its own Rondo copy.

## Tests
- New `src/lib/reports/report-copy.test.ts`: the keys and definition count match, every Spanish value is written,
  `reportText` returns the Spanish for each sentence and leaves unknown text as it is, and the projection's English is unchanged.
- `src/components/reports-copy.test.tsx`: one added case. The printed and Quiet views show the definitions in Spanish, and
  English still renders in English.
- I ran src/lib/reports, src/components and src/app/app/reports. The full run had one failure, my new case, which
  pointed at the board view. I moved it to the printed and Quiet views, and the two re-run test files (82 tests) pass.
  tsc and oxlint are clean.

## For Jose to review (overtime, payroll, attendance and privacy wording)
| English | Spanish |
|---|---|
| Overtime needs your pay rules and employee classifications. Hours here aren’t payroll hours. | Las horas extra necesitan tus reglas de pago y la clasificación de cada empleado. Estas horas no son horas de nómina. |
| Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots. | El tiempo real usa las entradas y los descansos efectivos de D2; las tarjetas de tiempo finalizadas usan su copia fija. |
| Scheduled time is elapsed time in the latest published plan at observation, with released Unable to work requests excluded. It is not the immutable schedule originally captured on a punch. | El tiempo programado es el tiempo transcurrido en el horario publicado más reciente al momento de la consulta, sin las solicitudes de No puedo trabajar liberadas. No es el horario fijo que se registró con cada marcación. |
| Attendance observations use preserved raw punches and their exact captured publication references. They do not recalculate approved time or decide lateness/discipline. | Las notas de asistencia usan las marcaciones originales conservadas y la publicación exacta que se registró con cada una. No recalculan el tiempo aprobado ni deciden tardanzas o medidas disciplinarias. |
| Position labels come from captured punch context; absent labels remain unknown. Location and roster labels are current; finalized snapshot labels are retained. | Los puestos vienen del contexto registrado con cada marcación; si falta, se queda como desconocido. Las localidades y la lista del equipo son las actuales; las tarjetas finalizadas conservan sus nombres. |
| Time off and Unable to work rows reflect current request state; shift-change outcomes use append-only history. Private absence reasons are excluded. | Las filas de días libres y de No puedo trabajar muestran el estado actual de cada solicitud; los resultados de cambios de turno usan un historial que solo añade registros. No se incluyen los motivos privados de ausencia. |
| Unavailable policy and incomplete source evidence never become zero or healthy scores. | Una política no disponible o datos de origen incompletos nunca se muestran como cero ni como un resultado saludable. |
| Coverage requests in this period and how many were filled. A count, not a reliability score. | Solicitudes de cobertura en este período y cuántas se cubrieron. Es un conteo, no una medida de confiabilidad. |
| Schedule changes published for this period. No stability score is applied. | Cambios de horario publicados para este período. No se aplica ninguna medida de estabilidad. |
| Position not captured / Historical employee | Puesto no registrado / Empleado anterior |

## Gaps
- "D2" is an internal name inside the approved English definition. I kept it in the Spanish to stay faithful; Jose may
  want it dropped from both languages.
