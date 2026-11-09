declare const __NEVORA_NEON_BUILD_SOURCE_SHA__:string|undefined;
/** esbuild replaces this identifier with the immutable clean build SHA. */
export function compiledHostedSourceSha():string|undefined{
 return typeof __NEVORA_NEON_BUILD_SOURCE_SHA__==='string'?__NEVORA_NEON_BUILD_SOURCE_SHA__:undefined;
}
export function hostedSourceMatches(configured:string|undefined){
 const built=compiledHostedSourceSha();
 return !!built&&/^[a-f0-9]{40}$/.test(built)&&configured===built;
}
