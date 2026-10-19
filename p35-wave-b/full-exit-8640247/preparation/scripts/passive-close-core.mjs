// Called only once checks.mjs has pushed its result and invokes Page.close.
export function wrapClose(page,collect,failed=()=>{}){
 const close=page.close;let collected=false;
 page.close=async function(...args){try{if(!collected){collected=true;try{await collect(page);}catch(error){await failed(error);}}}catch{/* Collection must never replace checker behavior. */}finally{return close.apply(this,args);}};
 return page;
}
