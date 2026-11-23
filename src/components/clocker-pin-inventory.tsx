'use client';
import './clocker-pin-inventory.css';
import Link from 'next/link';
import {useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import {CorpAvatar,CorpRow,CorpRows,CorpSegments} from './corp/corp';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {BState,initialsOf} from './owner-b/b-kit';
import {clockerOwnerCopy,type ClockerOwnerLang} from './clocker-owner-copy';

/* Clocker PINs (Phase 2, Nov 23, 2026): Settings in Direction B. The page frame is SettingsPageB; here the search, the
 * three tabs (No PIN first, then PIN set; Inactive only when someone is inactive) and one white card of rows, as Settings
 * and Team draw them: the person's face, their name, their position and location, and one action on the right (Set PIN
 * is the white secondary button, Reset PIN the quiet teal text). The tab already says which people the card holds, so the
 * card has no second heading. A PIN is never shown here or anywhere after it is set. Each action opens that person's
 * Clocker PIN page, which checks the Owner's authority again. */
type Filter='none'|'set'|'inactive';
const inFilter=(p:OwnerPinStatus,filter:Filter)=>filter==='inactive'?!p.active:p.active&&(filter==='none'?!p.configured:p.configured);
export function ClockerPinInventory({statuses,details={},lang='en'}:{statuses:OwnerPinStatus[];
 /** "Barista · Condado" by employee ID; a person without one shows no detail line. */ details?:Record<string,string>;lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang];
 const count=(filter:Filter)=>statuses.filter(p=>inFilter(p,filter)).length;
 const filters:Filter[]=count('inactive')?['none','set','inactive']:['none','set'];
 const labels:Record<Filter,string>={none:t.filterNone,set:t.filterSet,inactive:t.filterInactive};
 // People without a PIN come first: that tab opens unless everyone already has one.
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<Filter>(()=>count('none')||!count('set')?'none':'set');
 const wanted=query.trim().toLocaleLowerCase();
 // People in name order, as on Team.
 const visible=statuses.filter(p=>inFilter(p,filter)&&`${p.firstName} ${p.lastName} ${p.employeeId} ${details[p.employeeId]??''}`.toLocaleLowerCase().includes(wanted))
  .sort((a,b)=>`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
 const heading=filter==='none'?t.pinsNeed(count('none')):filter==='set'?t.pinsHave:t.pinsInactive;
 // The button's name starts with its visible words, then the person (WCAG 2.5.3); the visible words stay "Set PIN".
 const named=(words:string,name:string)=><>{words}<span className="c-sr">{`, ${name}`}</span></>;
 const row=(p:OwnerPinStatus)=>{const name=`${p.firstName} ${p.lastName}`,base=`/app/employees/${encodeURIComponent(p.employeeId)}`;
  const action=!p.active?<Link className="c-link c-link--l c-pins__act" href={base}>{named(t.viewProfile,name)}</Link>
   :p.configured?<Link className="c-link c-link--l c-pins__act" href={`${base}/clocker-pin?from=pins`}>{named(t.resetPin,name)}</Link>
   :<Link className="c-btn c-btn--secondary c-btn--md c-pins__act" href={`${base}/clocker-pin?from=pins`}>{named(t.setPin,name)}</Link>;
  return <li key={p.employeeId}><CorpRow avatar={<CorpAvatar name={name} initials={initialsOf(name)}/>} title={name} detail={details[p.employeeId]||undefined} trail={action}/></li>;};
 // One card: the search and the tabs at its top, then the rows, then its one note. The card is the page's first block, so
 // it lifts over the band as every Settings card does, and nothing straddles the band's edge.
 const note=<p className="c-setb-cardnote">{t.pinsNote}</p>;
 return <section className="c-card c-pins" id="clocker-pins" aria-label={t.pinsTitle}>
  <div className="c-pins__tools">
   <label className="c-in c-pins__search"><span className="c-sr">{t.pinsSearch}</span><MagnifyingGlass weight="bold" className="c-ic" aria-hidden="true"/>
    <input type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" value={query} placeholder={t.pinsSearch} onChange={e=>setQuery(e.target.value)}/></label>
   {/* Each tab is its label and its count ("No PIN 2"); its name is the same words. */}
   <CorpSegments label={t.pinsFilter} items={filters.map(key=>({key,current:filter===key,onSelect:()=>setFilter(key),label:<><span>{labels[key]}</span>&nbsp;<span className="c-pins__count">{count(key)}</span></>}))}/>
  </div>
  <p className="c-sr" role="status">{wanted?`${visible.length}`:''}</p>
  {visible.length?<CorpRows label={heading}>{visible.map(row)}</CorpRows>
   :wanted
     ?<BState kind="empty" icon={<MagnifyingGlass weight="bold"/>} title={t.pinsNoMatch} line={t.pinsNoMatchBody}><button type="button" className="c-btn c-btn--secondary c-btn--md" onClick={()=>setQuery('')}>{t.pinsClearSearch}</button></BState>
     :<BState kind="empty" icon={<UsersThreeIcon weight="bold"/>} title={filter==='none'?t.pinsEmptyNone:filter==='set'?t.pinsEmptySet:t.pinsEmptyInactive} line={filter==='none'?t.pinsEmptyNoneBody:filter==='set'?t.pinsEmptySetBody:undefined}>
       {filter==='set'&&count('none')?<button type="button" className="c-btn c-btn--secondary c-btn--md" onClick={()=>setFilter('none')}>{t.pinsNeed(count('none'))}</button>:null}</BState>}
  {note}
 </section>;
}

/** The page when the list of PINs could not be read: the kit's one failure card, one retry. */
export function ClockerPinsUnavailable({lang='en'}:{lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang];
 return <section className="c-card c-error-card" role="alert"><BState silent kind="failed" title={t.pinsLoadFailedTitle} line={t.pinsLoadFailedBody}>
  {/* eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript */}
  <span className="c-error-card__action"><a className="c-btn c-btn--md" href="/app/settings/clocker/pins">{t.tryAgain}</a></span></BState></section>;
}
