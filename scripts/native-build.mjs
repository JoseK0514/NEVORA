import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,openSync,closeSync,readFileSync,writeFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {join,relative} from 'node:path';
import {captureSource,assertSourceUnchanged} from './phase-e-owned.mjs';

export async function runNativeSdkProcess({command,args,cwd,env,fd,signal,timeoutMs=300000,terminationGraceMs=5000,launch=spawn}) {
  signal.throwIfAborted();
  return await new Promise((ready,reject)=>{
    const abort=AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]);
    let failure,closed=false,settled=false,timer;
    const child=launch(command,args,{cwd,env,stdio:['ignore',fd,fd],signal:abort});
    const lease={pid:child.pid,command,cwd,ownerId:env?.NEVORA_OWNED_PROCESS_OWNER};
    const finish=(error)=>{
      if(settled)return;settled=true;clearTimeout(timer);abort.removeEventListener('abort',cancelled);
      if(error){
        error.nativeBuildOwnershipClosed=false;
        error.buildProcessExited=closed;error.buildProcessLease=lease;
        reject(error);
      }else ready({buildProcessExited:true});
    };
    const cancelled=()=>{
      failure=Error('Native SDK cancelled; descendant ownership requires audit');
      if(!timer)timer=setTimeout(()=>{child.unref();finish(failure);},terminationGraceMs);
    };
    child.on('error',error=>{
      failure=error;
      if(!child.pid){closed=true;finish(error);}
      else if(abort.aborted)cancelled();
    });
    child.once('close',(code)=>{
      closed=true;
      finish(failure??(abort.aborted?Error('Native SDK cancelled; descendant ownership requires audit'):code===0?undefined:Error('Native SDK preparation failed; descendant ownership requires audit')));
    });
    abort.addEventListener('abort',cancelled,{once:true});
    if(abort.aborted)cancelled();
  });
}

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
    await runNativeSdkProcess({command,args,cwd:platform==='android'?join(source,'native/android'):source,env:sdkEnv,fd,signal});
  } catch(error) {
    // A direct child closing does not prove a Gradle/Xcode descendant exited.
    // Preserve a private audit receipt and fail ownership closure rather than
    // signaling unverified shared SDK services or reporting a false cleanup.
    error.nativeBuildOwnershipClosed=false;
    writeFileSync(join(root,platform+'-prebuild-lifetime.json'),JSON.stringify({ownerId,checkpoint,platform,
      ownershipClosed:false,buildProcessExited:error.buildProcessExited===true,lease:error.buildProcessLease??null},null,2),{mode:0o600});
    throw error;
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
