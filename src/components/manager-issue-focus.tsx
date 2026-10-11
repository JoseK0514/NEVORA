'use client';
import {useEffect,useState} from 'react';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import './manager-issue-focus.css';

/** Only focuses targets rendered by the page's completed authorized read. */
export function ManagerIssueFocus({prefix}:{prefix:string}){
 const [missing,setMissing]=useState(false);
 usePrivateFragmentFocus(prefix,true);
 useEffect(()=>{
  const reveal=()=>{
   let id:string;try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
   if(!id.startsWith(prefix)){setMissing(false);return;}
   const row=document.getElementById(id);setMissing(!row);
   const popover=row?.closest<HTMLElement>('[popover]');
   if(popover&&!popover.matches(':popover-open'))popover.showPopover();
  };
  reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);
 },[prefix]);
 return missing?<p className="manager-issue-notice" role="status">That issue is no longer available in this view. It may have changed since the Action Center was checked. Return to the Action Center for a current list.</p>:null;
}
