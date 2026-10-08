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
  const frame=requestAnimationFrame(focus);window.addEventListener('hashchange',focus);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',focus);};
 },[prefix,ready]);
}
