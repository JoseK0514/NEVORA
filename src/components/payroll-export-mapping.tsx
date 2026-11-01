'use client';

import type {Dispatch, SetStateAction} from 'react';
import {FloppyDiskIcon, PlusIcon, TrashIcon} from '@phosphor-icons/react/ssr';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {adpRunColumns, mappingSources, neutralProfile, type ExportProfile} from '@/lib/payroll-export/model';
import type {TimecardItem} from '@/lib/timecards/read-model';
import { fieldKeys } from './payroll/form-keys';
import styles from './payroll-export.module.css';

const sourceNames: Record<string, string> = {
  employeeId: 'NEVORA employee ID', employeeName: 'Employee name', providerEmployeeId: 'Mapped provider employee ID',
  periodStart: 'Period first day', periodEnd: 'Period last day', recordedHours: 'Recorded elapsed hours (includes breaks)',
  breakHours: 'Break hours (separate)', recordedNanoseconds: 'Exact recorded nanoseconds', breakNanoseconds: 'Exact break nanoseconds',
  revision: 'Finalized revision', sourceHash: 'Source fingerprint', constant: 'Fixed value',
};

type Props = {
  draft: ExportProfile; setDraft: Dispatch<SetStateAction<ExportProfile>>;
  cards: TimecardItem[]; reviewed: boolean; setReviewed: (value: boolean) => void;
  disabled: boolean; save: () => void;
};

export function PayrollExportMapping({draft, setDraft, cards, reviewed, setReviewed, disabled, save}: Props) {
  return <details className="c-exp__item c-exp__mapping" id="payroll-mapping">
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">Provider file setup</span><span className="c-row__detail"><span>Columns and IDs for your payroll system</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" /></summary>
    <fieldset disabled={disabled} className={styles.mappingBody} {...fieldKeys}>
      <div className={styles.mappingSection}>
        <h3>Product &amp; template</h3>
        <p className={styles.note}>Verify the exact product and current account template before saving. ADP RUN generic v1 uses published documentation. QuickBooks Time requires your in-account sample; a preset is not available yet.</p>
        <div className={styles.fieldGrid}>
          <label><span>Profile name</span><input autoComplete="off" value={draft.name} maxLength={120} onChange={e => setDraft({...draft, name: e.target.value})} /></label>
          <label><span>Payroll product / edition</span><input autoComplete="off" value={draft.product} maxLength={120} onChange={e => setDraft({...draft, product: e.target.value})} /></label>
          <label className={styles.wideField}><span>File layout</span><span className={styles.selectFrame}><select aria-label="File layout" value={draft.format} onChange={e => setDraft({...draft, format: e.target.value as ExportProfile['format'], ...(e.target.value === 'ADP_RUN_GENERIC_V1' ? {columns: adpRunColumns(), dateFormat: 'US', hourDecimals: 2} : {columns: neutralProfile().columns})})}>
            <option value="CUSTOM_CSV">Configurable CSV from a verified template</option><option value="ADP_RUN_GENERIC_V1">ADP RUN generic v1 · verify account template</option>
          </select></span></label>
          <label className={styles.wideField}><span>Verified import requirements / template reference</span><textarea aria-label="Verified import requirements / template reference" value={draft.verifiedRequirements} maxLength={600} onChange={e => setDraft({...draft, verifiedRequirements: e.target.value})} /></label>
        </div>
      </div>
      <div className={styles.mappingSection}>
        <h3>Dates &amp; hour precision</h3>
        <div className={styles.precisionGrid}>
          <label><span>Date format</span><span className={styles.selectFrame}><select aria-label="Date format" value={draft.dateFormat} onChange={e => setDraft({...draft, dateFormat: e.target.value as ExportProfile['dateFormat']})}><option value="ISO">YYYY-MM-DD</option><option value="US">MM/DD/YYYY</option></select></span></label>
          <label><span>Decimal places for hours</span><input type="number" inputMode="numeric" min={0} max={9} value={draft.hourDecimals} onChange={e => setDraft({...draft, hourDecimals: Number(e.target.value)})} /></label>
          <label><span>Hour precision</span><span className={styles.selectFrame}><select aria-label="Hour precision" value={draft.precision} onChange={e => setDraft({...draft, precision: e.target.value as ExportProfile['precision']})}><option value="REJECT_INEXACT">Reject any precision loss</option><option value="HALF_UP">Round half up at chosen precision</option></select></span></label>
        </div>
      </div>
      <div className={styles.mappingSection}>
        <h3>Import columns</h3><p className={styles.note}>Columns appear in this order in the CSV.</p>
        {draft.columns.map((column, i) => <div className={styles.column} key={i}>
          <span className={styles.columnNumber} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <label><span>Column {i + 1} heading</span><input autoComplete="off" value={column.header} maxLength={80} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {...c, header: e.target.value} : c)})} /></label>
          <label><span>Value source for column {i + 1}</span><span className={styles.selectFrame}><select aria-label={`Value source for column ${i + 1}`} value={column.source} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {header: c.header, source: e.target.value as typeof c.source, ...(e.target.value === 'constant' ? {constant: ''} : {})} : c)})}>{mappingSources.map(source => <option key={source} value={source}>{sourceNames[source]}</option>)}</select></span></label>
          {column.source === 'constant' && <label className={styles.constantField}><span>Fixed value for column {i + 1}</span><input autoComplete="off" value={column.constant ?? ''} maxLength={100} onChange={e => setDraft({...draft, columns: draft.columns.map((c, n) => n === i ? {...c, constant: e.target.value} : c)})} /></label>}
          <button type="button" className={`${styles.button} ${styles.iconButton} ${styles.removeColumn}`} aria-label={`Remove column ${i + 1}`} disabled={draft.format === 'ADP_RUN_GENERIC_V1' || draft.columns.length === 1} onClick={() => setDraft({...draft, columns: draft.columns.filter((_, n) => n !== i)})}><TrashIcon size={18} aria-hidden="true" /></button>
        </div>)}
        <button type="button" className={styles.button} disabled={draft.format === 'ADP_RUN_GENERIC_V1' || draft.columns.length >= 20} onClick={() => setDraft({...draft, columns: [...draft.columns, {header: `Column ${draft.columns.length + 1}`, source: 'constant', constant: ''}]})}><PlusIcon size={18} aria-hidden="true" />Add column</button>
      </div>
      <div className={styles.mappingSection}>
        <h3>Provider employee identifiers</h3><p className={styles.note}>Use the identifiers from your payroll system when your template requires them.</p>
        <div className={styles.fieldGrid}>{cards.map(c => <label key={c.card.employeeId}><span>{c.card.employeeName}</span><input autoComplete="off" value={draft.employeeMappings.find(m => m.employeeId === c.card.employeeId)?.providerEmployeeId ?? ''} maxLength={100} onChange={e => setDraft({...draft, employeeMappings: [...draft.employeeMappings.filter(m => m.employeeId !== c.card.employeeId), ...(e.target.value ? [{employeeId: c.card.employeeId, providerEmployeeId: e.target.value}] : [])]})} /></label>)}</div>
      </div>
      <div className={styles.mappingFooter}>
        <label className={styles.reviewCheck}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I verified the required fields and employee identifiers. I reviewed the recorded-time basis, including breaks, and any selected rounding against my import requirements.</span></label>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!reviewed} onClick={save}><FloppyDiskIcon size={18} aria-hidden="true" />Save mapping profile</button>
      </div>
    </fieldset>
  </details>;
}
