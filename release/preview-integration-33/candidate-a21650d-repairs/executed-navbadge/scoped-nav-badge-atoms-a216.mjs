// Optional, not released: same four badge cases, unchanged required assertions.
// Adds only passive group width/character facts on the same existing page.
import {registerScopedCases as registerBadgeCases} from './scoped-nav-badge-a216.mjs';
import {measureInboxGroupAtoms} from './measure-inbox-group-atoms.mjs';
export async function registerScopedCases(h){
  await registerBadgeCases({...h,register(name,ids,fn,options){
    h.register(name,ids,async context=>{
      await fn(context);
      context.row.inboxGroupAtomWatch={findingId:null,severity:null,assertionsAdded:0,measurements:await measureInboxGroupAtoms(context.page),cropReference:context.row.states?.['actual-nav-badge']?.crop,limit:'Passive follow-up on the unchanged actual page. Match timestamps/crop before attributing a visible isolated letter. Existing four badge criteria and case counts are unchanged; no Desktop cd coverage credit.'};
    },options);
  }});
}
