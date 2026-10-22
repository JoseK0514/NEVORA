import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REVIEW_PATH='docs/product/reviews/50-inspectors-2026-10-21';
const SOURCE_COMMIT='39ee9d1dbfd9e69dee8ffdfe9662465919e1aa33';
const SOURCE_TREE='fa1e9d3cb6c95f2f2f4cd7b51aa701224bb19385';

export function validateArchive(repoRoot,manifest) {
  const validCount=value=>Number.isSafeInteger(value)&&value>0;
  const safePath=path=>typeof path==='string'&&path.length>0&&!path.includes('\\')&&!path.includes('\0')&&
    !path.startsWith('/')&&path.split('/').every(part=>part!=='.'&&part!=='..'&&part!=='');
  if(!manifest||manifest.schema!==1||manifest.root!==REVIEW_PATH||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit??'')||!/^[a-f0-9]{40}$/.test(manifest.sourceTree??'')||
    ![manifest.fileCount,manifest.reportCount,manifest.shotCount].every(validCount)||
    !manifest.files||typeof manifest.files!=='object'||Array.isArray(manifest.files)||
    !Object.entries(manifest.files).every(([path,hash])=>safePath(path)&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash))) {
    throw new Error('Invalid archive manifest');
  }
  const root=join(repoRoot,REVIEW_PATH);
  let parent=repoRoot;
  for(const part of REVIEW_PATH.split('/')) {
    parent=join(parent,part);
    if(!lstatSync(parent).isDirectory())throw new Error('Archive contains a non-regular entry');
  }
  const files=[];
  function walk(directory,prefix='') {
    for(const name of readdirSync(directory)) {
      const relative=prefix+name;
      const path=join(directory,name);
      const stat=lstatSync(path);
      if(stat.isDirectory())walk(path,relative+'/');
      else if(stat.isFile())files.push(relative);
      else throw new Error('Archive contains a non-regular entry');
    }
  }
  walk(root);
  const expected=Object.keys(manifest.files).sort();
  files.sort();
  if(files.length!==manifest.fileCount||files.length!==expected.length||files.some((path,i)=>path!==expected[i])) {
    throw new Error('Archive inventory changed');
  }
  for(const path of files) {
    const hash=createHash('sha256').update(readFileSync(join(root,path))).digest('hex');
    if(hash!==manifest.files[path])throw new Error('Archive content changed: '+path);
  }
  const reports=files.filter(path=>path.startsWith('reports/'));
  const numbers=reports.map(path=>/^reports\/(\d{2})-[^/]+\.md$/.exec(path)?.[1]);
  if(reports.length!==manifest.reportCount||numbers.some((number,i)=>number!==String(i+1).padStart(2,'0'))) {
    throw new Error('Report sequence changed');
  }
  const shots=files.filter(path=>path.startsWith('shots/')&&path.endsWith('.png')).length;
  if(shots!==manifest.shotCount)throw new Error('Screenshot inventory changed');
  return {files:files.length,reports:reports.length,shots};
}

function main() {
  const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const manifest=JSON.parse(readFileSync(join(repoRoot,REVIEW_PATH+'.custody.json'),'utf8'));
  if(manifest.sourceCommit!==SOURCE_COMMIT||manifest.sourceTree!==SOURCE_TREE)throw new Error('Original archive identity changed');
  for(const revision of [SOURCE_COMMIT,'HEAD']) {
    const tree=execFileSync('git',['rev-parse',revision+':'+REVIEW_PATH],{cwd:repoRoot,encoding:'utf8'}).trim();
    if(tree!==SOURCE_TREE)throw new Error('Original archive Git tree changed');
  }
  const result=validateArchive(repoRoot,manifest);
  process.stdout.write(JSON.stringify({status:'PASS',...result,sourceCommit:SOURCE_COMMIT,sourceTree:SOURCE_TREE,
    scope:'Historical archive custody only; no findings acceptance or probe execution'})+'\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
