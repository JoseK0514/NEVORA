// Passive DOM reads only. Do not record field values, hidden fields or capability URLs.
export async function measure(page){return page.evaluate(()=>{
 const root=document.querySelector('.wa-page'),main=root??document.querySelector('main')??document.body;
 const visible=e=>{if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.width<=0||r.height<=0||s.visibility==='hidden'||s.display==='none'||e.closest('[hidden],[aria-hidden="true"],.sr-only,.nv-sr'))return false;const d=e.closest('details:not([open])');return !d||!!e.closest('summary');};
 const box=e=>e?.getBoundingClientRect().toJSON();
 const selector=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'.'+String(e.className?.baseVal??e.className).trim().split(/\s+/).slice(0,4).join('.'));
 const style=e=>{const s=getComputedStyle(e);return{font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,padding:s.padding,gap:s.gap,radius:s.borderRadius,border:s.border,boxShadow:s.boxShadow,display:s.display,grid:s.gridTemplateColumns,overflow:s.overflow,whiteSpace:s.whiteSpace,wordBreak:s.wordBreak,opacity:s.opacity,outline:s.outline,outlineOffset:s.outlineOffset,clamp:s.webkitLineClamp};};
 const node=e=>({selector:selector(e),text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,180),box:box(e),style:style(e)});
 const probe=s=>[...main.querySelectorAll(s)].filter(visible).map(node),splits=[],midword=[],clipped=[],texts=[];
 const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);
 for(let n=walker.nextNode();n;n=walker.nextNode()){
  const e=n.parentElement;if(!n.textContent.trim()||!visible(e))continue;
  const all=document.createRange();all.selectNodeContents(n);const rects=[...all.getClientRects()].map(r=>r.toJSON());texts.push({selector:selector(e),text:n.textContent.trim(),style:style(e),rects});
  for(const match of n.textContent.matchAll(/\b(?:\d{1,2}:\d{2}\s*[AP]M|\d+h(?:\s*\d+m)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\u00a0]+\d{1,2})\b/g)){
   const r=document.createRange();r.setStart(n,match.index);r.setEnd(n,match.index+match[0].length);const q=[...r.getClientRects()];if(new Set(q.map(z=>Math.round(z.y))).size>1)splits.push({text:match[0],selector:selector(e),rects:q.map(z=>z.toJSON())});
  }
  for(const match of n.textContent.matchAll(/[\p{L}\p{N}][\p{L}\p{N}’'-]{4,}/gu)){
   const r=document.createRange();r.setStart(n,match.index);r.setEnd(n,match.index+match[0].length);const q=[...r.getClientRects()];if(new Set(q.map(z=>Math.round(z.y))).size>1)midword.push({word:match[0],selector:selector(e),rects:q.map(z=>z.toJSON())});
  }
  for(const r of rects){let a=e;while(a&&a!==document.body){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['hidden','clip'].includes(s.overflowX)&&(r.right>q.right+1||r.left<q.left-1)){clipped.push({text:n.textContent.trim().slice(0,120),selector:selector(e),clip:selector(a),box:r,clipbox:q.toJSON()});break;}a=a.parentElement;}}
 }
 const fields=[...main.querySelectorAll('.wa-field')].filter(visible).map(e=>{const f=e.querySelector('input:not([type=hidden]),select,textarea'),l=e.querySelector('.wa-field__label'),h=e.querySelector('.wa-field__help');return{name:f?.name,field:f&&visible(f)?node(f):null,label:l&&visible(l)?node(l):null,help:h&&visible(h)?node(h):null,labelGap:l&&f?box(f).y-box(l).bottom:null,helpGap:h&&f?box(h).y-box(f).bottom:null};});
 const cards=[...main.querySelectorAll('.nv-card')].filter(visible).map(e=>({...node(e),children:[...e.children].filter(visible).slice(0,5).map(node)}));
 const tab=[...document.querySelectorAll('.mobile-nav')].find(visible),active=document.activeElement;
 return{rootFound:!!root,documentWidth:document.documentElement.scrollWidth,innerWidth,innerHeight,rootFontSize:getComputedStyle(document.documentElement).fontSize,documentHeight:document.documentElement.scrollHeight,scrollY,main:box(main),mainText:main.innerText,band:probe('[data-nv-band],.nv-band,.nv-masthead'),heads:probe('h1,h2,h3'),cards,fields,controls:probe('button,a[href],input:not([type=hidden]),select,textarea,summary'),headRows:probe('.nv-card__head'),rows:probe('.nv-row,.wa-option,.wa-entry,.wa-shift'),alerts:probe('[role=alert],[role=status],.form-error,.form-success'),focus:visible(active)?node(active):null,tabBar:box(tab),splits,midword,clipped,texts};
 });}
