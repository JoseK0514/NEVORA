import type {SqlStatement} from '../../lib/notifications/types';
/** Domain unit-test seam, preserving the pre-existing business query mocks.
 * The actual session boundary is tested separately with installed Neon SDK and
 * owned PostgreSQL; no unit seam is imported by application code. */
type DomainDriver={query(text:string,values:unknown[],options?:{fetchOptions:{signal:AbortSignal}}):unknown;transaction(queries:unknown[],options?:{fetchOptions:{signal:AbortSignal}}):Promise<unknown[][]>};
export async function sessionTransaction(sql:DomainDriver,statements:readonly SqlStatement[],signal?:AbortSignal):Promise<unknown[][]>{
 signal?.throwIfAborted();const options=signal?{fetchOptions:{signal}}:undefined;
 if(statements.length===1)return [await sql.query(statements[0].text,[...statements[0].values],options) as unknown[]];
 return sql.transaction(statements.map(s=>sql.query(s.text,[...s.values])),options);
}
