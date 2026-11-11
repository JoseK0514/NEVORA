/** Linux /proc simulation for the actual-process cross-platform fixture only.
 * The caller separately admits only its recorded invocation-created PIDs. A
 * second real ps sample, never a cached lease, decides marker availability. */
export function fixtureProcEnvironment(ownerId,observation){
 if(!/^[a-f0-9]{32}$/.test(ownerId)||observation.error||observation.stderr?.trim())throw Error('fixture process environment unavailable');
 const state=observation.stdout?.trim()??'';
 if(observation.status===1&&!state)throw Object.assign(Error('fixture process no longer exists'),{code:'ENOENT'});
 if(observation.status!==0||! /^[RSDTtXxZWILUNPK][A-Za-z+<]*$/.test(state))throw Error('fixture process environment unavailable');
 if(state.startsWith('Z'))return '';
 return 'NEVORA_OWNED_PROCESS_OWNER='+ownerId+'\0';
}
