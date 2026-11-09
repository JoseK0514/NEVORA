type RequestEvents<R> = {
 on(event:'request'|'requestfinished'|'requestfailed',listener:(request:R)=>void):unknown;
 off(event:'request'|'requestfinished'|'requestfailed',listener:(request:R)=>void):unknown;
};

/** Transport quiescence only. A failed terminal never proves business success. */
export function observeRequestTermination<R>(page:RequestEvents<R>,matches:(request:R)=>boolean,timeoutMs:number){
 let selected:R|undefined,settled=false;
 let resolve!:(value:'requestfinished'|'requestfailed')=>void,reject!:(error:Error)=>void;
 const result=new Promise<'requestfinished'|'requestfailed'>((yes,no)=>{resolve=yes;reject=no;});
 const start=(request:R)=>{if(selected===undefined&&matches(request))selected=request;};
 const finish=(event:'requestfinished'|'requestfailed')=>(request:R)=>{if(!settled&&selected!==undefined&&request===selected){settled=true;dispose();resolve(event);}};
 const finished=finish('requestfinished'),failed=finish('requestfailed');
 const timer=setTimeout(()=>{if(!settled){settled=true;dispose();reject(Error('Exact action request did not terminate before navigation'));}},timeoutMs);
 function dispose(){clearTimeout(timer);page.off('request',start);page.off('requestfinished',finished);page.off('requestfailed',failed);}
 page.on('request',start);page.on('requestfinished',finished);page.on('requestfailed',failed);
 // Keep a preceding click/receipt failure from creating a second unhandled rejection.
 // Consumers still await the original rejecting promise before navigating.
 void result.catch(()=>{});
 return {result,dispose};
}
