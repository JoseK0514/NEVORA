import {getDb,queryRows} from '../db';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {isReadSnapshot,retryTransientRead} from './read-snapshot';

/** Neon HTTP transactions are ordered, non-interactive batches. Never await
 * individual query promises before passing the batch to sql.transaction. */
export function neonNotificationExecutor(): SqlExecutor {
    return {
        async query<T>(statement: SqlStatement, signal?: AbortSignal) {
            signal?.throwIfAborted();
            return queryRows<T>(await getDb().query(statement.text, [...statement.values], signal ? { fetchOptions: { signal } } : undefined));
        },
        async transaction(statements, signal) {
            signal?.throwIfAborted();
            if (!statements.length)
                return [];
            const sql = getDb();
            const run = async () => (await sql.transaction(statements.map(statement => sql.query(statement.text, [...statement.values])), signal ? { fetchOptions: { signal } } : undefined)).map(result => queryRows(result));
            // A batch that opens with READ_SNAPSHOT is READ ONLY by PostgreSQL's own enforcement, so a second attempt
            // after a lock/statement timeout or a dropped connection cannot repeat a write (inspection B3, B11).
            return isReadSnapshot(statements) ? retryTransientRead(run, signal) : run();
        },
    };
}
