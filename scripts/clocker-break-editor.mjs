import assert from 'node:assert/strict';

export async function archiveBreak(owner,operation){
 assert(['Archive','Reactivate'].includes(operation));const filter=operation==='Archive'?'Active':'Archived';await owner.getByRole('button',{name:new RegExp('^'+filter+', \\d+$')}).click();
 const row=owner.locator('button[data-break-type="ui-rest"]');assert.match(await row.getAttribute('aria-label'),/^Edit /);await row.click();
 const d=owner.getByRole('dialog');await d.getByRole('heading',{name:'Edit break type',exact:true}).waitFor();await d.getByRole('button',{name:operation+' break type',exact:true}).click();
 await d.getByRole('heading',{name:operation+' this break type?',exact:true}).waitFor();await d.getByRole('button',{name:operation+' break type',exact:true}).click();await d.waitFor({state:'hidden'});
 assert.equal(await owner.locator('button[data-break-type="ui-rest"]').count(),0,'The completed change removes the break from its prior filter');
}
