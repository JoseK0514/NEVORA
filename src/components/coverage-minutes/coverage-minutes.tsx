import type {CoverageMinutes,MinuteObligation} from '@/lib/scheduling/coverage-minutes';
import {minutesText} from '@/lib/time-off-staffing/present';
import './coverage-minutes.css';
import {reviewCopy} from '@/components/review-details/copy';
import {Explain} from '@/components/review-details/explain';
import {BSegs} from '@/components/owner-b/b-kit';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {coverageCopy} from '../coverage-copy';

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
const detail=(value:MinuteObligation|null,none:string,of=coverageCopy().figures.of)=>!value?'':value.required===0?none:of(minutesText(value.covered),minutesText(value.required));

export function CoverageFigures({coverage,label:ownLabel,variant='b'}:{coverage:CoverageMinutes|null|undefined;label?:string;variant?:'b'|'glass'}){
 const lang=usePortalLang(),t=reviewCopy(lang),w=coverageCopy(lang).figures,label=ownLabel??w.label;
 if(!coverage)return null;
 if(coverage.state==='not_configured')return <div className={`cov cov--${variant}`} role="group" aria-label={label}>
  <span className="cov__k">{label}</span><span className="cov__none">{t.noNeeds}</span><Explain text={t.staffingExplain} label={t.explain} compact/>
 </div>;
 const rows:[string,MinuteObligation,string][]=[[w.staffing,coverage.staffing,w.nothingRequired],[w.positions,coverage.positions,w.noPositions],[w.lead,coverage.lead,w.noLead]];
 // Review B2 (NV-108): an obligation nobody set up (nothing required) isn't a tile with a big dash; it folds into one grey
 // line under the tiles ("Positions and leads aren’t required").
 const shown=rows.filter(([,value],index)=>index===0||value.required!==0);
 const folded=rows.filter(([,value],index)=>index!==0&&value.required===0).map(([name])=>name===w.positions?'positions':'leads');
 return <div className={`cov cov--${variant}`} role="group" aria-label={label}>
  <span className="cov__k">{label}</span>
  <dl className="cov__list">{shown.map(([name,value,none])=><div key={name} data-full={value.percent!==null&&value.percent>=100||undefined} data-short={value.percent!==null&&value.percent<100||undefined}>
   <dt>{name}</dt><dd><b className="c-num">{percentText(value)}</b><span>{detail(value,none,w.of)}</span></dd>
  </div>)}</dl>
  {folded.length?<p className="cov__none-line">{folded.length===2?w.bothNotRequired:folded[0]==='positions'?w.positionsNotRequired:w.leadsNotRequired}</p>:null}
  {/* Closing F1 (NV-126): on a phone's band the tiles become one line ("Staffing 57% · 192 h of 336 h", then Positions and
    Lead only when required), so the day's shifts come up the screen; coverage-minutes.css swaps them under 768px. */}
  {/* Premium pass FA (final verification A #11): the line wraps between its facts, never under the explainer beside it. */}
  {variant==='glass'?<p className="cov__line c-num"><BSegs parts={shown.flatMap(([name,value],index)=>index===0?[`${name} ${percentText(value)}`,value.required?detail(value,'',w.of):null]:[`${name} ${percentText(value)}`])}/></p>:null}
  {/* Phase 4 (U09): what the figures measure, one line, opened from the control beside them. */}
  <Explain text={t.staffingExplain} label={t.explain} compact/>
 </div>;
}
