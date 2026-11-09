"""Fail before any SDK action when a full-backend receipt is invalid."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import patch

class NativeBackendInputTests(unittest.TestCase):
    def test_invalid_targets_and_receipts_never_start_a_tool(self):
        root = Path(__file__).parent
        for platform, target in [('android', ['--serial','emulator-5558']), ('ios', ['--simulator','00000000-0000-4000-8000-000000000000'])]:
            for origin in ['https://production.example', 'http://127.0.0.1:bad', 'http://user@127.0.0.1:1234', 'http://@127.0.0.1:1234', 'http://127.0.0.1:1234?selector=wrong', 'http://127.0.0.1:1234']:
                with self.subTest(platform=platform, origin=origin), tempfile.TemporaryDirectory() as directory:
                    receipt = Path(directory).resolve()/'nevora-native-owned-fixture'
                    if origin != 'http://127.0.0.1:1234':
                        receipt.mkdir(); (receipt/'native-owner').write_text('a'*32)
                        (receipt/'source-custody.json').write_text(json.dumps({'checkpoint':'b'*40}))
                    sdk = Path(directory)/'sdk/platform-tools'; sdk.mkdir(parents=True); (sdk/'adb').touch()
                    args = ['test-ui.py', *target, '--mode','owned-backend','--backend-origin',origin,
                        '--backend-control-origin','http://127.0.0.1:1235','--backend-owner','a'*32,
                        '--expected-sha','b'*40,'--evidence-root',str(receipt)]
                    with patch('sys.argv',args), patch.dict('os.environ',{'ANDROID_HOME':str(sdk.parent)}), patch('subprocess.Popen',side_effect=AssertionError('SDK started before ownership')), patch('subprocess.run',side_effect=AssertionError('SDK started before ownership')), patch('subprocess.check_output',side_effect=AssertionError('SDK started before ownership')), contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
                        with self.assertRaises(SystemExit) as stopped:
                            runpy.run_path(str(root/platform/'test-ui.py'),run_name='__main__')
                        self.assertEqual(stopped.exception.code,2)

if __name__ == '__main__': unittest.main()
