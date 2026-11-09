import type {ScopeSelection} from './model';
/** Parse explicit finite scope input without a default-to-Company fallback.
 * Locations must be unique and nonempty; sorting gives command hashing a stable
 * order. Existence, tenant membership and active state are checked by SQL later. */
export function parseScopeSelection(value:unknown):ScopeSelection|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='locationIds,mode'||!Array.isArray(v.locationIds))return null;
 if(v.mode==='COMPANY')return v.locationIds.length===0?{mode:'COMPANY',locationIds:[]}:null;
 if(v.mode!=='LOCATIONS'||v.locationIds.length<1||v.locationIds.length>100)return null;
 const ids=v.locationIds;
 if(ids.some(id=>typeof id!=='string'||!id||id.length>200||id!==id.trim()||/[\p{Cc}\p{Cf}]/u.test(id))||new Set(ids).size!==ids.length)return null;
 return {mode:'LOCATIONS',locationIds:[...ids].sort()};
}
