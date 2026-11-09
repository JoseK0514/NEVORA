"""The runner must own its simulator before it creates fixtures or builds."""
from pathlib import Path
import contextlib
import fcntl
import io
import runpy
import tempfile
import unittest
from unittest.mock import patch


class SimulatorOwnershipTests(unittest.TestCase):
    def invoke(self, simulator):
        with patch('sys.argv', ['test-ui.py', '--simulator', simulator]), \
             patch('subprocess.Popen', side_effect=AssertionError('Spawned a tool before simulator ownership')):
            runpy.run_path(str(Path(__file__).parent / 'test-ui.py'), run_name='__main__')

    def test_refuses_second_invocation_before_any_child_process(self):
        simulator = '00000000-0000-0000-0000-000000000001'
        with tempfile.TemporaryDirectory() as directory:
            lock = Path(directory) / f'nevora-native-simulator-{simulator}.lock'
            with lock.open('a+') as owner, patch('tempfile.gettempdir', return_value=directory):
                fcntl.flock(owner, fcntl.LOCK_EX | fcntl.LOCK_NB)
                stderr = io.StringIO()
                with contextlib.redirect_stderr(stderr), self.assertRaises(SystemExit) as denied:
                    self.invoke(simulator)
                self.assertEqual(denied.exception.code, 2)
                self.assertIn('already in use', stderr.getvalue())

    def test_rejects_unsafe_simulator_identifier_before_any_child_process(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as denied:
            self.invoke('../not-a-uuid')
        self.assertEqual(denied.exception.code, 2)


if __name__ == '__main__':
    unittest.main()
