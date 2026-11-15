/** Amount differences are statement comparisons, never proof of settlement. */
type Row={employeeId:string;netMinor:string};
export type PayrollCorrectionDelta={totalNetMinor:string;employees:{employeeId:string;previousNetMinor:string;netMinor:string;deltaNetMinor:string}[]};
export function correctionDelta(previous:readonly Row[]|null,current:readonly Row[]|null):PayrollCorrectionDelta|null{
 if(!previous||!current)return null;
 const before=new Map(previous.map(r=>[r.employeeId,r.netMinor])),after=new Map(current.map(r=>[r.employeeId,r.netMinor]));
 const employees=[...new Set([...before.keys(),...after.keys()])].sort().map(employeeId=>{const previousNetMinor=before.get(employeeId)??'0',netMinor=after.get(employeeId)??'0';return {employeeId,previousNetMinor,netMinor,deltaNetMinor:String(BigInt(netMinor)-BigInt(previousNetMinor))};});
 return {employees,totalNetMinor:String(employees.reduce((sum,r)=>sum+BigInt(r.deltaNetMinor),BigInt(0)))};
}
