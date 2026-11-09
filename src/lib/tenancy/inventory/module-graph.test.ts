import { createHash } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { buildModuleDependencyGraph, type ModuleSourceBlob } from './module-graph';

const blob = (path: string, text: string): ModuleSourceBlob => ({ path, text, sha256: createHash('sha256').update(text,'utf8').digest('hex') });
const configuration = (options: Record<string,unknown> = {}, path = 'tsconfig.json') => blob(path, JSON.stringify({compilerOptions:{module:'esnext',moduleResolution:'bundler',paths:{'@/*':['./src/*']},...options}}));
const graph = (sources: ModuleSourceBlob[], config = configuration()) => buildModuleDependencyGraph({sources,configuration:config});

describe('supplied-source static module dependency graph', () => {
  it('resolves supplied @ aliases, relative index modules and require aliases with exact provenance', () => {
    const caller=blob('src/read.ts', "import { query as run } from '@/lib/db'; const { transaction: tx } = require('./transactions'); run('SELECT 1'); tx();");
    const db=blob('src/lib/db.ts', 'export const query = fictional;');
    const transactions=blob('src/transactions/index.ts', 'export const transaction = fictional;');
    const result=graph([caller,db,transactions]);
    expect(result.edges.map(edge=>[edge.candidate.moduleSpecifier,edge.resolution,edge.target?.path])).toEqual([
      ['@/lib/db','RESOLVED_CANDIDATE','src/lib/db.ts'],['./transactions','RESOLVED_CANDIDATE','src/transactions/index.ts'],
    ]);
    expect(result.edges[0].from).toEqual({path:caller.path,sha256:caller.sha256,byteLength:Buffer.byteLength(caller.text)});
    expect(result.edges[0].target).toEqual({path:db.path,sha256:db.sha256,byteLength:Buffer.byteLength(db.text)});
    expect(result.nodes.find(node=>node.path===caller.path)?.inventory?.bindings.map(binding=>[binding.localName,binding.importedName])).toEqual([['run','query'],['tx','transaction']]);
    expect(result.provenance.configuration.sha256).toBe(configuration().sha256);
    expect(result.provenance.typescriptVersion).toBe(ts.version);
    expect(result.provenance).toMatchObject({virtualHost:'SUPPLIED_BLOBS_ONLY',caseSensitive:true});
  });

  it.each([['./db.js','src/db.ts'],['./db.mjs','src/db.mts'],['./db.cjs','src/db.cts']])('uses public TypeScript extension substitution for %s', (specifier,target) => {
    const result=graph([blob('src/read.ts',`import '${specifier}';`),blob(target,'export {};')]);
    expect(result.edges[0]).toMatchObject({resolution:'RESOLVED_CANDIDATE',target:{path:target}});
  });

  it('retains TypeScript file/index precedence without inventing an ambiguity', () => {
    const result=graph([blob('src/read.ts',"import './db';"),blob('src/db.ts','export {};'),blob('src/db.tsx','export {};'),blob('src/db/index.ts','export {};')]);
    expect(result.edges[0]).toMatchObject({resolution:'RESOLVED_CANDIDATE',target:{path:'src/db.ts'}});
  });

  it('keeps missing relative/alias targets and unresolved external modules explicit', () => {
    const result=graph([blob('src/read.ts',"import './missing'; import '@/missing'; import 'fictional-pg'; import 'node:fs';")]);
    expect(result.edges.map(edge=>[edge.candidate.moduleSpecifier,edge.resolution])).toEqual([
      ['./missing','MISSING'],['@/missing','MISSING'],['fictional-pg','EXTERNAL'],['node:fs','EXTERNAL'],
    ]);
    expect(result.edges.every(edge=>!edge.target)).toBe(true);
  });

  it('retains dynamic expressions, literal dynamic candidates and shadowed require uncertainty', () => {
    const result=graph([blob('src/read.ts',"const db = require(moduleName); import(otherModule); import('./db'); function load(require: any) { require('./db'); }"),blob('src/db.ts','export {};')]);
    expect(result.edges.map(edge=>[edge.dependencyKind,edge.resolution])).toEqual([
      ['DYNAMIC_CANDIDATE','UNRESOLVED'],['DYNAMIC_CANDIDATE','UNRESOLVED'],['DYNAMIC_CANDIDATE','RESOLVED_CANDIDATE'],['STATIC_CANDIDATE','UNRESOLVED'],
    ]);
    expect(result.edges[2].target?.path).toBe('src/db.ts');
    expect(result.edges[3].observationCodes).toContain('SHADOWED_REQUIRE');
  });

  it('does not manufacture dependencies from comments and source-looking strings', () => {
    const result=graph([blob('src/read.ts',"// import './ghost';\nconst note = \"require('./ghost')\"; /* export * from './ghost'; */")]);
    expect(result.edges).toEqual([]);
  });

  it('retains named/star/type reexports as syntax dependencies with source spans', () => {
    const source="// 🐾\r\nexport { query as run } from './db';\r\nexport * from './db'; export type { Row } from './db';";
    const result=graph([blob('src/index.ts',source),blob('src/db.ts','export {};')]);
    expect(result.edges.map(edge=>[edge.candidate.kind,edge.candidate.typeOnly,edge.target?.path])).toEqual([
      ['REEXPORT',false,'src/db.ts'],['REEXPORT',false,'src/db.ts'],['REEXPORT',true,'src/db.ts'],
    ]);
    const span=result.edges[0].candidate.span;
    expect(source.slice(span.startOffset,span.endOffset)).toBe("export { query as run } from './db';");
    expect(span.startByte).toBe(Buffer.byteLength(source.slice(0,span.startOffset)));
    expect(span.startLine).toBe(2);
  });

  it('retains conflicting supplied versions of a path as ambiguous targets', () => {
    const first=blob('src/db.ts','export const query = first;');
    const second=blob('src/db.ts','export const query = second;');
    const result=graph([blob('src/read.ts',"import './db';"),second,first]);
    expect(result.edges[0].resolution).toBe('AMBIGUOUS');
    expect(result.edges[0].target).toBeUndefined();
    expect(result.edges[0].candidateTargets.map(target=>target.sha256).sort()).toEqual([first.sha256,second.sha256].sort());
    expect(result.observations.some(item=>item.code==='AMBIGUOUS_SOURCE_PATH' && item.path==='src/db.ts')).toBe(true);
  });

  it('uses a case-sensitive virtual host without silently merging distinct paths', () => {
    const result=graph([blob('src/read.ts',"import './db'; import './DB'; import './Db';"),blob('src/db.ts','export {};'),blob('src/DB.ts','export {};')]);
    expect(result.edges.map(edge=>[edge.resolution,edge.target?.path])).toEqual([
      ['RESOLVED_CANDIDATE','src/db.ts'],['RESOLVED_CANDIDATE','src/DB.ts'],['MISSING',undefined],
    ]);
  });

  it('reports structural static candidate cycles including self edges but excludes dynamic paths', () => {
    const result=graph([blob('src/a.ts',"import './b';"),blob('src/b.ts',"import './a';"),blob('src/self.ts',"import './self';"),blob('src/dynamic.ts',"import('./dynamic');")]);
    expect(result.cycles.map(cycle=>cycle.map(node=>node.path))).toEqual([['src/a.ts','src/b.ts'],['src/self.ts']]);
  });

  it('binds deterministic output to exact source bytes and configuration rather than caller order', () => {
    const sources=[blob('src/a.ts',"import './b';"),blob('src/b.ts','export {};')];
    const config=configuration(); const before=JSON.stringify({sources,config});
    const result=graph(sources,config);
    expect(graph([...sources].reverse(),config)).toEqual(result);
    expect(JSON.stringify({sources,config})).toBe(before);
    const changedConfig=blob(config.path,config.text+'\n');
    expect(graph(sources,changedConfig).provenance.configuration.sha256).not.toBe(result.provenance.configuration.sha256);
    expect(graph([sources[0],blob('src/b.ts','export {};\n')],config).provenance.sourceSetSha256).not.toBe(result.provenance.sourceSetSha256);
  });

  it('refuses source/config hash mismatch and noncanonical custody paths', () => {
    expect(()=>graph([{...blob('src/a.ts','export {};'),sha256:'0'.repeat(64)}])).toThrow('hash mismatch');
    expect(()=>graph([], {...configuration(),sha256:'0'.repeat(64)})).toThrow('hash mismatch');
    for(const path of ['../outside.ts','/absolute.ts','src/../outside.ts','src\\read.ts','./src/read.ts'])expect(()=>graph([blob(path,'export {};')])).toThrow('canonical relative path');
  });

  it('does not resolve edges using incomplete inherited or invalid compiler configuration', () => {
    const sources=[blob('src/a.ts',"import './b';"),blob('src/b.ts','export {};')];
    const inherited=graph(sources,blob('tsconfig.json',JSON.stringify({extends:'./absent.json',compilerOptions:{moduleResolution:'bundler'}})));
    expect(inherited.configurationStatus).toBe('UNRESOLVED_CONFIGURATION');
    expect(inherited.edges[0].resolution).toBe('UNRESOLVED');
    expect(inherited.observations.map(item=>item.code)).toContain('EXTENDED_CONFIGURATION_NOT_RESOLVED');
    const invalid=graph(sources,configuration({moduleResolution:'fictional-mode'}));
    expect(invalid.configurationStatus).toBe('UNRESOLVED_CONFIGURATION');
    expect(invalid.edges[0].resolution).toBe('UNRESOLVED');
  });

  it('resolves alias mappings relative to the supplied configuration directory', () => {
    const result=graph([blob('src/a.ts',"import '@/b';"),blob('src/b.ts','export {};')],configuration({paths:{'@/*':['../src/*']}},'config/tsconfig.json'));
    expect(result.edges[0]).toMatchObject({resolution:'RESOLVED_CANDIDATE',target:{path:'src/b.ts'}});
  });

  it('uses supplied package metadata and public import/require modes without pulling in ambient dependencies', () => {
    const result=graph([
      blob('src/read.ts',"import { query } from 'fictional-pg'; const db = require('fictional-pg');"),
      blob('node_modules/fictional-pg/package.json',JSON.stringify({name:'fictional-pg',version:'1.0.0',exports:{import:'./esm.ts',require:'./cjs.ts'}})),
      blob('node_modules/fictional-pg/esm.ts','export {};'),blob('node_modules/fictional-pg/cjs.ts','export {};'),
    ],configuration({module:'preserve'}));
    expect(result.edges.map(edge=>[edge.resolutionMode,edge.resolution,edge.candidateTargets[0]?.path])).toEqual([
      ['IMPORT','EXTERNAL','node_modules/fictional-pg/esm.ts'],['REQUIRE','EXTERNAL','node_modules/fictional-pg/cjs.ts'],
    ]);
    expect(result.edges.every(edge=>!edge.target)).toBe(true);
  });

  it('uses public NodeNext file-format modes for supplied mts/cts files', () => {
    const result=graph([
      blob('src/read.mts',"import 'fictional-pg';"),blob('src/read.cts',"import 'fictional-pg';"),
      blob('node_modules/fictional-pg/package.json',JSON.stringify({name:'fictional-pg',version:'1.0.0',exports:{import:'./esm.mts',require:'./cjs.cts'}})),
      blob('node_modules/fictional-pg/esm.mts','export {};'),blob('node_modules/fictional-pg/cjs.cts','export {};'),
    ],configuration({module:'nodenext',moduleResolution:'nodenext'}));
    expect(result.edges.map(edge=>[edge.from.path,edge.resolutionMode,edge.candidateTargets[0]?.path])).toEqual([
      ['src/read.cts','REQUIRE','node_modules/fictional-pg/cjs.cts'],['src/read.mts','IMPORT','node_modules/fictional-pg/esm.mts'],
    ]);
  });

  it('keeps conflicting package metadata ambiguous rather than selecting a format or target silently', () => {
    const result=graph([
      blob('src/read.ts',"import 'fictional-pg';"),
      blob('node_modules/fictional-pg/package.json',JSON.stringify({types:'first.d.ts'})),
      blob('node_modules/fictional-pg/package.json',JSON.stringify({types:'second.d.ts'})),
      blob('node_modules/fictional-pg/index.d.ts','export {};'),
    ]);
    expect(result.edges[0].resolution).toBe('AMBIGUOUS');
    expect(result.edges[0].target).toBeUndefined();
    expect(result.edges[0].observationCodes).toContain('AMBIGUOUS_SUPPLIED_RESOLUTION');
  });

  it('retains malformed configuration as unresolved and never resolves through its partial values', () => {
    const result=graph([blob('src/read.ts',"import './db';"),blob('src/db.ts','export {};')],blob('tsconfig.json','{"compilerOptions": {"moduleResolution": "bundler",'));
    expect(result.configurationStatus).toBe('UNRESOLVED_CONFIGURATION');
    expect(result.edges[0].resolution).toBe('UNRESOLVED');
    expect(result.observations.some(item=>item.code.startsWith('TS_CONFIG_'))).toBe(true);
  });

  it('retains fixture/test categories, source diagnostics and explicit analysis limits', () => {
    const result=graph([blob('src/test/fixtures/db.ts',"import { query from './db';"),blob('src/read.test.ts','export {};')]);
    expect(result.nodes.find(node=>node.path.includes('fixtures'))?.inventory?.sourceCategory).toBe('FIXTURE');
    expect(result.nodes.find(node=>node.path.endsWith('.test.ts'))?.inventory?.sourceCategory).toBe('TEST');
    expect(result.nodes.some(node=>node.inventory?.observations.some(item=>item.code.startsWith('TS_PARSE_')))).toBe(true);
    expect(result).toMatchObject({analysis:'STATIC_MODULE_CANDIDATES_ONLY',moduleExecution:'NOT_PERFORMED',transitiveDataflow:'NOT_PERFORMED',sqlSinks:'NOT_CLASSIFIED',tenantOwnership:'NOT_CLASSIFIED',completeness:'NOT_CLAIMED'});
  });

  it('never executes analyzed code or uses TypeScript ambient system filesystem hooks', () => {
    const state=globalThis as unknown as Record<string,unknown>;const before=state.__fictionalModuleGraphExecution;
    const fail=()=>{throw new Error('ambient host access prohibited');};
    const spies=[vi.spyOn(ts.sys,'fileExists').mockImplementation(fail),vi.spyOn(ts.sys,'readFile').mockImplementation(fail),vi.spyOn(ts.sys,'getCurrentDirectory').mockImplementation(fail)];
    try {
      const result=graph([blob('src/a.ts',"globalThis.__fictionalModuleGraphExecution = true; import './b'; throw new Error('never execute');"),blob('src/b.ts','export {};')]);
      expect(result.edges[0].resolution).toBe('RESOLVED_CANDIDATE');expect(state.__fictionalModuleGraphExecution).toBe(before);
      for(const spy of spies)expect(spy).not.toHaveBeenCalled();
    }finally {for(const spy of spies)spy.mockRestore();}
  });
});
