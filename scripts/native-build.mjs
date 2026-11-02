import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,openSync,closeSync,readFileSync,writeFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join,relative} from 'node:path';
import {captureSource,assertSourceUnchanged} from './phase-e-owned.mjs';

// SDK daemons manage their own process groups. Compile before the separately
// supervised server/browser lifetime; never weaken that runtime's identity fence.
export async function prepareNativeBuild({source,root,ownerId,checkpoint,platform,env,signal}) {
  assert(['android','ios'].includes(platform));assert.match(ownerId,/^[a-f0-9]{32}$/);
  assert.equal(realpathSync(root),root);assert.equal(readFileSync(join(root,'native-owner'),'utf8'),ownerId);
  assert.equal(lstatSync(root).uid,process.getuid());
  const custody=captureSource(source,checkpoint),directory=join(root,platform+'-prebuilt');mkdirSync(directory);
  const sdkEnv={...env,NEVORA_OWNED_PROCESS_OWNER:ownerId};
  const command=platform==='android'?join(source,'native/android/gradlew'):'xcodebuild';
  const args=platform==='android'?['--no-daemon','--project-cache-dir',join(root,'android-gradle-cache'),'-PnevoraBuildDirectory='+directory,':app:assembleDebug',':app:assembleDebugAndroidTest']
    :['-project',join(source,'native/ios/NEVORA.xcodeproj'),'-scheme','NEVORA','-configuration','Debug','-destination','generic/platform=iOS Simulator','-derivedDataPath',join(directory,'DerivedData'),'CODE_SIGNING_ALLOWED=NO','build-for-testing'];
  const fd=openSync(join(root,platform+'-prebuild.log'),'wx',0o600);
  try {
    await new Promise((ready,reject)=>{
      const abort=AbortSignal.any([signal,AbortSignal.timeout(300000)]);
      const child=spawn(command,args,{cwd:platform==='android'?join(source,'native/android'):source,env:sdkEnv,stdio:['ignore',fd,fd],signal:abort});
      child.once('error',reject);child.once('exit',code=>code===0?ready():reject(Error(platform+' preparation failed; see prebuild log')));
    });
  } finally {closeSync(fd);}
  assertSourceUnchanged(source,custody);
  const artifacts=[];
  function file(path){
    assert(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink());
    assert.equal(realpathSync(path),path);
    artifacts.push({path:relative(root,path),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
  }
  if(platform==='android')for(const name of ['outputs/apk/debug/app-debug.apk','outputs/apk/androidTest/debug/app-debug-androidTest.apk'])file(join(directory,name));
  else {
    const visit=path=>{for(const entry of readdirSync(path,{withFileTypes:true})){assert(!entry.isSymbolicLink(),'SDK artifact symlink requires explicit review');const target=join(path,entry.name);if(entry.isDirectory())visit(target);else file(target);}};
    visit(join(directory,'DerivedData/Build/Products'));
  }
  assert(artifacts.length>=2);
  const receipt={ownerId,checkpoint,platform,artifacts};
  writeFileSync(join(root,platform+'-build-receipt.json'),JSON.stringify(receipt,null,2),{mode:0o600});
  return {platform,checkpoint,artifacts:artifacts.length};
}
