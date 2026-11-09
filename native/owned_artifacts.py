"""Verify SDK preparation against the invocation and exact source before install."""
from pathlib import Path
import hashlib
import json
import os
import re

def owned_artifacts(root, platform, checkpoint, owner):
    root=Path(root)
    def require(condition):
        if not condition:raise ValueError('Owned SDK preparation mismatch')
    require(platform in ['android','ios'] and re.fullmatch('[a-f0-9]{40}',checkpoint) and re.fullmatch('[a-f0-9]{32}',owner))
    require(root.is_absolute() and root.resolve()==root and root.is_dir() and not root.is_symlink() and root.stat().st_uid==os.getuid())
    require(not (root/'native-owner').is_symlink() and (root/'native-owner').read_text()==owner)
    receipt_path=root/(platform+'-build-receipt.json');require(not receipt_path.is_symlink())
    receipt=json.loads(receipt_path.read_text())
    require(set(receipt)=={'ownerId','checkpoint','platform','artifacts'})
    require(receipt['ownerId']==owner and receipt['checkpoint']==checkpoint and receipt['platform']==platform)
    directory=root/(platform+'-prebuilt'); require(directory.is_dir() and directory.resolve()==directory)
    require(isinstance(receipt['artifacts'],list) and len(receipt['artifacts'])>=2)
    names=[]
    for artifact in receipt['artifacts']:
        require(isinstance(artifact,dict) and set(artifact)=={'path','sha256'})
        name=artifact['path'];require(isinstance(name,str) and '\\' not in name)
        path=Path(name);require(not path.is_absolute() and '..' not in path.parts and path.parts[0]==directory.name)
        target=root/path;require(target.is_file() and not target.is_symlink() and target.resolve()==target)
        require(isinstance(artifact['sha256'],str) and re.fullmatch('[a-f0-9]{64}',artifact['sha256']))
        require(hashlib.sha256(target.read_bytes()).hexdigest()==artifact['sha256']);names.append(name)
    require(len(names)==len(set(names)))
    if platform=='android':require(set(names)=={'android-prebuilt/outputs/apk/debug/app-debug.apk','android-prebuilt/outputs/apk/androidTest/debug/app-debug-androidTest.apk'})
    else:require(len([name for name in names if name.endswith('.xctestrun')])==1)
    return directory
