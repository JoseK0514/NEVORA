import {registerHooks} from 'node:module';

// Standalone QA needs Next's marker resolution while retaining the normal
// React renderer. This preload is never part of an application/worker entry.
if (process.env.NODE_ENV !== 'test' || ['DATABASE_URL', 'NEVORA_APP_DATABASE_URL', 'NEVORA_WORKER_DATABASE_URL'].some(key => process.env[key] !== undefined)) {
  throw Error('QA server context requires an isolated test process without application database credentials.');
}
const marker = new URL('../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url).href;
registerHooks({resolve(specifier, context, nextResolve) {
  return specifier === 'server-only' ? {url: marker, shortCircuit: true} : nextResolve(specifier, context);
}});
