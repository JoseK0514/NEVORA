import assert from 'node:assert/strict';
import {test} from 'node:test';
import {measureRenderedContrast} from './browser-contrast.mjs';
const base={color:'rgb(255, 255, 255)',backgroundColor:'rgba(0, 0, 0, 0)',backgroundImage:'none',opacity:'1',mixBlendMode:'normal',filter:'none'};
const bounds={left:0,top:0,right:100,bottom:100,width:100,height:100,toJSON(){return {...this,toJSON:undefined};}};
function measure(background,foreground={}) {
 const parent={tagName:'SECTION',getBoundingClientRect:()=>bounds,parentElement:null,style:{...base,...background}},link={tagName:'A',getBoundingClientRect:()=>bounds,parentElement:parent,style:{...base,...foreground}};
 globalThis.getComputedStyle=(node,pseudo)=>pseudo?{content:'none'}:node.style;
 try{return measureRenderedContrast(link);}finally{delete globalThis.getComputedStyle;}
}
test('solid white on black has 21:1 contrast',()=>assert.equal(measure({backgroundColor:'rgb(0, 0, 0)'}).ratio,21));
test('uses the least contrast gradient endpoint, not page background',()=>{
 const result=measure({backgroundImage:'linear-gradient(145deg, rgb(0, 0, 0) 0%, rgb(119, 119, 119) 78%)'});
 assert(result.ratio<4.5);assert(result.ratio>4.47);assert.deepEqual(result.samples[1].background,[119,119,119,1]);
});
test('composites translucent hover white over the dark background',()=>{
 const result=measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgba(255, 255, 255, 0.12)'});
 assert.deepEqual(result.samples[0].background,[30.599999999999998,30.599999999999998,30.599999999999998,1]);assert(result.ratio>16);
});
test('unknown image remains a measurement limitation',()=>assert.throws(()=>measure({backgroundImage:'url("image.png")'}),/Unsupported background image/));
