'use client';
import type {StaffTaskCommand, TaskCommandResult, TaskContextResult, TaskListResult, TaskDetailResult} from './types';
import {parseTaskResource, parseTaskCommandResult} from './wire';

type Action = 'context' | 'contextPage' | 'query' | 'history' | 'command' | 'read' | 'operation';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest = /^[a-f0-9]{64}$/;
const paths = {context: '/context', contextPage: '/context', query: '/query', history: '/history', command: '/commands', read: '', operation: '/operations'} as const;

/** No automatic retries: a dispatched command may have committed after a lost response. */
export async function staffTaskRequest(action: Action, authority: string, body?: unknown, id?: string, signal?: AbortSignal): Promise<unknown> {
  if (action !== 'context' && !digest.test(authority)) throw Error('Invalid task authority');
  if ((action === 'read' || action === 'operation') && (!id || !uuid.test(id))) throw Error('Invalid task identifier');
  const post = action === 'query' || action === 'command' || action === 'history' || action === 'contextPage';
  const response = await fetch('/api/staff-tasks' + paths[action] + (id ? '/' + id.toLowerCase() : ''), {
    method: post ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
    headers: {'Accept': 'application/json', 'X-Nevora-Staff-Task': '1', ...(authority ? {'X-Nevora-Staff-Task-Authority': authority} : {}), ...(post ? {'Content-Type': 'application/json'} : {})},
    ...(post ? {body: JSON.stringify(body)} : {}),
  });
  if (response.status === 401 || response.status === 403) return {status: 'blocked', reason: 'access_denied'};
  return response.json();
}

export async function sendStaffTaskCommand(command: StaffTaskCommand, signal?: AbortSignal): Promise<TaskCommandResult> {
  try {
    if (!uuid.test(command.operationId) || !digest.test(command.authority) || new TextEncoder().encode(JSON.stringify(command)).length > 16384) return {status: 'invalid', reason: 'invalid_command'};
  } catch { return {status: 'invalid', reason: 'invalid_command'}; }
  try { return parseTaskCommandResult(await staffTaskRequest('command', command.authority, command, undefined, signal), command.operationId, command) ?? {status: 'outcome_unknown', operationId: command.operationId}; }
  catch { return {status: 'outcome_unknown', operationId: command.operationId}; }
}

export async function readStaffTaskOperation(authority: string, operationId: string, signal?: AbortSignal, originalCommand?: StaffTaskCommand): Promise<TaskCommandResult> {
  try { return parseTaskCommandResult(await staffTaskRequest('operation', authority, undefined, operationId, signal), operationId, originalCommand) ?? {status: 'unavailable', reason: 'operation_unavailable'}; }
  catch { return {status: 'unavailable', reason: 'operation_unavailable'}; }
}

type Resource = TaskContextResult | TaskListResult | TaskDetailResult;
/** Feed this parser into the existing private snapshot controller; its elapsed
 * request budget, visibility and logout rules also apply to task observations. */
export function parseStaffTaskLifetime(value: unknown, authority: string): {state: 'ready'; observedAt: string; validForMs: number; value: Extract<Resource, {state: 'ready'}>} {
  const r = parseTaskResource(value, authority);
  return {state: 'ready', observedAt: r.observedAt, validForMs: r.validForMs, value: r};
}
