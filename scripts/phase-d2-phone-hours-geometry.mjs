import {join} from 'node:path';

// Approved Employee design (employee-mobile Oct 27; corporate Time Oct 30): below 768px an Employee's My time is the
// phone Time tab (src/components/employee-mobile/hours*.tsx). The desktop correction panel and entry sheet
// (.employee-correction-center, .employee-time-correction-form) are not rendered there. Their reflow, target-size and
// clipping checks therefore run at the widths where they ship, and the same correction function is measured on the
// phone Time page that replaces them at phone widths.
export const PHONE_WIDTHS=[320,375,390,430];
export const DESKTOP_WIDTHS=[768,1024,1440];
export const EMPLOYEE_DESKTOP_VIEWPORT={width:768,height:1024};

/** Measures one phone Time surface at every phone width in its own context, so the caller's pages keep their state. */
export async function phoneHoursGeometry({app,browser,context,login,geometry,engine,evidence,report,actor,label,path,selector,prepare}){
 const c=await context(browser,{width:390,height:844});
 await login(c,actor,{reuseSession:true});
 try{
  const page=await c.newPage();page.setDefaultTimeout(15000);
  await page.goto(app.url+path,{waitUntil:'networkidle'});
  await page.locator('.em-hours[data-hours-state="ready"]').waitFor();
  if(prepare)await prepare(page);
  await page.locator(selector).first().waitFor();
  for(const width of PHONE_WIDTHS){
   await page.setViewportSize({width,height:844});
   await geometry(page,selector,label+' on phone Time',engine,width);
   const shot=join(evidence,`${engine}-phone-${label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${width}.png`);
   await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
 }finally{await c.close();}
}

/** Holds a phone Time correction in its uncertain state: the server action never answers (nothing is committed). */
export async function phoneUncertainCorrection(page,reason){
 await page.route('**/app/my-time**',route=>route.request().method()==='POST'&&route.request().headers()['next-action']?route.abort('failed'):route.continue());
 const form=page.locator('.em-hours form.em-hours-form');
 await form.getByLabel('Reason').fill(reason);
 await form.getByRole('button',{name:'Send correction request',exact:true}).click();
 await page.locator('.em-hours section[aria-label="Submission status"]').getByRole('button',{name:'Check submission status',exact:true}).waitFor();
}
