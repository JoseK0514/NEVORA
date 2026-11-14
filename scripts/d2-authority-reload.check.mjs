import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {verifyReloadFetchDiagnostic} from './browser-reload-diagnostic.mjs';

const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??new URL('../tools/ci-browser-runtime/package.json',import.meta.url));
assert.equal(runtime('playwright/package.json').version,'1.62.1');
const browser=await runtime('playwright').webkit.launch({headless:true});
try{
 for(const options of [{resource:'notifications'},{resource:'notifications',bothWitnesses:true},{resource:'authority',bothWitnesses:true}]){
  const report=await verifyReloadFetchDiagnostic(browser,options);
  console.log(JSON.stringify(report));
  assert.equal(report.verified,true,'Only a proven pre-navigation GET may be attributed; POST, ambiguous input, successor reads and window exceptions must fail');
 }
}finally{await browser.close();}
