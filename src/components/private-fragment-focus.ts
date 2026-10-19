'use client';
import {useEffect,useRef} from 'react';

/** A contextual review link can target a row that arrives after the protected
 * read. Focus it once, only while that row is in a current ready snapshot. */
export function usePrivateFragmentFocus(prefix:string,ready:boolean){
 const focused=useRef('');
 useEffect(()=>{
  if(!ready)return;
  const focus=()=>{
   let id:string;try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
   if(!id.startsWith(prefix)||focused.current===id)return;
   const row=document.getElementById(id);if(!row)return;
   focused.current=id;row.focus({preventScroll:true});row.scrollIntoView({block:'center'});
  };
  // A frame later, so a target revealed by the same change (an opened disclosure) can take focus.
  let frame=requestAnimationFrame(focus);
  const changed=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(focus);};
  window.addEventListener('hashchange',changed);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',changed);};
 },[prefix,ready]);
}
