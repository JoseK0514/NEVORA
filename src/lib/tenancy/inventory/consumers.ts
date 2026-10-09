import ts from 'typescript';

export type CandidateSpan = { startOffset: number; endOffset: number; startByte: number; endByte: number; startLine: number; endLine: number };
export type SourceCategory = 'APPLICATION' | 'SCRIPT' | 'TEST' | 'FIXTURE';
export type CandidateObservation = { code: string; span: CandidateSpan };
export type ImportCandidate = { kind: 'STATIC_IMPORT' | 'SIDE_EFFECT_IMPORT' | 'IMPORT_EQUALS' | 'REQUIRE_CANDIDATE' | 'DYNAMIC_IMPORT'; moduleSpecifier?: string; typeOnly: boolean; span: CandidateSpan };
export type ImportBindingCandidate = { kind: 'IMPORT' | 'IMPORT_EQUALS' | 'REQUIRE_CANDIDATE'; localName: string; importedName: string; moduleSpecifier: string; typeOnly: boolean; span: CandidateSpan };
export type CallResolution = 'IMPORT_BINDING' | 'UNRESOLVED_IDENTIFIER' | 'LOCAL_BINDING' | 'TYPE_ONLY_BINDING' | 'MUTATED_BINDING' | 'AMBIGUOUS_BINDING' | 'DYNAMIC_MEMBER' | 'INDIRECT_RECEIVER' | 'MODULE_LOAD_CANDIDATE';
export type CallCandidate = { kind: 'CALL' | 'TAGGED_TEMPLATE' | 'CONSTRUCT'; target: string; resolution: CallResolution; members: string[]; binding?: ImportBindingCandidate; span: CandidateSpan; targetSpan: CandidateSpan };
export type SqlFragmentCandidate = { leadingKeyword: string; staticParts: string[]; composition: 'LITERAL' | 'TEMPLATE_INTERPOLATION' | 'CONCATENATED'; interpolations: CandidateSpan[]; span: CandidateSpan };
export type SourceCandidateInventory = {
  path: string; sourceCategory: SourceCategory; bindings: ImportBindingCandidate[]; imports: ImportCandidate[]; calls: CallCandidate[]; fragments: SqlFragmentCandidate[]; observations: CandidateObservation[];
  analysis: 'INERT_AST_CANDIDATES_ONLY'; transitiveClosure: 'NOT_PERFORMED'; sqlSinks: 'NOT_CLASSIFIED'; tenantOwnership: 'NOT_CLASSIFIED'; completeness: 'NOT_CLAIMED';
};

const SOURCE_BYTE_LIMIT = 1024 * 1024;
const AST_NODE_LIMIT = 50_000;
type Scope = { kind: 'FILE' | 'FUNCTION' | 'CLASS' | 'BLOCK'; parent?: Scope; names: Map<string, { binding?: ImportBindingCandidate; mutated: boolean; ambiguous: boolean }> };
const compare = (a: { span: CandidateSpan }, b: { span: CandidateSpan }) => a.span.startOffset - b.span.startOffset || a.span.endOffset - b.span.endOffset;
const sourceCategory = (path: string): SourceCategory => {
  const normalized = '/' + path.replace(/\\/g, '/');
  if (/\/fixtures?\/|\.fixture\.[cm]?[jt]sx?$/.test(normalized)) return 'FIXTURE';
  if (/\/(?:test|tests|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized)) return 'TEST';
  return /\/scripts\//.test(normalized) ? 'SCRIPT' : 'APPLICATION';
};
const unwrap = (expression: ts.Expression): ts.Expression => {
  while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression) || ts.isSatisfiesExpression(expression)) expression = expression.expression;
  return expression;
};
function targetParts(expression: ts.Expression): { root?: ts.Identifier; members: string[]; dynamic: boolean } {
  expression = unwrap(expression);
  const members: string[] = [];
  let dynamic = false;
  while (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression)) members.unshift(expression.name.text);
    else if (expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression)) members.unshift(expression.argumentExpression.text);
    else dynamic = true;
    expression = unwrap(expression.expression);
  }
  return { ...(ts.isIdentifier(expression) ? { root: expression } : {}), members, dynamic };
}

/** Parses supplied inert text only. No program/type checker, module resolution,
 * filesystem access, imported-code execution, SQL validity or dataflow closure.
 * Binding facts are syntax candidates; local aliases and runtime results remain
 * unresolved. SQL fragments use a bounded leading-keyword heuristic, not sinks. */
