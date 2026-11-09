import {getDb,queryRows} from '../db';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {workspaceMode} from '../workspace-routing/config.server';
import {currentWorkspaceBinding} from '../workspace-routing/context.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';

/** Neon HTTP transactions are ordered, non-interactive batches. Never await
 * individual query promises before passing the batch to sql.transaction. */
export function neonNotificationExecutor(): SqlExecutor {
    return {
        async query<T>(statement: SqlStatement, signal?: AbortSignal) {
            signal?.throwIfAborted();
            if(workspaceMode()==='isolated')return getWorkspaceDb(await currentWorkspaceBinding()).query<T>(statement,signal);
            return queryRows<T>(await getDb().query(statement.text, [...statement.values], signal ? { fetchOptions: { signal } } : undefined));
        },
        async transaction(statements, signal) {
            signal?.throwIfAborted();
            if(workspaceMode()==='isolated')return getWorkspaceDb(await currentWorkspaceBinding()).transaction(statements,signal);
            if (!statements.length)
                return [];
            const sql = getDb();
            const results = await sql.transaction(statements.map(statement => sql.query(statement.text, [...statement.values])), signal ? { fetchOptions: { signal } } : undefined);
            return results.map(result => queryRows(result));
        },
    };
}
