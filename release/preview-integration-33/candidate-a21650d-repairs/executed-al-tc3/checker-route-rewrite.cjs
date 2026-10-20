'use strict';
// Adds only browser-local state to the unchanged checker. All mutations are aborted.
const {createRequire}=require('node:module');
const {join}=require('node:path');
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const state=JSON.parse(process.env.WA_CASE_STATE||'null');
for(const name of ['chromium','webkit']){
 const launch=pw[name].launch.bind(pw[name]);
 pw[name].launch=async(...args)=>{
  const browser=await launch(...args),newContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
   const context=await newContext({...options,serviceWorkers:'block'});
   await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.fallback():r.abort());
   const newPage=context.newPage.bind(context);
   context.newPage=async(...args)=>{
    const page=await newPage(...args),goto=page.goto.bind(page);
    page.goto=async(...args)=>{
     if(process.env.WA_REAL_ROUTE){const requested=new URL(args[0]);args[0]=new URL(process.env.WA_REAL_ROUTE,requested.origin).href;}
     const response=await goto(...args);
     if(state==='scheduling'){await page.getByRole('tab',{name:'Scheduling',exact:true}).click({timeout:30000});await page.waitForFunction(()=>[...document.querySelectorAll('[role=tab]')].some(e=>e.textContent.trim()==='Scheduling'&&e.getAttribute('aria-selected')==='true'),null,{timeout:10000});}
     return response;
    };
    return page;
   };
   return context;
  };
  return browser;
 };
}