export function inventorySourceCandidates(path: string, text: string): SourceCandidateInventory {
  const result: SourceCandidateInventory = { path, sourceCategory: sourceCategory(path), bindings: [], imports: [], calls: [], fragments: [], observations: [], analysis: 'INERT_AST_CANDIDATES_ONLY', transitiveClosure: 'NOT_PERFORMED', sqlSinks: 'NOT_CLASSIFIED', tenantOwnership: 'NOT_CLASSIFIED', completeness: 'NOT_CLAIMED' };
  if (Buffer.byteLength(text,'utf8') > SOURCE_BYTE_LIMIT) {
    result.observations.push({code:'SOURCE_SIZE_LIMIT',span:{startOffset:0,endOffset:0,startByte:0,endByte:0,startLine:1,endLine:1}}); return result;
  }
  const byteOffsets = new Array<number>(text.length + 1);
  let bytes = 0;
  for (let index = 0; index < text.length;) {
    byteOffsets[index] = bytes;
    const point = text.codePointAt(index)!; const width = point > 0xffff ? 2 : 1;
    if (width === 2) byteOffsets[index + 1] = bytes;
    bytes += Buffer.byteLength(String.fromCodePoint(point)); index += width;
  }
  byteOffsets[text.length] = bytes;
  if (!/\.[cm]?[jt]sx?$/.test(path)) {
    result.observations.push({code:'UNSUPPORTED_SOURCE_KIND',span:{startOffset:0,endOffset:0,startByte:0,endByte:0,startLine:1,endLine:1}}); return result;
  }
  const kind = /\.tsx$/.test(path) ? ts.ScriptKind.TSX : /\.jsx$/.test(path) ? ts.ScriptKind.JSX : /\.[cm]?js$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  let file: ts.SourceFile;
  try { file = ts.createSourceFile(path, text, ts.ScriptTarget.ES2017, true, kind); }
  catch { result.observations.push({code:'AST_PARSE_FAILURE',span:{startOffset:0,endOffset:0,startByte:0,endByte:0,startLine:1,endLine:1}}); return result; }
  const spanAt = (start: number, end: number): CandidateSpan => {
    start = Math.max(0, Math.min(start,text.length)); end = Math.max(start,Math.min(end,text.length));
    return { startOffset:start,endOffset:end,startByte:byteOffsets[start],endByte:byteOffsets[end],startLine:file.getLineAndCharacterOfPosition(start).line+1,endLine:file.getLineAndCharacterOfPosition(Math.max(start,end-1)).line+1 };
  };
  const span = (node: ts.Node) => spanAt(node.getStart(file),node.end);
  const observe = (code: string, node: ts.Node) => result.observations.push({code,span:span(node)});
  // createSourceFile's installed runtime retains parse diagnostics. The public
  // SourceFile type omits this field; absence is an explicit unresolved fact.
  const diagnostics = (file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (!diagnostics) result.observations.push({code:'PARSE_DIAGNOSTICS_UNAVAILABLE',span:spanAt(0,0)});
  else for (const diagnostic of diagnostics) result.observations.push({code:`TS_PARSE_${diagnostic.code}`,span:spanAt(diagnostic.start ?? 0,(diagnostic.start ?? 0)+(diagnostic.length ?? 0))});
  const root: Scope = {kind:'FILE',names:new Map()};
  const scopes = new Map<ts.Node,Scope>();
  const nodes: ts.Node[] = [];
  const stack: {node:ts.Node;scope:Scope}[] = [{node:file,scope:root}];
  while (stack.length) {
    const item = stack.pop()!;
    if (nodes.length === AST_NODE_LIMIT) { observe('AST_NODE_LIMIT',item.node); break; }
    const scoped = ts.isFunctionLike(item.node) ? {kind:'FUNCTION' as const,parent:item.scope,names:new Map()} : ts.isClassDeclaration(item.node) || ts.isClassExpression(item.node) ? {kind:'CLASS' as const,parent:item.scope,names:new Map()} : ts.isBlock(item.node) || ts.isCatchClause(item.node) || ts.isForStatement(item.node) || ts.isForOfStatement(item.node) || ts.isForInStatement(item.node) ? {kind:'BLOCK' as const,parent:item.scope,names:new Map()} : item.scope;
    scopes.set(item.node,scoped); nodes.push(item.node);
    const children: ts.Node[] = []; ts.forEachChild(item.node,child => {children.push(child);});
    for (let index=children.length-1;index>=0;index--) stack.push({node:children[index],scope:scoped});
  }
  const declare = (scope: Scope, name: string) => {
    const existing = scope.names.get(name);
    if (existing) existing.ambiguous = true;
    else scope.names.set(name,{mutated:false,ambiguous:false});
  };
  const names = (name: ts.BindingName): ts.Identifier[] => {
    if (ts.isIdentifier(name)) return [name];
    const found: ts.Identifier[] = [];
    for (const element of name.elements) if (ts.isBindingElement(element)) found.push(...names(element.name));
    return found;
  };
  const lookup = (scope:Scope | undefined,name:string): ReturnType<Scope['names']['get']> => {
    while(scope) { const entry=scope.names.get(name); if(entry)return entry; scope=scope.parent; } return undefined;
  };
  const functionScope = (scope:Scope) => {while(scope.kind==='BLOCK' && scope.parent)scope=scope.parent;return scope;};
  const binding = (scope:Scope,name:ts.Identifier,origin:Omit<ImportBindingCandidate,'localName'|'span'>) => {
    const candidate={...origin,localName:name.text,span:span(name)}; result.bindings.push(candidate);
    const entry=scope.names.get(name.text)!; entry.binding=candidate;
  };
  const modules = new Set<ts.Node>();
  const variables: {node:ts.VariableDeclaration;scope:Scope}[] = [];
  for(const node of nodes) {
    const scope=scopes.get(node)!;
    if(ts.isImportDeclaration(node)) {
      if(!ts.isStringLiteralLike(node.moduleSpecifier)) {observe('DYNAMIC_MODULE_SPECIFIER',node);continue;}
      modules.add(node.moduleSpecifier); const moduleSpecifier=node.moduleSpecifier.text; const clause=node.importClause;
      result.imports.push({kind:clause?'STATIC_IMPORT':'SIDE_EFFECT_IMPORT',moduleSpecifier,typeOnly:clause?.isTypeOnly ?? false,span:span(node)});
      if(clause?.name){declare(scope,clause.name.text);binding(scope,clause.name,{kind:'IMPORT',moduleSpecifier,importedName:'default',typeOnly:clause.isTypeOnly});}
      const imported=clause?.namedBindings;
      if(imported && ts.isNamespaceImport(imported)){declare(scope,imported.name.text);binding(scope,imported.name,{kind:'IMPORT',moduleSpecifier,importedName:'*',typeOnly:clause!.isTypeOnly});}
      else if(imported && ts.isNamedImports(imported)) for(const element of imported.elements){declare(scope,element.name.text);binding(scope,element.name,{kind:'IMPORT',moduleSpecifier,importedName:(element.propertyName ?? element.name).text,typeOnly:clause!.isTypeOnly || element.isTypeOnly});}
    } else if(ts.isImportEqualsDeclaration(node)) {
      declare(scope,node.name.text);
      if(ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
        const moduleSpecifier=node.moduleReference.expression.text;modules.add(node.moduleReference.expression);
        result.imports.push({kind:'IMPORT_EQUALS',moduleSpecifier,typeOnly:node.isTypeOnly,span:span(node)}); binding(scope,node.name,{kind:'IMPORT_EQUALS',moduleSpecifier,importedName:'*',typeOnly:node.isTypeOnly});
      }else observe('UNRESOLVED_IMPORT_EQUALS',node);
    } else if(ts.isVariableDeclaration(node)) {
      const owner=ts.isVariableDeclarationList(node.parent) && !(node.parent.flags & ts.NodeFlags.BlockScoped) && !ts.isCatchClause(node.parent) ? functionScope(scope) : scope;
      for(const name of names(node.name))declare(owner,name.text); variables.push({node,scope:owner});
    } else if(ts.isParameter(node)) {for(const name of names(node.name))declare(scope,name.text);}
    else if((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name)declare(ts.isFunctionDeclaration(node)?scope.parent ?? scope:scope,node.name.text);
    else if((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name)declare(ts.isClassDeclaration(node)?scope.parent ?? scope:scope,node.name.text);
    else if(ts.isEnumDeclaration(node))declare(scope,node.name.text);
  }
  const requireOrigin = (expression:ts.Expression): {call:ts.CallExpression;module:string;members:string[]} | undefined => {
    const parts:string[]=[];expression=unwrap(expression);
    while(ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      if(ts.isPropertyAccessExpression(expression))parts.unshift(expression.name.text);
      else if(expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression))parts.unshift(expression.argumentExpression.text);
      else return undefined;
      expression=unwrap(expression.expression);
    }
    if(!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression) || expression.expression.text!=='require' || expression.arguments.length!==1 || !ts.isStringLiteralLike(expression.arguments[0]))return undefined;
    if(lookup(scopes.get(expression), 'require'))return undefined;
    return {call:expression,module:expression.arguments[0].text,members:parts};
  };
  for(const {node,scope} of variables) {
    if(!node.initializer)continue;const origin=requireOrigin(node.initializer);if(!origin)continue;
    const base={kind:'REQUIRE_CANDIDATE' as const,moduleSpecifier:origin.module,typeOnly:false};
    if(ts.isIdentifier(node.name))binding(scope,node.name,{...base,importedName:origin.members.length?origin.members.join('.'):'*'});
    else if(ts.isObjectBindingPattern(node.name))for(const element of node.name.elements) {
      if(element.dotDotDotToken || !ts.isIdentifier(element.name) || (element.propertyName && !ts.isIdentifier(element.propertyName) && !ts.isStringLiteralLike(element.propertyName))){observe('UNSUPPORTED_REQUIRE_BINDING',element);continue;}
      binding(scope,element.name,{...base,importedName:[...origin.members,(element.propertyName ?? element.name).text].join('.')});
    }else observe('UNSUPPORTED_REQUIRE_BINDING',node.name);
  }
  const observedAssignmentTargets = new Set<ts.Node>();
  const visitAssignmentTarget = (target:ts.Expression,scope:Scope | undefined) => {
    const pending:ts.Expression[]=[target];
    while(pending.length) {
      const assigned=unwrap(pending.pop()!);
      if(observedAssignmentTargets.has(assigned))continue;
      observedAssignmentTargets.add(assigned);
      if(ts.isIdentifier(assigned)) {
        const entry=lookup(scope,assigned.text);
        if(entry?.binding){entry.mutated=true;observe('BINDING_MUTATION',assigned);}
      }else if(ts.isObjectLiteralExpression(assigned)) {
        // Property names and computed keys read values; only their destinations
        // are assigned. A shorthand's default expression is also only a read.
        for(const property of assigned.properties) {
          if(ts.isShorthandPropertyAssignment(property))pending.push(property.name);
          else if(ts.isPropertyAssignment(property))pending.push(property.initializer);
          else if(ts.isSpreadAssignment(property))pending.push(property.expression);
          else observe('ASSIGNMENT_TARGET_UNRESOLVED',property);
        }
      }else if(ts.isArrayLiteralExpression(assigned)) {
        for(const element of assigned.elements)if(!ts.isOmittedExpression(element))pending.push(element);
      }else if(ts.isSpreadElement(assigned))pending.push(assigned.expression);
      else if(ts.isBinaryExpression(assigned) && assigned.operatorToken.kind===ts.SyntaxKind.EqualsToken)pending.push(assigned.left);
      else if(ts.isPropertyAccessExpression(assigned) || ts.isElementAccessExpression(assigned)) {
        // A member write does not rebind its receiver. Its runtime effect stays
        // unresolved rather than implying that the imported identifier changed.
        observe('MEMBER_ASSIGNMENT_UNRESOLVED',assigned);
      }else observe('ASSIGNMENT_TARGET_UNRESOLVED',assigned);
    }
  };
  for(const node of nodes) {
    let target:ts.Expression | undefined;
    if(ts.isBinaryExpression(node) && node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment && node.operatorToken.kind<=ts.SyntaxKind.LastAssignment)target=node.left;
    else if((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator===ts.SyntaxKind.PlusPlusToken || node.operator===ts.SyntaxKind.MinusMinusToken))target=node.operand;
    else if((ts.isForOfStatement(node) || ts.isForInStatement(node)) && !ts.isVariableDeclarationList(node.initializer))target=node.initializer;
    if(target)visitAssignmentTarget(target,scopes.get(node));
  }
  const classify = (expression:ts.Expression,node:ts.Node): Pick<CallCandidate,'resolution'|'members'|'binding'> => {
    const parts=targetParts(expression);const entry=parts.root?lookup(scopes.get(node),parts.root.text):undefined;
    const base={members:parts.members,...(entry?.binding?{binding:entry.binding}:{})};
    if(parts.dynamic){observe('DYNAMIC_MEMBER',expression);return {...base,resolution:'DYNAMIC_MEMBER'};}
    if(!parts.root){observe('INDIRECT_RECEIVER',expression);return {...base,resolution:'INDIRECT_RECEIVER'};}
    if(entry?.ambiguous){observe('AMBIGUOUS_BINDING',expression);return {...base,resolution:'AMBIGUOUS_BINDING'};}
    if(entry?.mutated){observe('MUTATED_BINDING',expression);return {...base,resolution:'MUTATED_BINDING'};}
    if(entry?.binding?.typeOnly){observe('TYPE_ONLY_RUNTIME_REFERENCE',expression);return {...base,resolution:'TYPE_ONLY_BINDING'};}
    if(entry?.binding)return {...base,resolution:'IMPORT_BINDING'};
    observe(entry?'LOCAL_BINDING_UNRESOLVED':'UNRESOLVED_IDENTIFIER',expression);return {...base,resolution:entry?'LOCAL_BINDING':'UNRESOLVED_IDENTIFIER'};
  };
  for(const node of nodes) {
    if(ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text==='require') || node.expression.kind===ts.SyntaxKind.ImportKeyword)) {
      const dynamic=node.expression.kind===ts.SyntaxKind.ImportKeyword;
      const argument=node.arguments.length===1 && ts.isStringLiteralLike(node.arguments[0])?node.arguments[0]:undefined;
      if(argument)modules.add(argument);
      result.imports.push({kind:dynamic?'DYNAMIC_IMPORT':'REQUIRE_CANDIDATE',...(argument?{moduleSpecifier:argument.text}:{}),typeOnly:false,span:span(node)});
      if(!argument)observe('DYNAMIC_MODULE_SPECIFIER',node);if(dynamic)observe('DYNAMIC_IMPORT',node);
      if(!dynamic && lookup(scopes.get(node),'require'))observe('SHADOWED_REQUIRE',node);
      result.calls.push({kind:'CALL',target:node.expression.getText(file),resolution:'MODULE_LOAD_CANDIDATE',members:[],span:span(node),targetSpan:span(node.expression)});
    }else if(ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node)) {
      const expression=ts.isTaggedTemplateExpression(node)?node.tag:node.expression;
      result.calls.push({kind:ts.isTaggedTemplateExpression(node)?'TAGGED_TEMPLATE':ts.isNewExpression(node)?'CONSTRUCT':'CALL',target:expression.getText(file),...classify(expression,node),span:span(node),targetSpan:span(expression)});
    }
    if((ts.isStringLiteralLike(node) && !modules.has(node)) || ts.isTemplateExpression(node)) {
      const staticParts=ts.isTemplateExpression(node)?[node.head.text,...node.templateSpans.map(part=>part.literal.text)]:[node.text];
      const keyword=staticParts[0].trimStart().match(/^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMENT|BEGIN|COMMIT|ROLLBACK|WHERE|FROM|JOIN|RETURNING|ORDER|GROUP|HAVING|LIMIT|VALUES|SET)\b/i)?.[1];
      if(!keyword)continue;
      const interpolations=ts.isTemplateExpression(node)?node.templateSpans.map(part=>span(part.expression)):[];
      let parent=node.parent;while(ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent))parent=parent.parent;
      const concatenated=ts.isBinaryExpression(parent) && parent.operatorToken.kind===ts.SyntaxKind.PlusToken;
      const composition=interpolations.length?'TEMPLATE_INTERPOLATION' as const:concatenated?'CONCATENATED' as const:'LITERAL' as const;
      result.fragments.push({leadingKeyword:keyword.toUpperCase(),staticParts,composition,interpolations,span:span(node)});
      if(composition!=='LITERAL')observe('DYNAMIC_SQL_FRAGMENT',node);
    }
  }
  result.bindings.sort(compare);result.imports.sort(compare);result.calls.sort(compare);result.fragments.sort(compare);
  result.observations.sort((a,b)=>compare(a,b) || (a.code<b.code?-1:a.code>b.code?1:0));
  return result;
}
