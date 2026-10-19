// Extra measurements run after each selected unchanged checker cell, never before it.
export function collectionPolicy(cell){
 const primary=['QAOWNER','AUDIT-M','AUDIT-E','AUDIT-LEAD'].includes(cell.account);
 const judge=['320','390','844x390','768','1024','1440'].includes(cell.size);
 if(primary&&judge&&cell.engine==='chromium')return 'desktop-primary-five-area-judgment';
 if(primary&&['390','768','1024','1440'].includes(cell.size)&&[100,200].includes(cell.text)&&cell.engine==='webkit')return 'desktop-webkit-spot';
 if(!primary&&['320','390','768','1024','1440'].includes(cell.size)&&[100,200].includes(cell.text)&&['/app','/app/profile','/app/my-time','/app/timecards','/app/my-pay'].includes(cell.route))return 'desktop-fictional-fixture-judgment';
 return null;
}
