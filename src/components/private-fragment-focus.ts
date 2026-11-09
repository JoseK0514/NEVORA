'use client';
import {useEffect,useRef} from 'react';

/** A contextual review link can target a row that arrives after the protected
 * read. Focus it once, only while that row is in a current ready snapshot. */
export function usePrivateFragmentFocus(prefix:string,ready:boolean){
 const focused=useRef('');
 useEffect(()=>{
  if(!ready)return;
  let frame=0,observed:HTMLElement|null=null,disposed=false;
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(focus);});
  const focus=()=>{
   if(disposed)return;
   let id:string;try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
   if(!id.startsWith(prefix)||focused.current===id)return;
   const row=document.getElementById(id);if(!row)return;
   // An independent protected read can still hide this ready row's section.
   // Observe its actual reveal; a failed native focus must not consume the intent.
   if(!row.getClientRects().length){
    if(observed!==row){observer.disconnect();observer.observe(row);observed=row;}
    return;
   }
   row.focus({preventScroll:true});
   if(document.activeElement!==row)return;
   focused.current=id;observer.disconnect();row.scrollIntoView({block:'center'});
  };
  // A frame later, so a target revealed by the same change (an opened disclosure) can take focus.
  frame=requestAnimationFrame(focus);
  const changed=()=>{observer.disconnect();observed=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(focus);};
  window.addEventListener('hashchange',changed);
  return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('hashchange',changed);};
 },[prefix,ready]);
}
