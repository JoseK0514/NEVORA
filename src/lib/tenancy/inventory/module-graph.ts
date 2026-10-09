import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import ts from 'typescript';
import { inventorySourceCandidates } from './consumers';
import type { CandidateSpan, ImportCandidate, SourceCandidateInventory } from './consumers';

export type ModuleSourceBlob = { path: string; text: string; sha256: string };
export type ModuleSourceIdentity = { path: string; sha256: string; byteLength: number };
export type ModuleGraphRequest = { sources: readonly ModuleSourceBlob[]; configuration: ModuleSourceBlob };
export type ModuleGraphNode = ModuleSourceIdentity & { inventory?: SourceCandidateInventory };
export type ModuleGraphObservation = { code: string; path?: string; span?: CandidateSpan };
export type ModuleDependencyEdge = {
  from: ModuleSourceIdentity;
  candidate: ImportCandidate | { kind: 'REEXPORT'; moduleSpecifier: string; typeOnly: boolean; span: CandidateSpan };
  dependencyKind: 'STATIC_CANDIDATE' | 'DYNAMIC_CANDIDATE';
  resolution: 'RESOLVED_CANDIDATE' | 'AMBIGUOUS' | 'MISSING' | 'EXTERNAL' | 'UNRESOLVED';
  resolutionMode?: 'IMPORT' | 'REQUIRE';
  target?: ModuleSourceIdentity;
  candidateTargets: ModuleSourceIdentity[];
  observationCodes: string[];
};
export type ModuleDependencyGraph = {
  nodes: ModuleGraphNode[]; edges: ModuleDependencyEdge[]; cycles: ModuleSourceIdentity[][]; observations: ModuleGraphObservation[];
  provenance: { sourceSetSha256: string; configuration: ModuleSourceIdentity; typescriptVersion: string; virtualHost: 'SUPPLIED_BLOBS_ONLY'; caseSensitive: true };
  configurationStatus: 'EXPLICIT_CONFIGURATION' | 'UNRESOLVED_CONFIGURATION';
  analysis: 'STATIC_MODULE_CANDIDATES_ONLY'; moduleExecution: 'NOT_PERFORMED'; transitiveDataflow: 'NOT_PERFORMED'; sqlSinks: 'NOT_CLASSIFIED'; tenantOwnership: 'NOT_CLASSIFIED'; completeness: 'NOT_CLAIMED';
};

const VIRTUAL_ROOT = '/supplied';
const digest = (text:string) => createHash('sha256').update(text,'utf8').digest('hex');
const identity = (blob:ModuleSourceBlob): ModuleSourceIdentity => ({path:blob.path,sha256:blob.sha256,byteLength:Buffer.byteLength(blob.text,'utf8')});
const compareText = (a:string,b:string) => a<b?-1:a>b?1:0;
const compareIdentity = (a:ModuleSourceIdentity,b:ModuleSourceIdentity) => compareText(a.path,b.path) || compareText(a.sha256,b.sha256);
const key = (source:ModuleSourceIdentity) => JSON.stringify([source.path,source.sha256]);
const virtualPath = (path:string) => VIRTUAL_ROOT+'/'+path;
const sourcePath = (path:string): string | undefined => {
  const normalized=posix.normalize(path);
  return normalized.startsWith(VIRTUAL_ROOT+'/')?normalized.slice(VIRTUAL_ROOT.length+1):undefined;
};
const validateBlob = (blob:ModuleSourceBlob) => {
  if(!blob.path || posix.isAbsolute(blob.path) || /[\\\u0000-\u001f]/.test(blob.path) || /^[A-Za-z]+:/.test(blob.path) || blob.path.split('/').some(part=>!part || part==='.' || part==='..'))throw new Error('Expected canonical relative path for supplied blob');
  if(!/^[a-f0-9]{64}$/.test(blob.sha256) || digest(blob.text)!==blob.sha256)throw new Error('Supplied blob hash mismatch: '+blob.path);
};

