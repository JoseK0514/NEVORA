import {safeEnvironment} from './phase-e-owned.mjs';

// Next's TypeScript worker inherits this fixed build-only limit. The hosted
// runner exhausted its default ~2 GiB heap; keep typechecking and source guards.
// Never forward caller NODE_OPTIONS: it can contain executable preload hooks.
export function releaseBuildEnvironment(env=process.env){
 return {...safeEnvironment(env),NODE_OPTIONS:'--max-old-space-size=4096',NEXT_TELEMETRY_DISABLED:'1'};
}
