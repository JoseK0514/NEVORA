/** Syntax/size admission only. The server authenticates every envelope and
 * current database proof; this browser helper establishes no authority. */
export function isPublicProofEnvelope(value:unknown):value is string{return typeof value==='string'&&value.length<=4096&&/^nw1_v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{1,3000}\.[A-Za-z0-9_-]{22}$/.test(value);}
export function isPublicAccountProof(value:unknown):value is string{return typeof value==='string'&&(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value)||isPublicProofEnvelope(value));}
export function isPublicClockerEnrollment(value:unknown):value is string{return typeof value==='string'&&(/^nev_enr_[a-f0-9]{64}$/.test(value)||isPublicProofEnvelope(value));}
