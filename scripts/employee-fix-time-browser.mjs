import {Temporal} from '@js-temporal/polyfill';

// Corporate Employee Time (Release 1, boards G-E-Time, E-TimecardDay and E-CorrectionSheet; src/components/employee-mobile/
// hours-corp.tsx). The same kit page serves every width: Time (/app/my-time), a day (?entry=), Your corrections
// (?view=corrections, Waiting / Decided) and "Fix my time" (?view=corrections&edit=…), whose header reads Cancel · Fix my
// time · Send. A correction is sent by the saveEmployeeHoursCorrection Server Action (a POST to /app/my-time).

/** The Time page in a given view, once its private read is ready. */
export const hoursPage=(page,view)=>page.locator(`.c-hours[data-hours-view="${view}"][data-hours-state="ready"]`);
/** The "Fix my time" form. */
export const fixForm=page=>page.locator('.c-hours form.c-form');
/** Send, in the sheet's header (it submits the form above). */
export const sendFix=page=>page.locator('.c-hours-sheet').getByRole('button',{name:/^(Send|Sending…)$/});
/** The one retry the sheet offers while an original submission is unconfirmed. */
export const checkSubmission=page=>page.getByRole('button',{name:'Check submission status',exact:true});
/** The sheet's receipt after a recorded correction. */
export const recordedReceipt=page=>page.getByRole('heading',{name:'Correction recorded',exact:true});
/** The frame's status when the current account no longer owns the page's read. */
export const accessChanged=page=>page.locator('.c-hours').getByRole('status').filter({hasText:'Your access changed. Sign in again to continue.'});
/** The frame's status while the page is paused (hidden, away or offline). */
export const hoursPaused=page=>page.locator('.c-hours').getByRole('status').filter({hasText:'Your time records are paused.'});

export const isCorrectionAction=request=>request.method()==='POST'&&!!request.headers()['next-action']&&new URL(request.url()).pathname==='/app/my-time';
/** The Server Action's one argument (the HoursCorrectionPayload: {basis,command}). */
export const correctionPayload=request=>{const body=JSON.parse(request.postData()??'null');return Array.isArray(body)?body[0]:body;};

/** "2026-10-28": the business date `days` before today in the fixture workspace (America/Puerto_Rico). The Day field
 * offers the last 31 days, so browser-driven missed shifts use recent dates. */
export const businessDay=(days,zone='America/Puerto_Rico')=>Temporal.Now.zonedDateTimeISO(zone).toPlainDate().subtract({days}).toString();

export const MISSED_SHIFT_PATH='/app/my-time?view=corrections&edit=new';
/** Opens "Fix a missed punch" (Missed a whole shift) and fills it. */
export async function fillMissedShift(page,origin,fields){
 await page.goto(origin+MISSED_SHIFT_PATH,{waitUntil:'domcontentloaded'});
 return fillMissedShiftForm(page,fields);
}
/** Fills an open "Missed a whole shift" sheet: Location, Day, Start and End (typed like "2am") and the required Note. */
export async function fillMissedShiftForm(page,{date,start,end,note,location='loc-1'}){
 const form=fixForm(page);await hoursPage(page,'corrections').locator('form.c-form').waitFor();
 await form.getByLabel('Location',{exact:true}).selectOption(location);
 await form.getByLabel('Day',{exact:true}).selectOption(date);
 await form.getByLabel('Start',{exact:true}).fill(start);
 await form.getByLabel('End',{exact:true}).fill(end);
 await form.getByLabel('Note (required)',{exact:true}).fill(note);
 return form;
}

/** "13:05" (or "2026-10-30T13:05") as the sheet's time fields show it: "1:05 PM". */
export const clockText=value=>{const [h,m]=value.slice(-5).split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
/** The sheet's current Day, Start, End and Note values. */
export const fixValues=page=>fixForm(page).evaluate(form=>Object.fromEntries(['startDate','startTime','endTime','reason','locationId'].map(name=>[name,form.querySelector(`[name="${name}"]`)?.value??null])));
/** The "What to fix" choice with this title (choosing one navigates to its sheet, so click it rather than check it) ("Break", "Missed a whole shift", "Mon, Oct 26"). */
export const whatToFix=(page,title)=>fixForm(page).getByRole('radiogroup',{name:'What to fix'}).locator('label.c-row').filter({has:page.locator('.c-row__title',{hasText:title})}).locator('input[type="radio"]');
