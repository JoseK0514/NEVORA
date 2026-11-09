export async function fulfillHeldResponse(route,options,documentLeft) {
 if(documentLeft&&route.request().failure())return 'document-left';
 try{await route.fulfill(options);return 'fulfilled';}
 catch{
  if(route.request().failure())return documentLeft?'document-left':'request-aborted';
  throw Error('Held response fulfillment failed');
 }
}
