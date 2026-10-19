'use strict';
const {createRequire}=require('node:module');
const {join}=require('node:path');
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
for(const name of ['chromium','webkit']){
 const launch=pw[name].launch.bind(pw[name]);
 pw[name].launch=async(...args)=>{
  const browser=await launch(...args),newContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
   const context=await newContext(options);
   await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.fallback():r.abort());
   return context;
  };
  return browser;
 };
}
