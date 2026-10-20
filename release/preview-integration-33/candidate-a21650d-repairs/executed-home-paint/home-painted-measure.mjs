import assert from 'node:assert/strict';
export function bindPaintMeasure(link,page,details){
 const measureContrast=async state=>{
  const style=await link.evaluate(e=>{const css=getComputedStyle(e);let opacity=1;const backgrounds=[];for(let node=e;node;node=node.parentElement){const current=getComputedStyle(node);opacity*=Number(current.opacity);backgrounds.push({color:current.backgroundColor,image:current.backgroundImage,opacity:current.opacity});}return {color:css.color,opacity,paddingTop:parseFloat(css.paddingTop),paddingBottom:parseFloat(css.paddingBottom),backgrounds};});
  assert(style.paddingTop>=4&&style.paddingBottom>=4,'Contrast sampling uses the existing clear link padding');
  assert.equal(style.opacity,1,'Contrast states retain fully painted ancestor layers');
  const png=await link.screenshot({animations:'allow',scale:'css'});
  const painted=await page.evaluate(async({encoded,top,bottom})=>{const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const drawing=canvas.getContext('2d');drawing.drawImage(bitmap,0,0);const samples=[];for(const y of [Math.max(1,Math.floor(Math.min(top/2,4))),bitmap.height-1-Math.max(1,Math.floor(Math.min(bottom/2,4)))])for(let i=0;i<9;i++){const x=Math.round(2+(bitmap.width-5)*i/8);samples.push({x,y,rgba:Array.from(drawing.getImageData(x,y,1,1).data)});}const result={width:bitmap.width,height:bitmap.height,samples};bitmap.close();return result;},{encoded:png.toString('base64'),top:style.paddingTop,bottom:style.paddingBottom});
  const foreground=style.color.match(/[\d.]+/g).map(Number);assert(foreground.length>=3,'Computed link foreground is available');
  const luminance=channels=>channels.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0),alpha=(foreground[3]??1)*style.opacity;
  const ratios=painted.samples.map(({rgba})=>{assert.equal(rgba[3],255,'Painted screenshot background is opaque');const background=rgba.slice(0,3),ink=foreground.slice(0,3).map((value,index)=>value*alpha+background[index]*(1-alpha)),a=luminance(ink),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
  const minimum=Math.min(...ratios);(details.linkContrastPaint??={})[state]={...style,...painted,ratios,minimum};return minimum;
 };

return measureContrast;
}
