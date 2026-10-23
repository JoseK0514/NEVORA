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
test('solid black on white has 21:1 contrast',()=>assert.equal(measure({backgroundColor:'rgb(255, 255, 255)'},{color:'rgb(0, 0, 0)'}).ratio,21));
test('dark text uses the darkest light-gradient endpoint',()=>{
 const result=measure({backgroundImage:'linear-gradient(145deg, rgb(119, 119, 119) 0%, rgb(255, 255, 255) 100%)'},{color:'rgb(0, 0, 0)'});
 assert(result.ratio>=4.5);assert(result.ratio<4.7);
});
test('a foreground inside the gradient range remains unsupported',()=>{
 assert.throws(()=>measure({backgroundImage:'linear-gradient(145deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)'},{color:'rgb(119, 119, 119)'}),/Foreground crosses background bounds/);
});
test('uses the least contrast gradient endpoint, not page background',()=>{
 const result=measure({backgroundImage:'linear-gradient(145deg, rgb(0, 0, 0) 0%, rgb(119, 119, 119) 78%)'});
 assert(result.ratio<4.5);assert(result.ratio>4.47);assert.deepEqual(result.samples[1].background,[119,119,119,1]);
});
test('composites translucent hover white over the dark background',()=>{
 const result=measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgba(255, 255, 255, 0.12)'});
 assert.deepEqual(result.samples[0].background,[30.599999999999998,30.599999999999998,30.599999999999998,1]);assert(result.ratio>16);
});
test('unknown image remains a measurement limitation',()=>assert.throws(()=>measure({backgroundImage:'url("image.png")'}),/Unsupported background image/));
test('transparent image cannot hide the same-layer white background',()=>{
 assert.throws(()=>measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgb(255, 255, 255)',backgroundImage:'linear-gradient(145deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)'}),/Foreground crosses background bounds/);
});
test('partial-alpha image paints over its own color before the black ancestor',()=>{
 const result=measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgb(255, 255, 255)',backgroundImage:'linear-gradient(145deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)'});
 assert.deepEqual(result.samples[0].background,[127.5,127.5,127.5,1]);assert(result.ratio<4.5);assert(result.ratio>3.97);
});
test('varying alpha retains the transparent endpoint over its own color',()=>{
 assert.throws(()=>measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgb(255, 255, 255)',backgroundImage:'linear-gradient(145deg, rgba(0, 0, 0, 0) 0%, rgba(119, 119, 119, 0.5) 100%)'}),/Foreground crosses background bounds/);
});
test('default-direction signature wash composites over its own surface',()=>{
 const result=measure({backgroundColor:'rgb(0, 0, 0)'},{backgroundColor:'rgb(255, 255, 255)',backgroundImage:'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))'});
 assert.deepEqual(result.samples[0].background,[127.5,127.5,127.5,1]);
 assert(result.ratio<4.5);assert(result.ratio>3.97);
});
test('implicit stops and a middle stop retain the least contrast paint bound',()=>{
 const result=measure({backgroundImage:'linear-gradient(90deg, rgb(0, 0, 0), rgb(119, 119, 119) 50%, rgb(0, 0, 0))'});
 assert(result.ratio<4.5);assert(result.ratio>4.47);
});
test('stacked translucent image layers remain unsupported',()=>{
 assert.throws(()=>measure({backgroundColor:'rgb(0, 0, 0)',backgroundImage:'linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12)), linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12))'}),/Unsupported background image/);
});
