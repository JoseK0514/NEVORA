export const CREATION_TRACE_PREFIX: string;
export function installOwnedCreationDiagnostics(options:{origin:string;publish(entry:{event:'start'|'request-end'|'request-aborted'|'finish'|'close'|'unavailable';request:number;subject?:string;complete:boolean;status:number|null;process:number;at:number}):void}):()=>void;
