import type {CoverageMinutes,MinuteObligation} from '@/lib/scheduling/coverage-minutes';
import {minutesText} from '@/lib/time-off-staffing/present';
import './coverage-minutes.css';

/* Coverage from canonical schedule health (Nov 9, 2026): required minutes covered, weighted by how many people,
 * positions and leads each period needs (calculateScheduleHealth's coverageMinutes). Staffing, positions and lead are
 * separate obligations and are never added together. No denominator reads "—"; coverage rules that aren't set up read
 * "Not set up", never 0% or 100%. Open shifts, offers and assignments keep their own counts elsewhere. */

export function percentText(value:MinuteObligation|null){
 if(!value||value.percent===null)return '—';
 if(value.percent>=100)return '100%';
 const rounded=Math.round(value.percent);
 return value.percent>0&&rounded===0?'<1%':`${Math.min(99,rounded)}%`;
}
const detail=(value:MinuteObligation|null,none:string)=>!value?'':value.required===0?none:`${minutesText(value.covered)} of ${minutesText(value.required)}`;

export function CoverageFigures({coverage,label='Coverage this week',variant='b'}:{coverage:CoverageMinutes|null|undefined;label?:string;variant?:'b'|'glass'}){
 if(!coverage)return null;
 if(coverage.state==='not_configured')return <div className={`cov cov--${variant}`} role="group" aria-label={label}>
  <span className="cov__k">{label}</span><span className="cov__none">Not set up</span>
 </div>;
 const rows:[string,MinuteObligation,string][]=[['Staffing',coverage.staffing,'Nothing required'],['Positions',coverage.positions,'No positions required'],['Lead',coverage.lead,'No lead required']];
 return <div className={`cov cov--${variant}`} role="group" aria-label={label}>
  <span className="cov__k">{label}</span>
  <dl className="cov__list">{rows.map(([name,value,none])=><div key={name} data-full={value.percent!==null&&value.percent>=100||undefined} data-short={value.percent!==null&&value.percent<100||undefined}>
   <dt>{name}</dt><dd><b className="c-num">{percentText(value)}</b><span>{detail(value,none)}</span></dd>
  </div>)}</dl>
 </div>;
}