/** Structural SCCs of resolved static syntax candidates only, not runtime cycles. */
function candidateCycles(nodes:ModuleGraphNode[],edges:ModuleDependencyEdge[]): ModuleSourceIdentity[][] {
  const byId=new Map(nodes.map(node=>[key(node),{path:node.path,sha256:node.sha256,byteLength:node.byteLength}]));
  const forward=new Map<string,Set<string>>();const reverse=new Map<string,Set<string>>();
  for(const id of byId.keys()){forward.set(id,new Set());reverse.set(id,new Set());}
  for(const edge of edges)if(edge.dependencyKind==='STATIC_CANDIDATE' && edge.resolution==='RESOLVED_CANDIDATE' && edge.target) {
    const from=key(edge.from),to=key(edge.target);forward.get(from)!.add(to);reverse.get(to)!.add(from);
  }
  const seen=new Set<string>(),order:string[]=[];
  for(const start of byId.keys()) {
    if(seen.has(start))continue;
    const pending:{id:string;done:boolean}[]=[{id:start,done:false}];
    while(pending.length) {
      const current=pending.pop()!;
      if(current.done){order.push(current.id);continue;}
      if(seen.has(current.id))continue;seen.add(current.id);
      pending.push({id:current.id,done:true});
      for(const next of forward.get(current.id)!)if(!seen.has(next))pending.push({id:next,done:false});
    }
  }
  const assigned=new Set<string>(),cycles:ModuleSourceIdentity[][]=[];
  for(const start of order.reverse()) {
    if(assigned.has(start))continue;
    const component:string[]=[],pending=[start];assigned.add(start);
    while(pending.length) {
      const current=pending.pop()!;component.push(current);
      for(const next of reverse.get(current)!)if(!assigned.has(next)){assigned.add(next);pending.push(next);}
    }
    if(component.length>1 || forward.get(start)!.has(start))cycles.push(component.map(id=>byId.get(id)!).sort(compareIdentity));
  }
  return cycles.sort((a,b)=>compareIdentity(a[0],b[0]));
}

/** Resolves only supplied syntax candidates using TypeScript's public resolver.
 * This virtual host has no ambient filesystem/network hooks, Program, checker,
 * execution or runtime/dataflow closure. Configuration inheritance is unresolved. */
