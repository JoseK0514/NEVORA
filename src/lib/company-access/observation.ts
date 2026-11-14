/** Project before any server-to-client boundary. Structural TypeScript types do
 * not remove operational data, session metadata or future fields at runtime. */
export type ScopedObservation = {authority:string;observedAt:string;validForMs:number};
export function scopedObservation(value:ScopedObservation):ScopedObservation;
export function scopedObservation(value:ScopedObservation|null|undefined):ScopedObservation|null;
export function scopedObservation(value:ScopedObservation|null|undefined):ScopedObservation|null {
  return value?{authority:value.authority,observedAt:value.observedAt,validForMs:value.validForMs}:null;
}
