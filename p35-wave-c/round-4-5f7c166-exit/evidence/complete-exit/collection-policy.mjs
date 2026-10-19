// Every baseline cell gets facts. Required judgment samples also get crops.
export function collectionPolicy(cell){
 const screenshots=[100,200].includes(cell.text)&&(cell.engine==='chromium'?['320','390','844x390','768','1024','1440'].includes(cell.size):['390','1440'].includes(cell.size));
 return{facts:true,screenshots,kind:screenshots?'five-area-judgment':'matrix-facts'};
}
