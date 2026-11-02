"""Runner safety checks must run before touching adb, Gradle or a fixture."""
from pathlib import Path
import contextlib
import ast
import hashlib
import fcntl
import io
import runpy
import tempfile
import unittest
from unittest.mock import patch

class RunnerOwnershipTests(unittest.TestCase):
    def invoke(self, serial):
        with patch('sys.argv', ['test-ui.py', '--serial', serial]), \
             patch('subprocess.Popen', side_effect=AssertionError('Spawned a tool before ownership')):
            runpy.run_path(str(Path(__file__).parent / 'test-ui.py'), run_name='__main__')

    def test_refuses_physical_or_ambiguous_device_before_tools(self):
        for serial in ['booted', 'FAKE-PHYSICAL', 'emulator-5559', 'emulator-99999', '../emulator-5558']:
            with self.subTest(serial=serial):
                with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as denied:
                    self.invoke(serial)
                self.assertEqual(denied.exception.code, 2)

    def test_refuses_another_owner_before_tools(self):
        serial = 'emulator-5558'
        with tempfile.TemporaryDirectory() as directory:
            with (Path(directory) / f'nevora-native-android-{serial}.lock').open('a+') as owner, patch('tempfile.gettempdir', return_value=directory):
                fcntl.flock(owner, fcntl.LOCK_EX | fcntl.LOCK_NB)
                stderr = io.StringIO()
                with contextlib.redirect_stderr(stderr), self.assertRaises(SystemExit) as denied:
                    self.invoke(serial)
                self.assertEqual(denied.exception.code, 2)
                self.assertIn('already in use', stderr.getvalue())

    def test_module_build_configuration_is_bound_to_source_receipt(self):
        # Execute only the real pure digest function, without starting the runner.
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'source_hash')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'native/android'
            (root / 'app/src').mkdir(parents=True)
            (root / 'app/build.gradle').write_text('compileSdk 36\n')
            namespace = {'root': root, 'hashlib': hashlib}
            exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_digest', 'exec'), namespace)
            before = namespace['source_hash']()
            (root / 'app/build.gradle').write_text('compileSdk 37\n')
            self.assertNotEqual(before, namespace['source_hash']())

if __name__ == '__main__':
    unittest.main()
