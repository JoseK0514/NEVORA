// The inspection brief requires Chromium judgment at320/390/landscape and WebKit spots.
// Full baseline coverage is unchanged; these cells get passive extra evidence.
export function collectionPolicy(cell){
 const primary=['AUDIT-E','AUDIT-LEAD'].includes(cell.account);
 const judgeSize=['320','390','844x390'].includes(cell.size);
 const variantRoutes=['/app','/app/profile','/app/my-time','/app/timecards','/app/my-pay'];
 if(cell.engine==='chromium'){
  if(primary&&judgeSize)return 'primary-role-judgment';
  if(!primary&&judgeSize&&variantRoutes.includes(cell.route))return 'fixture-state-judgment';
  if(primary&&['360','430'].includes(cell.size)&&cell.route==='/app/schedule')return 'prior-week-strip-width';
  if(primary&&['360','430'].includes(cell.size)&&cell.text===200&&cell.route.startsWith('/app/availability'))return 'prior-availability-width';
 }
 if(cell.engine==='webkit'){
  if(primary&&cell.size==='390'&&[100,200].includes(cell.text))return 'webkit-spot';
  if(primary&&cell.size==='390'&&cell.text===150&&cell.route==='/app')return 'prior-webkit-date-wrap';
  if(cell.account==='AUDIT-BREAK'&&cell.size==='390'&&cell.text===200&&['/app/my-time','/app/timecards'].includes(cell.route))return 'prior-webkit-duration';
 }
 return null;
}
