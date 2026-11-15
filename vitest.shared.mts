import {defineConfig,mergeConfig,type ViteUserConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
/** Shared application resolution. No database URLs or browser activation here. */
export const vitestResolution={alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}};
const shared=defineConfig({resolve:vitestResolution});
/** Compatibility config files remain callable by their existing owned runners. */
export function projectConfig(name:string,config:ViteUserConfig):ViteUserConfig{
 const merged=mergeConfig(shared,config);return {...merged,test:{...merged.test,name}};
}
export default shared;