export function buildModuleDependencyGraph(request:ModuleGraphRequest): ModuleDependencyGraph {
  validateBlob(request.configuration);for(const blob of request.sources)validateBlob(blob);
  const blobs=[...new Map(request.sources.map(blob=>[key(identity(blob)),blob])).values()].sort((a,b)=>compareIdentity(identity(a),identity(b)));
  const observations:ModuleGraphObservation[]=[];
  const grouped=new Map<string,ModuleSourceBlob[]>();
  for(const blob of blobs){const versions=grouped.get(blob.path) ?? [];versions.push(blob);grouped.set(blob.path,versions);}
  for(const [path,versions] of grouped)if(versions.length>1)observations.push({code:'AMBIGUOUS_SOURCE_PATH',path});
  const config=request.configuration,configDirectory=posix.dirname(virtualPath(config.path));
  const parsed=ts.parseConfigFileTextToJson(config.path,config.text);
  const json:unknown=parsed.config;
  const configObject=json && typeof json==='object' && !Array.isArray(json)?json as Record<string,unknown>:undefined;
  const configIssues:string[]=[];
  const configIssue=(code:string) => {configIssues.push(code);observations.push({code,path:config.path});};
  if(parsed.error)configIssue('TS_CONFIG_'+parsed.error.code);
  if(!configObject)configIssue('CONFIGURATION_OBJECT_REQUIRED');
  if(configObject && 'extends' in configObject)configIssue('EXTENDED_CONFIGURATION_NOT_RESOLVED');
  if(configObject && 'references' in configObject)configIssue('PROJECT_REFERENCES_NOT_RESOLVED');
  const rawOptions=configObject?.compilerOptions;
  const optionObject=rawOptions && typeof rawOptions==='object' && !Array.isArray(rawOptions)?rawOptions as Record<string,unknown>:undefined;
  if(!optionObject)configIssue('EXPLICIT_COMPILER_OPTIONS_REQUIRED');
  const converted=ts.convertCompilerOptionsFromJson(optionObject ?? {},configDirectory,virtualPath(config.path));
  for(const error of converted.errors)configIssue('TS_CONFIG_'+error.code);
  const options=converted.options;
  if(options.moduleResolution===undefined)configIssue('EXPLICIT_MODULE_RESOLUTION_REQUIRED');
  if(options.module===undefined)configIssue('EXPLICIT_MODULE_KIND_REQUIRED');
  const configurationStatus:ModuleDependencyGraph['configurationStatus']=configIssues.length?'UNRESOLVED_CONFIGURATION':'EXPLICIT_CONFIGURATION';
  // convertCompilerOptionsFromJson does not follow config files. The explicit
  // config directory is the paths base via the public host's current directory.
  const hostBlobs=new Map(grouped);
  const configVersions=hostBlobs.get(config.path) ?? [];
  if(!configVersions.some(blob=>blob.sha256===config.sha256))hostBlobs.set(config.path,[...configVersions,config]);
  const directories=new Set([VIRTUAL_ROOT]);
  for(const path of hostBlobs.keys()) {
    let directory=posix.dirname(virtualPath(path));
    while(directory.startsWith(VIRTUAL_ROOT)){directories.add(directory);if(directory===VIRTUAL_ROOT)break;directory=posix.dirname(directory);}
  }
  let ambiguousProbes=new Set<string>(),outsideProbe=false;
  const probe=(fileName:string) => {
    const path=sourcePath(fileName);if(path===undefined){outsideProbe=true;return undefined;}
    const versions=hostBlobs.get(path);if(versions && versions.length>1)ambiguousProbes.add(path);return versions;
  };
  const host:ts.ModuleResolutionHost={
    fileExists:fileName=>Boolean(probe(fileName)?.length),
    readFile:fileName=>{const versions=probe(fileName);return versions?.length===1?versions[0].text:undefined;},
    directoryExists:directory=>directories.has(posix.normalize(directory)),
    getCurrentDirectory:()=>configDirectory,
    getDirectories:directory=>[...directories].filter(candidate=>posix.dirname(candidate)===posix.normalize(directory)).sort(compareText),
    realpath:path=>posix.normalize(path),useCaseSensitiveFileNames:true,
  };
  const nodes:ModuleGraphNode[]=blobs.map(blob=>({...identity(blob),...(/\.[cm]?[jt]sx?$/.test(blob.path)?{inventory:inventorySourceCandidates(blob.path,blob.text)}:{})}));
  const edges:ModuleDependencyEdge[]=[];
  for(let index=0;index<blobs.length;index++) {
    const blob=blobs[index],node=nodes[index],inventory=node.inventory;if(!inventory)continue;
    for(const observation of inventory.observations)observations.push({...observation,path:blob.path});
    const candidates:ModuleDependencyEdge['candidate'][]=[...inventory.imports];
    const usages=new Map<number,ts.StringLiteralLike>();
    let file:ts.SourceFile | undefined;
    // Reuse the consumer bounds before the supplementary reexport/mode parse.
    if(!inventory.observations.some(item=>['SOURCE_SIZE_LIMIT','AST_PARSE_FAILURE'].includes(item.code))) {
      try {file=ts.createSourceFile(virtualPath(blob.path),blob.text,ts.ScriptTarget.ES2017,true);}
      catch {observations.push({code:'MODULE_AST_PARSE_FAILURE',path:blob.path});}
    }
    if(file) {
      const pending:ts.Node[]=[file];let count=0;
      while(pending.length) {
        const ast=pending.pop()!;
        if(count++===50_000){observations.push({code:'MODULE_AST_NODE_LIMIT',path:blob.path});break;}
        let usage:ts.StringLiteralLike | undefined;
        if((ts.isImportDeclaration(ast) || ts.isExportDeclaration(ast)) && ast.moduleSpecifier && ts.isStringLiteralLike(ast.moduleSpecifier))usage=ast.moduleSpecifier;
        else if(ts.isImportEqualsDeclaration(ast) && ts.isExternalModuleReference(ast.moduleReference) && ast.moduleReference.expression && ts.isStringLiteralLike(ast.moduleReference.expression))usage=ast.moduleReference.expression;
        else if(ts.isCallExpression(ast) && ast.arguments.length===1 && ts.isStringLiteralLike(ast.arguments[0]))usage=ast.arguments[0];
        if(usage)usages.set(ast.getStart(file),usage);
        if(ts.isExportDeclaration(ast) && usage) {
          const start=ast.getStart(file),end=ast.end;
          candidates.push({kind:'REEXPORT',moduleSpecifier:usage.text,typeOnly:ast.isTypeOnly,span:{startOffset:start,endOffset:end,startByte:Buffer.byteLength(blob.text.slice(0,start)),endByte:Buffer.byteLength(blob.text.slice(0,end)),startLine:file.getLineAndCharacterOfPosition(start).line+1,endLine:file.getLineAndCharacterOfPosition(Math.max(start,end-1)).line+1}});
        }
        ts.forEachChild(ast,child=>{pending.push(child);});
      }
    }
    for(const candidate of candidates.sort((a,b)=>a.span.startOffset-b.span.startOffset)) {
      const edge:ModuleDependencyEdge={from:identity(blob),candidate,dependencyKind:candidate.kind==='DYNAMIC_IMPORT' || candidate.moduleSpecifier===undefined?'DYNAMIC_CANDIDATE':'STATIC_CANDIDATE',resolution:'UNRESOLVED',candidateTargets:[],observationCodes:[]};
      edges.push(edge);
      if(edge.dependencyKind==='DYNAMIC_CANDIDATE')edge.observationCodes.push(candidate.moduleSpecifier===undefined?'DYNAMIC_MODULE_SPECIFIER':'DYNAMIC_IMPORT');
      if(candidate.moduleSpecifier===undefined)continue;
      if(configurationStatus==='UNRESOLVED_CONFIGURATION'){edge.observationCodes.push('CONFIGURATION_UNRESOLVED');continue;}
      if(candidate.kind==='REQUIRE_CANDIDATE' && inventory.observations.some(item=>item.code==='SHADOWED_REQUIRE' && item.span.startOffset===candidate.span.startOffset && item.span.endOffset===candidate.span.endOffset)){edge.observationCodes.push('SHADOWED_REQUIRE');continue;}
      const usage=usages.get(candidate.span.startOffset);
      if(!file || !usage){edge.observationCodes.push('MODULE_USAGE_UNRESOLVED');continue;}
      ambiguousProbes=new Set();outsideProbe=false;
      try {
        file.impliedNodeFormat=ts.getImpliedNodeFormatForFile(file.fileName,undefined,host,options);
        const mode=ts.getModeForUsageLocation(file,usage,options);
        if(mode!==undefined)edge.resolutionMode=mode===ts.ModuleKind.CommonJS?'REQUIRE':'IMPORT';
        const resolved=ts.resolveModuleName(candidate.moduleSpecifier,file.fileName,options,host,undefined,undefined,mode).resolvedModule;
        const resolvedPath=resolved?sourcePath(resolved.resolvedFileName):undefined;
        const targets=resolvedPath?grouped.get(resolvedPath) ?? []:[];
        const ambiguousTargets=[...ambiguousProbes].flatMap(path=>hostBlobs.get(path) ?? []);
        edge.candidateTargets=[...new Map([...targets,...ambiguousTargets].map(target=>[key(identity(target)),identity(target)])).values()].sort(compareIdentity);
        if(ambiguousProbes.size || targets.length>1){edge.resolution='AMBIGUOUS';edge.observationCodes.push('AMBIGUOUS_SUPPLIED_RESOLUTION');}
        else if(resolved && targets.length===1) {
          if(resolved.isExternalLibraryImport || resolvedPath?.startsWith('node_modules/') || resolvedPath?.includes('/node_modules/')){edge.resolution='EXTERNAL';edge.observationCodes.push('EXTERNAL_DEPENDENCY_NOT_CLOSED');}
          else {edge.resolution='RESOLVED_CANDIDATE';edge.target=identity(targets[0]);}
        }else {
          const specifier=candidate.moduleSpecifier;
          const configuredMapping=Object.keys(options.paths ?? {}).some(pattern=>{
            const star=pattern.indexOf('*');return star<0?pattern===specifier:specifier.startsWith(pattern.slice(0,star)) && specifier.endsWith(pattern.slice(star+1));
          });
          const local=specifier.startsWith('.') || specifier.startsWith('/') || configuredMapping;
          edge.resolution=local?'MISSING':'EXTERNAL';edge.observationCodes.push(local?'MISSING_SUPPLIED_TARGET':'EXTERNAL_DEPENDENCY_NOT_CLOSED');
        }
      }catch {edge.resolution='UNRESOLVED';edge.observationCodes.push('TYPESCRIPT_RESOLVER_FAILURE');}
      if(outsideProbe)edge.observationCodes.push('OUTSIDE_SUPPLIED_ROOT_LOOKUP_DENIED');
    }
  }
  edges.sort((a,b)=>compareIdentity(a.from,b.from) || a.candidate.span.startOffset-b.candidate.span.startOffset);
  observations.sort((a,b)=>compareText(a.path ?? '',b.path ?? '') || (a.span?.startOffset ?? 0)-(b.span?.startOffset ?? 0) || compareText(a.code,b.code));
  return {
    nodes,edges,cycles:candidateCycles(nodes,edges),observations,
    provenance:{sourceSetSha256:digest(JSON.stringify(blobs.map(identity))),configuration:identity(config),typescriptVersion:ts.version,virtualHost:'SUPPLIED_BLOBS_ONLY',caseSensitive:true},configurationStatus,
    analysis:'STATIC_MODULE_CANDIDATES_ONLY',moduleExecution:'NOT_PERFORMED',transitiveDataflow:'NOT_PERFORMED',sqlSinks:'NOT_CLASSIFIED',tenantOwnership:'NOT_CLASSIFIED',completeness:'NOT_CLAIMED',
  };
}
