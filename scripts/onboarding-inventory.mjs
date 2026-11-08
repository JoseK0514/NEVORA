import ts from 'typescript';
// Runtime boundaries, including new paths outside /api/onboarding. Exemptions are
// bounded source/test/tool directories, never a blanket unseen-path disposition.
export function onboardingRuntimeEntrypoint(path,source){
 if(/(?:^|\/)(?:test|tests|__tests__|fixtures)\//.test(path)||/\.(?:test|check|spec)\.[cm]?[jt]sx?$/.test(path))return false;
 if(/^src\/app\/.*\/route\.[jt]s$/.test(path)||/^functions\/.*\.[cm]?[jt]s$/.test(path)||/^(?:src\/)?(?:middleware|proxy)\.[jt]s$/.test(path))return true;
 if(/^(?:scripts|src\/lib)\/.*(?:^|[-/])worker(?:\.[cm]?[jt]s|\/)/.test(path))return true;
 if(!/^(?:src|functions|scripts)\/.*\.[cm]?[jt]sx?$/.test(path))return false;
 if(source.includes('use server')){
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,false,path.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);let action=false;
  const visit=node=>{if(ts.isExpressionStatement(node)&&ts.isStringLiteral(node.expression)&&node.expression.text==='use server')action=true;ts.forEachChild(node,visit);};visit(tree);if(action)return true;
 }
 return /(?:from\s*|import\s*\()\s*['"](?:@neondatabase\/serverless|pg)['"]|\brequire\(['"](?:@neondatabase\/serverless|pg)['"]\)/.test(source);
}
export function validateOnboardingInventory(files,inventory,read){
 const tracked=new Set(files),entries=new Map();
 for(const entry of inventory.entries){if(entries.has(entry.path)||!tracked.has(entry.path)||!['CONVERTED','PROVEN_NON_RUNTIME'].includes(entry.status)||!entry.reason)throw Error('Incomplete onboarding entrypoint inventory: '+entry.path);entries.set(entry.path,entry);}
 const missing=files.filter(path=>onboardingRuntimeEntrypoint(path,read(path))&&!entries.has(path));
 if(missing.length)throw Error('Unclassified runtime entrypoint: '+missing.join(', '));
 return entries;
}
