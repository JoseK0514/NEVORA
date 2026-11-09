'use client';
import {showPopover} from './kit/popover-open';
import {useEffect,useState} from 'react';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import './manager-issue-focus.css';

/** Only focuses targets rendered by the page's completed authorized read. */
export function ManagerIssueFocus({prefix}:{prefix:string}){
 const [missing,setMissing]=useState(false);
 // Reveal runs before focus (effects and hashchange listeners keep this order),
 // so a target in a closed disclosure is open by the time it is focused.
 useEffect(()=>{
  const reveal=()=>{
   let id:string;try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
   if(!id.startsWith(prefix)){setMissing(false);return;}
   const row=document.getElementById(id);setMissing(!row);
   // A target inside a closed disclosure (e.g. unscheduled people) opens first, so it can take focus.
   for(let details=row?.closest('details');details;details=details.parentElement?.closest('details')??null)details.open=true;
   const popover=row?.closest<HTMLElement>('[popover]');
   showPopover(popover);
  };
  reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);
 },[prefix]);
 usePrivateFragmentFocus(prefix,true);
 return missing?<p className="manager-issue-notice" role="status">That issue is no longer available in this view. It may have changed since you opened it. Your Inbox has the current list.</p>:null;
}
