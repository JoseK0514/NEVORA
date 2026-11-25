// The name picker's motion (Jose, Nov 25, 2026): every animation has a reduced-motion branch that does nothing, only
// transform and opacity move, the tile settle stays under 0.4s, and nothing runs over 0.6s.
import {readFileSync} from 'node:fs';
import gsap from 'gsap';
import {afterEach,expect,it} from '@rstest/core';
import {CK_MOTION_PROPS,drawDone,fillDot,flipName,settleTiles,shakeDots,stopMotion,type Motion} from './clocker-motion';

const made:Motion[]=[];
afterEach(()=>{stopMotion(...made.splice(0));});
const target=()=>({x:0,y:0,scale:1,opacity:1,strokeDashoffset:0}) as unknown as Element;
const box={left:0,top:0,width:100,height:20},far={left:40,top:300,width:100,height:20};
const all=(reduced:boolean)=>{const els=[target(),target(),target()];return [
 ['settleTiles',settleTiles(els,reduced),els],['flipName',flipName(els[0],far,box,reduced),[els[0]]],['fillDot',fillDot(els[0],reduced),[els[0]]],
 ['shakeDots',shakeDots(els[0],reduced),[els[0]]],['drawDone',drawDone(els[0],els[1],els[2],reduced),els]] as const;};
const tweens=(m:Motion):gsap.core.Tween[]=>!m?[]:'getChildren' in m?m.getChildren(true,true,false) as gsap.core.Tween[]:[m as gsap.core.Tween];

it('does nothing under reduced motion: no tween, no change to the element',()=>{
 for(const [name,motion,els] of all(true)){
  expect(motion,name).toBeNull();
  for(const el of els){expect(gsap.getTweensOf(el),name).toHaveLength(0);expect(el,name).toEqual({x:0,y:0,scale:1,opacity:1,strokeDashoffset:0});}
 }
});
it('moves only transform and opacity, and keeps every motion short',()=>{
 for(const [name,motion] of all(false)){
  made.push(motion);expect(motion,name).not.toBeNull();
  for(const tw of tweens(motion)){
   const vars={...tw.vars,...(tw as unknown as {_startAt?:{vars:object}})._startAt?.vars};
   const keys=Object.keys(vars).filter(k=>!['duration','ease','overwrite','clearProps','stagger','delay','onComplete','immediateRender','lazy','runBackwards','parent','data','startAt','defaults','id','repeat','yoyo','paused','reversed','yoyoEase','repeatDelay','repeatRefresh','inherit','callbackScope','keyframes','onStart','onUpdate','onInterrupt','onReverseComplete','autoRevert','prevent'].includes(k));
   for(const key of keys)expect(CK_MOTION_PROPS as readonly string[],`${name}: ${key}`).toContain(key);
  }
  expect(motion!.totalDuration(),name).toBeLessThanOrEqual(0.6);
 }
});
it('settles the tiles in under 0.4s however long the list',()=>{
 const tiles=Array.from({length:30},target);const m=settleTiles(tiles,false);made.push(m);
 expect(m!.totalDuration()).toBeLessThanOrEqual(0.4);
});
it('skips a flip that would not move',()=>{expect(flipName(target(),box,box,false)).toBeNull();});
it('gives every motion function a reduced-motion branch, and the screens kill what they start',()=>{
 const src=readFileSync(new URL('./clocker-motion.ts',import.meta.url),'utf8');
 const fns=[...src.matchAll(/export function (\w+)\(([^)]*)\)[^{]*\{\n([^\n]*)/g)].filter(m=>m[2].includes('reduced'));
 expect(fns.map(m=>m[1]).sort()).toEqual(['drawDone','fillDot','flipName','settleTiles','shakeDots']);
 for(const m of fns)expect(m[3],m[1]).toMatch(/^\s*if \(reduced/);
 for(const file of ['./clocker-pin-gate.tsx','./clocker-name-picker.tsx','./clocker-punch-panel.tsx']){
  const s=readFileSync(new URL(file,import.meta.url),'utf8');
  const starts=(s.match(/(settleTiles|flipName|fillDot|shakeDots|drawDone)\(/g)??[]).length;
  expect(starts,file).toBeGreaterThan(0);
  expect((s.match(/prefersReducedMotion\(\)/g)??[]).length,file).toBe(starts);
  expect((s.match(/stopMotion\(motion\)/g)??[]).length,file).toBe(starts);
 }
});
it('keeps pseudo-elements out of :is() in the picker and kiosk styles',()=>{
 for(const file of ['./clocker-name-picker.css','./clocker.module.css']){
  const css=readFileSync(new URL(file,import.meta.url),'utf8');
  expect(css,file).not.toMatch(/:is\([^)]*::/);
 }
});
