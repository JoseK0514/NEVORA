/** Public clock contracts contain no employee, device-credential or PIN authority. */
export type PunchAction = 'CLOCK_IN' | 'START_BREAK' | 'END_BREAK' | 'CLOCK_OUT';
export type PunchExpected = {
 revision:number;
 timeEntryId:string|null; timeEntryVersion:number|null;
 breakEntryId:string|null; breakEntryVersion:number|null;
};
export type PunchSnapshot = {
 revision:number;
 entry:{id:string;locationId:string;clockInAt:string;status:'CLOCKED_IN'|'ON_BREAK';version:number}|null;
 break:{id:string;breakStartAt:string;version:number}|null;
};
export type PunchCommand = {
 commandId:string; action:PunchAction; verificationId:string; expected:PunchExpected;
};
export type PunchReceipt = {
 commandId:string; action:PunchAction; timeEntryId:string; breakEntryId:string|null;
 performedAt:string; snapshot:PunchSnapshot;
};
export type PunchView = {
 snapshot:PunchSnapshot; verificationId:string; allowedActions:PunchAction[]; atOtherLocation:boolean;
};
