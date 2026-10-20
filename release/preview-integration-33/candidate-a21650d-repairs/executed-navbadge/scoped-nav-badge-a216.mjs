import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {measureNavBadges} from './measure-nav-badges.mjs';
const sha='a21650de50374683d52e32b883d7f419d7344f22';
export async function registerScopedCases(h){
  assert.equal(process.env.VERIFY_SHA,sha,'This bounded badge attribution is pinned to the separately released a216 coordinator preview');
  const dependencyHash=createHash('sha256').update(await readFile(new URL('./measure-nav-badges.mjs',import.meta.url))).digest('hex');
  assert.equal(dependencyHash,'ad33f05cf1d7000192d07402aec1eea1d3cc64117793945d7599d286c3004677','Passive badge measurement dependency changed');
  const {register,go,until,wait,check,evidence,hash,baseUrl}=h;
  register('scoped-desktop-nav-badge-geometry',['IS-P4-18'],async({page,row})=>{
    const responses=[],pending=[];
    const listener=response=>{
      const request=response.request(),url=new URL(request.url());
      if(url.origin!==new URL(baseUrl).origin||url.pathname!=='/api/manager/inbox-count'||request.method()!=='GET')return;
      pending.push((async()=>{
        try{const body=await response.json();responses.push({status:response.status(),state:body?.state,count:body?.count,bodyHash:hash(body)});}
        catch(error){responses.push({status:response.status(),readError:error.message});}
      })());
    };
    page.on('response',listener);
    try{
      await go(page,row,'/app/inbox?filter=planning');
      await until(()=>page.locator('.premium-inbox[data-inbox-state="ready"]').count(),'SETUP GAP: own ready planning Inbox did not arrive');
      const selector=row.width<761?'.mobile-nav .mobile-nav-count':'.sidebar .nav-count';
      await until(()=>page.locator(selector).isVisible(),'SETUP GAP: actual positive Inbox count did not render the target badge');
      await wait(150);await Promise.allSettled(pending);
      row.textScaleQualification=await page.evaluate(()=>({rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),step:document.documentElement.dataset.textStep,scale:Number(getComputedStyle(document.documentElement).getPropertyValue('--nv-text-scale'))}));
      if(Math.abs(row.textScaleQualification.rootFont-32)>.1||row.textScaleQualification.step!=='200'||Math.abs(row.textScaleQualification.scale-2)>.01)throw Error('SETUP GAP: actual requested root-font/step/scale200 did not qualify');
      row.badgeSourceReads=responses;
      if(!responses.some(response=>response.status===200&&response.state==='ready'&&Number.isInteger(response.count)&&response.count>0))throw Error('SETUP GAP: no real successful positive same-actor Inbox count response was captured');
      row.badgeGeometry=await measureNavBadges(page);
      row.passiveProbeSha256=dependencyHash;
      const targets=row.badgeGeometry.badges.filter(badge=>row.width<761?badge.selector.includes('mobile-nav-count'):badge.selector.includes('nav-count')&&!badge.selector.includes('mobile-nav-count'));
      if(targets.length!==1)throw Error('SETUP GAP: expected exactly one actual visible navigation count for this viewport');
      row.badgeAttribution=targets.map(badge=>{
        const ranges=badge.textRanges.flatMap(value=>value.rects.map(rect=>({text:value.text,box:rect})));
        const outsidePill=ranges.filter(value=>value.box.left<badge.box.left-1||value.box.right>badge.box.right+1||value.box.top<badge.box.top-1||value.box.bottom>badge.box.bottom+1);
        const neighborIcons=badge.neighbors.flatMap(neighbor=>neighbor.icons.map(icon=>({label:neighbor.label,href:neighbor.href,...icon}))).filter(icon=>icon.pillIntersection.area>1||icon.textRangeIntersections.some(value=>value.intersection.area>1));
        const clips=badge.clipAncestors.flatMap(ancestor=>ranges.filter(value=>(['hidden','clip','auto','scroll'].includes(ancestor.overflowX)&&(value.box.left<ancestor.box.left-1||value.box.right>ancestor.box.right+1))||(['hidden','clip','auto','scroll'].includes(ancestor.overflowY)&&(value.box.top<ancestor.box.top-1||value.box.bottom>ancestor.box.bottom+1))).map(value=>({ancestor,text:value.text,range:value.box})));
        return {text:badge.text,pill:badge.box,font:badge.style.fontSize,lineHeight:badge.style.lineHeight,outsidePill,neighborIcons,clips};
      });
      const count=responses.filter(response=>response.status===200&&response.state==='ready'&&Number.isInteger(response.count)&&response.count>0).at(-1).count;
      check(row,targets[0].text===String(count>99?'99+':count),'Actual displayed badge matches its own real count/cap without a fixture replacement',{responseCount:count,displayed:targets[0].text});
      for(const attribution of row.badgeAttribution){
        check(row,attribution.outsidePill.length===0,'IS-P4-18: navigation count text Range fits the rendered pill at200%',attribution);
        check(row,attribution.neighborIcons.length===0,'IS-P4-18: navigation count pill/text does not cross an adjacent navigation icon',attribution);
        check(row,attribution.clips.length===0,'IS-P4-18: navigation count text is not clipped by a scrolling/hidden ancestor',attribution);
      }
      row.geometryLimit='Text Range bounds are typographic rectangles, not painted pixel outlines. Attribute the actual visible overlap/clipping only with this same-state viewport crop; do not assign unrelated axe contrast nodes or count this shared shell regression twice.';
      await evidence(page,row,'actual-nav-badge');
    }finally{page.off('response',listener);await Promise.allSettled(pending);}
  },{accounts:['QAOWNER'],sizes:[[320,844,200],[1024,900,200]]});
}
