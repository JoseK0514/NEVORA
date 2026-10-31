import assert from 'node:assert/strict';

export function breakLists(operation){return operation==='Archive'?['Configured break types','Archived break types']:['Archived break types','Configured break types'];}

export async function archiveBreak(owner,operation,rowRemovalTimeout=15000){
 assert(['Archive','Reactivate'].includes(operation));
 // Board O-Breaks: active breaks are listed under "Configured break types", archived ones in their own card.
 const [from,to]=breakLists(operation);const row=owner.getByRole('list',{name:from,exact:true}).locator('button[data-break-type="ui-rest"]');assert.match(await row.getAttribute('aria-label'),/^Edit /);await row.click();
 const d=owner.getByRole('dialog');await d.getByRole('heading',{name:'Edit break type',exact:true}).waitFor();await d.getByRole('button',{name:operation+' break type',exact:true}).click();
 await d.getByRole('heading',{name:operation+' this break type?',exact:true}).waitFor();await d.getByRole('button',{name:operation+' break type',exact:true}).click();await d.waitFor({state:'hidden'});
 // Native dialog.close() precedes React's queued list commit. Require the actual
 // changed row to leave its list; closing the dialog alone is not completion.
 await row.waitFor({state:'detached',timeout:rowRemovalTimeout});
 assert.equal(await row.count(),0,'The completed change removes the break from its prior list');
 await owner.getByRole('list',{name:to,exact:true}).locator('button[data-break-type="ui-rest"]').waitFor();
}
