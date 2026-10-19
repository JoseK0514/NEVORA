const {createRequire}=require('node:module');
const {join}=require('node:path');
const {appendFileSync}=require('node:fs');
require('/workspace/ready-desktop/scripts/ui-checks/cloud-network-guard.cjs');
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
for(const name of ['chromium','webkit']){
 const old=pw[name].launch.bind(pw[name]);
 pw[name].launch=async(...args)=>{
  const browser=await old(...args),oldContext=browser.newContext.bind(browser);
  browser.newContext=async(...args)=>{
   const context=await oldContext(...args);
   await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!==process.env.NEVORA_CHECK_ORIGIN)return route.abort();
    if(['GET','HEAD','OPTIONS'].includes(req.method()))return route.fallback();
    let read=false;
    try{
     const body=req.postDataJSON(),keys=Object.keys(body).sort();
     read=req.method()==='POST'&&((url.pathname==='/api/manager/action-center'&&keys.join(',')==='weekStart'&&typeof body.weekStart==='string')||(['/api/timecards','/api/reports'].includes(url.pathname)&&keys.join(',')==='endDate,startDate'&&typeof body.startDate==='string'&&typeof body.endDate==='string'));
    }catch{}
    if(read)return route.fallback();
    if(process.env.NEVORA_CHECK_DIAGNOSTICS)appendFileSync(process.env.NEVORA_CHECK_DIAGNOSTICS,JSON.stringify({kind:'mutation-blocked',path:url.pathname,method:req.method(),forwarded:false})+'\n');
    return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   });return context;
  };return browser;
 };
}
