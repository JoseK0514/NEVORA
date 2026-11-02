import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from owned_artifacts import owned_artifacts

class ArtifactCustodyTests(unittest.TestCase):
    def test_stale_source_owner_and_replaced_binary_cannot_be_installed(self):
        with tempfile.TemporaryDirectory(prefix='nevora-native-owned-') as directory:
            root=Path(directory).resolve(); owner='a'*32; sha='b'*40
            (root/'native-owner').write_text(owner)
            paths=['android-prebuilt/outputs/apk/debug/app-debug.apk','android-prebuilt/outputs/apk/androidTest/debug/app-debug-androidTest.apk']
            for name in paths:
                path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b'fictional APK')
            receipt={'ownerId':owner,'checkpoint':sha,'platform':'android','artifacts':[{'path':name,'sha256':hashlib.sha256(b'fictional APK').hexdigest()} for name in paths]}
            (root/'android-build-receipt.json').write_text(json.dumps(receipt))
            self.assertEqual(owned_artifacts(root,'android',sha,owner),root/'android-prebuilt')
            for expected_sha,expected_owner in [('c'*40,owner),(sha,'d'*32)]:
                with self.assertRaises(ValueError):owned_artifacts(root,'android',expected_sha,expected_owner)
            (root/paths[0]).write_bytes(b'replaced')
            with self.assertRaises(ValueError):owned_artifacts(root,'android',sha,owner)

if __name__ == '__main__':unittest.main()
