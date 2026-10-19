#!/usr/bin/env python3
"""Reuse Wave B's private launcher stager; add only Wave A's in-memory PIN context.
Default is static dry-run. No mode starts a process or connects to a database.
"""
from pathlib import Path
import argparse,hashlib,json,os,subprocess

here=Path(__file__).resolve().parent
sha='cd764f614be8ca5b5215be19d46e07cf968638d7'
parser=argparse.ArgumentParser()
parser.add_argument('--out',default='/workspace/nevora-inspection-runtime/private-wave-a-cd764f6')
parser.add_argument('--materialize',action='store_true')
args=parser.parse_args()
out=Path(args.out).resolve()
stager=Path('/workspace/nevora-inspections/p35-wave-b/remaining-exit-joblist/scripts/stage-private-before-listen.py')
cmd=['python3',str(stager),'--source','/workspace/exit-wave-a-cd764f6','--sha',sha,'--out',str(out),'--initializer',str(here/'initial-fixture.mts'),'--export','seedInitialWaveA']
if args.materialize:
 assert os.environ.get('READY_REVIEW_RELEASED_SHA')==sha
 cmd.append('--materialize')
result=subprocess.run(cmd,text=True,capture_output=True,check=True)
if not args.materialize:
 print(result.stdout.strip())
 print(json.dumps({'waveAOnlyContextDelta':'forward existing options.clockerPinKey in memory to beforeListen; never serialize key','preparedInitialModules':['initial-fixture.mts','initial-positive-fixture.mts'],'executed':False},indent=2))
 raise SystemExit
helper=out/'scripts/ui-checks/owned-preview-app-dev.mts'
body=helper.read_text()
old='identity: OwnedDatabaseIdentity; root: string; source: string }) => Promise<void>'
assert body.count(old)==1
body=body.replace(old,'identity: OwnedDatabaseIdentity; root: string; source: string; clockerPinKey?: string }) => Promise<void>')
old='await options.beforeListen?.({ database, identity, root, source });'
assert body.count(old)==1
body=body.replace(old,'await options.beforeListen?.({ database, identity, root, source, clockerPinKey: options.clockerPinKey });')
helper.write_text(body)
manifestPath=out/'runtime-adapter-manifest.json'
manifest=json.loads(manifestPath.read_text())
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest['helperHashes']['owned-preview-app-dev.mts']=digest(helper)
manifest['runtimeAdapterChanges'].append('Wave A initial reset-PIN fixture receives original runtime key in memory only')
manifest['initialFixtureModules']={p.name:{'path':str(p),'sha256':digest(p)} for p in [here/'initial-fixture.mts',here/'initial-positive-fixture.mts']}
manifest['sourceAppUnchanged']=True
manifestPath.write_text(json.dumps(manifest,indent=2)+'\n')
print(str(out/'scripts/ui-checks/preview-runtime.mjs'))
