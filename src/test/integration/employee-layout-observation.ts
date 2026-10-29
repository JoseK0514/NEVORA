/** Bind the actual visual-end node atomically; a live nth locator can rebind. */
export function lastVisibleEmployeeAction(root:Element):HTMLElement|null{
 const controls=[...root.querySelectorAll<HTMLElement>('button,a,input,select,textarea,summary')].filter(el=>{
  const box=el.getBoundingClientRect(),style=getComputedStyle(el);
  return el.checkVisibility()&&box.width>0&&box.height>0&&style.visibility!=='hidden'&&style.visibility!=='collapse';
 });
 return controls.reduce<HTMLElement|null>((last,el)=>!last||el.getBoundingClientRect().bottom>last.getBoundingClientRect().bottom?el:last,null);
}
