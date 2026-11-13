type Page={
 getByRole(role:string,options:{name:string;exact:true}):{first():{click():Promise<unknown>};count():Promise<number>};
 getByText(text:string,options:{exact:true}):{count():Promise<number>};
};
export type AdvisorPrivatePresence={regions:number;fingerprints:number[]};
/** Ordinary native input. The caller retains its existing browser deadline. */
export async function clickAdvisorRefresh(page:Page){await page.getByRole('button',{name:'Refresh history',exact:true}).first().click();}
export async function readAdvisorPrivatePresence(page:Page,versions:readonly string[]):Promise<AdvisorPrivatePresence>{
 return {regions:await page.getByRole('region',{name:'Day plan comparison',exact:true}).count(),fingerprints:await Promise.all(versions.map(version=>page.getByText('Source fingerprint: '+version,{exact:true}).count()))};
}
export function assertAdvisorRetired(denied:boolean,presence:AdvisorPrivatePresence){
 if(!denied||presence.regions!==0||presence.fingerprints.length!==2||presence.fingerprints.some(count=>count!==0))throw Error('Revoked advisor private content was not verifiably retired');
}
