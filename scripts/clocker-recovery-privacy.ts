import {isDeepStrictEqual} from 'node:util';
import {parsePunchCommand} from '../src/lib/clocker/punch-command';

/** Browser QA for this CLOCK_IN recovery case. Never include stored values in
 * diagnostics; opaque public UUIDs/digests may naturally contain PIN digits. */
export function assertPrivateClockInRecovery(text: string, expectedCommand: unknown): void {
  try {
    if(typeof text!=='string'||text.length>2048)throw Error();
    const raw:unknown=JSON.parse(text);
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error();
    const record=raw as Record<string,unknown>;
    if(Object.keys(record).length!==2||!Object.hasOwn(record,'subject')||!Object.hasOwn(record,'command')||
      typeof record.subject!=='string'||!/^[a-f0-9]{64}$/.test(record.subject))throw Error();
    // The real parser checks every raw command/expected key before projecting.
    const command=parsePunchCommand(record.command),sent=parsePunchCommand(expectedCommand);
    if(command.action!=='CLOCK_IN'||command.expected.timeEntryId!==null||command.expected.timeEntryVersion!==null||
      command.expected.breakEntryId!==null||command.expected.breakEntryVersion!==null||
      !isDeepStrictEqual(record.command,command)||!isDeepStrictEqual(command,sent))throw Error();
  } catch {
    throw new Error('Recovery intent violates the public storage contract.');
  }
}
