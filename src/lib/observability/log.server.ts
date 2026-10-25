import {randomUUID} from 'node:crypto';

/** Inspection B10: one structured line per server failure, so a lock timeout (55P03), a missing migration (42P01)
 * and a bug stop looking the same in hosted logs, and support can match a user's reference to a cause.
 * It logs classification only: never a message, SQL text, bound value, cookie, name or other private field. */
export type BoundaryErrorLog={level:'error';event:string;route:string;errorId:string;code:string|null;sentinel:string|null;name:string;status?:number};

const SENTINEL=/invalid input syntax for type integer: "([a-z][a-z0-9_]{0,63})"/;
/** The SQLSTATE (or an app error code such as PAYROLL_DISABLED) without any message text. */
export function errorCode(error:unknown):string|null{
 if(!error||typeof error!=='object'||!('code' in error))return null;
 const code=String((error as {code?:unknown}).code??'');
 return /^[A-Z0-9_]{2,64}$/.test(code)?code:null;
}
/** The guard sentinel PostgreSQL reports for a refused check (for example operational_authorization). */
export function errorSentinel(error:unknown):string|null{
 const message=error instanceof Error?error.message:typeof error==='string'?error:'';
 return SENTINEL.exec(message)?.[1]??null;
}
export function errorName(error:unknown):string{
 return error instanceof Error&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name)?error.name:typeof error;
}
/** Log a caught failure at an HTTP boundary and return its reference. */
export function logBoundaryError(route:string,error:unknown,status?:number):string{
 const errorId=randomUUID();
 const entry:BoundaryErrorLog={level:'error',event:'nevora.boundary_error',route,errorId,code:errorCode(error),sentinel:errorSentinel(error),name:errorName(error),...(status?{status}:{})};
 console.error(JSON.stringify(entry));
 return errorId;
}
/** The response header that carries the reference to the client and to support. */
export const ERROR_ID_HEADER='x-nevora-error-id';
/** Attach the reference to an already-built response without changing its body (clients parse bodies strictly). */
export function withErrorId(response:Response,errorId:string):Response{
 response.headers.set(ERROR_ID_HEADER,errorId);
 return response;
}
/** Log, then attach the reference: the one call each API catch makes before returning its failure response. */
export function failed(route:string,error:unknown,response:Response):Response{
 return withErrorId(response,logBoundaryError(route,error,response.status));
}
