// Passive existing-page supplement; does not scroll, navigate, style, or change state.
export async function measureInboxGroupAtoms(page){
  return page.evaluate(()=>{
    const box=e=>e?.getBoundingClientRect().toJSON()??null;
    const shown=e=>e&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none';
    const font=e=>{const s=getComputedStyle(e);return {font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace,overflowWrap:s.overflowWrap,wordBreak:s.wordBreak,hyphens:s.hyphens,textWrap:s.textWrap,overflowX:s.overflowX,overflowY:s.overflowY,flex:s.flex,minWidth:s.minWidth};};
    const rows=[...document.querySelectorAll('.premium-group > details > summary')].filter(shown).map(summary=>{
      const title=summary.querySelector('.nv-row__title'),carrier=title?.closest('.nv-row__text'),leading=summary.querySelector(':scope > .nv-tile,:scope > .nv-avatar'),trail=summary.querySelector(':scope > .nv-row__trail');
      if(!title)return {summary:box(summary),proofGap:'No actual source title'};
      const nodes=[],walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
      for(let n=walker.nextNode();n;n=walker.nextNode())if(n.textContent.length)nodes.push(n);
      const text=title.textContent,match=/^\s*\d+\u00a0[\p{L}]+/u.exec(text),ranges=[];
      let offset=0;for(const node of nodes){ranges.push({node,start:offset,end:offset+node.textContent.length});offset+=node.textContent.length;}
      const rects=(start,end)=>{
        const from=ranges.find(r=>start>=r.start&&start<r.end),to=ranges.find(r=>end>r.start&&end<=r.end);
        if(!from||!to)return [];
        const range=document.createRange();range.setStart(from.node,start-from.start);range.setEnd(to.node,end-to.start);
        return [...range.getClientRects()].map(r=>r.toJSON());
      };
      const atom=match?.[0]??null,firstWord=atom?.slice(atom.indexOf('\u00a0')+1)??null,wordStart=atom?atom.indexOf('\u00a0')+1:null;
      const characters=[];if(firstWord){let index=wordStart;for(const char of firstWord){characters.push({char,start:index,end:index+char.length,rects:rects(index,index+char.length)});index+=char.length;}}
      const lines={};for(const character of characters)for(const r of character.rects){const key=String(Math.round(r.y*100)/100);(lines[key]??=[]).push(character.char);}
      return {text,summary:box(summary),title:{box:box(title),style:font(title)},carrier:carrier?{box:box(carrier),style:font(carrier)}:null,leading:leading?{box:box(leading),style:font(leading)}:null,trail:trail?{box:box(trail),style:font(trail)}:null,atom,atomRects:atom?rects(0,atom.length):[],firstWord,wordRects:firstWord?rects(wordStart,wordStart+firstWord.length):[],characters,wordLines:Object.entries(lines).map(([y,chars])=>({y:Number(y),characters:chars.join('')})),sourceUsesNbsp:!!atom,rangeNodeTextComplete:offset===text.length};
    });
    return {observedAt:new Date().toISOString(),url:location.pathname+location.search,viewport:{width:innerWidth,height:innerHeight},scrollY,rootFont:getComputedStyle(document.documentElement).fontSize,textStep:document.documentElement.dataset.textStep,rows,note:'Actual element and per-character text Range geometry only. Generated hyphens are not source characters; correlate Range lines with the actual crop before distinguishing intentional hyphenation from an unhyphenated isolated letter. No controls, scroll, source styles, DOM state or network behavior change.'};
  });
}
