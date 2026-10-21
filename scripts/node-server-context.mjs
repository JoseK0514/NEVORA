import {registerHooks} from 'node:module';

// Next resolves its compile-time marker inside the framework. A standalone
// Node worker explicitly declares the same server context; browser builds keep
// their original server-only imports and Next's client-boundary rejection.
// Node24.19 is pinned in this repository's CI. Only this exact marker is mapped.
const marker=new URL('../node_modules/next/dist/compiled/server-only/empty.js',import.meta.url).href;
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier==='server-only'&&context.conditions.includes('react-server'))return {url:marker,shortCircuit:true};
 return nextResolve(specifier,context);
}});
