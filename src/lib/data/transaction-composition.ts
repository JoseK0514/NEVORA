import type {SqlExecutor,SqlStatement} from '../notifications/types';
/** Canonical writers explicitly identify their atomic business mutation. A
 * decorator may refuse unclassified transactions without parsing SQL spelling. */
export function mutationTransaction(ex:SqlExecutor,statements:readonly SqlStatement[],signal?:AbortSignal){return ex.mutationTransaction?ex.mutationTransaction(statements,signal):ex.transaction(statements,signal);}
export function readTransaction(ex:SqlExecutor,statements:readonly SqlStatement[],signal?:AbortSignal){return ex.readTransaction?ex.readTransaction(statements,signal):ex.transaction(statements,signal);}
