'use client';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';
import { copy } from './payroll-export-mapping-copy';

import type {Dispatch, SetStateAction} from 'react';
import {PlusIcon, TrashIcon} from '@phosphor-icons/react/ssr';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {adpRunColumns, mappingSources, neutralProfile, type ExportProfile} from '@/lib/payroll-export/model';
import type {TimecardItem} from '@/lib/timecards/read-model';
import { fieldKeys } from './payroll/form-keys';
import styles from './payroll-export.module.css';


type Props = {
  draft: ExportProfile; setDraft: Dispatch<SetStateAction<ExportProfile>>;
  cards: TimecardItem[]; reviewed: boolean; setReviewed: (value: boolean) => void;
  disabled: boolean; save: () => void;
};

export function PayrollExportMapping({draft, setDraft, cards, reviewed, setReviewed, disabled, save}: Props) {
  const lang = usePortalLang();
  const wording = copy[lang];
const sourceNames: Record<string, string> = {
  employeeId: wording.nevoraEmployeeID, employeeName: wording.employeeName, providerEmployeeId: wording.mappedProviderEmployeeID,
  periodStart: wording.periodFirstDay, periodEnd: wording.periodLastDay, recordedHours: wording.recordedElapsedHoursIncludesBreaks,
  breakHours: wording.breakHoursSeparate, recordedNanoseconds: wording.exactRecordedNanoseconds, breakNanoseconds: wording.exactBreakNanoseconds,
  revision: wording.finalizedRevision, sourceHash: wording.sourceFingerprint, constant: wording.fixedValue,
};

  return <details className="c-exp__item c-exp__mapping" id="payroll-mapping">
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">{wording.fileFormat}</span><span className="c-row__detail"><span>{wording.columnsYourPayrollProviderNeeds}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" /></summary>
    <fieldset disabled={disabled} className={styles.mappingBody} {...fieldKeys}>
      <div className={styles.mappingSection}>
        <h3>{wording.productTemplate}</h3>
        <p className={styles.note}>{wording.verifyTheExactProductAndCurrentAccountTemplateBeforeSaving}</p>
        <div className={styles.fieldGrid}>
          <label><span>{wording.profileName}</span><input autoComplete="off" value={draft.name} maxLength={120} onChange={e => setDraft({...draft, name: e.target.value})} /></label>
          <label><span>{wording.payrollProductEdition}</span><input autoComplete="off" value={draft.product} maxLength={120} onChange={e => setDraft({...draft, product: e.target.value})} /></label>
          <label className={styles.wideField}><span>{wording.fileLayout}</span><span className={styles.selectFrame}><select aria-label={wording.fileLayout} value={draft.format} onChange={e => setDraft({...draft, format: e.target.value as ExportProfile['format'], ...(e.target.value === 'ADP_RUN_GENERIC_V1' ? {columns: adpRunColumns(), dateFormat: 'US', hourDecimals: 2} : {columns: neutralProfile().columns})})}>
            <option value="CUSTOM_CSV">{wording.configurableCSVFromAVerifiedTemplate}</option><option value="ADP_RUN_GENERIC_V1">{wording.adpRUNGenericV1VerifyAccountTemplate}</option>
          </select></span></label>
          <label className={styles.wideField}><span>{wording.verifiedImportRequirementsTemplateReference}</span><textarea aria-label={wording.verifiedImportRequirementsTemplateReference} value={draft.verifiedRequirements} maxLength={600} onChange={e => setDraft({...draft, verifiedRequirements: e.target.value})} /></label>
        </div>
      </div>
      <div className={styles.mappingSection}>
        <h3>{wording.datesHourPrecision}</h3>
        <div className={styles.precisionGrid}>
          <label><span>{wording.dateFormat}</span><span className={styles.selectFrame}><select aria-label={wording.dateFormat} value={draft.dateFormat} onChange={e => setDraft({...draft, dateFormat: e.target.value as ExportProfile['dateFormat']})}><option value="ISO">{wording.yyyyMMDD}</option><option value="US">{wording.mmDDYYYY}</option></select></span></label>
          <label><span>{wording.decimalPlacesForHours}</span><input type="number" inputMode="numeric" min={0} max={9} value={draft.hourDecimals} onChange={e => setDraft({...draft, hourDecimals: Number(e.target.value)})} /></label>
          <label><span>{wording.hourPrecision}</span><span className={styles.selectFrame}><select aria-label={wording.hourPrecision} value={draft.precision} onChange={e => setDraft({...draft, precision: e.target.value as ExportProfile['precision']})}><option value="REJECT_INEXACT">{wording.rejectAnyPrecisionLoss}</option><option value="HALF_UP">{wording.roundHalfUpAtChosenPrecision}</option></select></span></label>
        </div>
      </div>
      <div className={styles.mappingSection}>
        <h3>{wording.importColumns}</h3><p className={styles.note}>{wording.columnsAppearInThisOrderInTheCSV}</p>
        {draft.columns.map((column, i) => <div className={styles.column} key={i}>
          <span className={styles.columnNumber} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <label><span>{formatPortalCopy(wording.columnNumberHeading, { number: i + 1 })}</span><input autoComplete="off" value={column.header} maxLength={80} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {...c, header: e.target.value} : c)})} /></label>
          <label><span>{formatPortalCopy(wording.valueSourceForColumnNumber, { number: i + 1 })}</span><span className={styles.selectFrame}><select aria-label={formatPortalCopy(wording.valueSourceForColumnNumber, { number: i + 1 })} value={column.source} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {header: c.header, source: e.target.value as typeof c.source, ...(e.target.value === 'constant' ? {constant: ''} : {})} : c)})}>{mappingSources.map(source => <option key={source} value={source}>{sourceNames[source]}</option>)}</select></span></label>
          {column.source === 'constant' && <label className={styles.constantField}><span>{formatPortalCopy(wording.fixedValueForColumnNumber, { number: i + 1 })}</span><input autoComplete="off" value={column.constant ?? ''} maxLength={100} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {...c, constant: e.target.value} : c)})} /></label>}
          <button type="button" className={`${styles.button} ${styles.iconButton} ${styles.removeColumn}`} aria-label={formatPortalCopy(wording.removeColumnNumber, { number: i + 1 })} disabled={draft.format === 'ADP_RUN_GENERIC_V1' || draft.columns.length === 1} onClick={() => setDraft({...draft, columns: draft.columns.filter((_, n) => n !== i)})}><TrashIcon size={18} weight="bold" aria-hidden="true" /></button>
        </div>)}
        <button type="button" className={styles.button} disabled={draft.format === 'ADP_RUN_GENERIC_V1' || draft.columns.length >= 20} onClick={() => setDraft({...draft, columns: [...draft.columns, {header: `Column ${draft.columns.length + 1}`, source: 'constant', constant: ''}]})}><PlusIcon size={18} weight="bold" aria-hidden="true" />{wording.addColumn}</button>
      </div>
      <div className={styles.mappingSection}>
        <h3>{wording.providerEmployeeIdentifiers}</h3><p className={styles.note}>{wording.useTheIdentifiersFromYourPayrollSystemWhenYourTemplate}</p>
        <div className={styles.fieldGrid}>{cards.map(c => <label key={c.card.employeeId}><span>{c.card.employeeName}</span><input autoComplete="off" value={draft.employeeMappings.find(m => m.employeeId === c.card.employeeId)?.providerEmployeeId ?? ''} maxLength={100} onChange={e => setDraft({...draft, employeeMappings: [...draft.employeeMappings.filter(m => m.employeeId !== c.card.employeeId), ...(e.target.value ? [{employeeId: c.card.employeeId, providerEmployeeId: e.target.value}] : [])]})} /></label>)}</div>
      </div>
      <div className={styles.mappingFooter}>
        <label className={styles.reviewCheck}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>{wording.iVerifiedTheRequiredFieldsAndEmployeeIdentifiersIReviewed}</span></label>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!reviewed} onClick={save}>{wording.saveMappingProfile}</button>
      </div>
    </fieldset>
  </details>;
}
