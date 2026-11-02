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
import subprocess
from unittest.mock import patch

class RunnerOwnershipTests(unittest.TestCase):
    def test_accessibility_mode_is_explicit_and_unknown_overrides_fail_closed(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'webview_context')
        namespace = {'re': __import__('re'), 'hashlib': hashlib}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'webview_context', 'exec'), namespace)
        context = namespace['webview_context']
        provider = 'Current WebView package (name, version): (com.google.android.webview, 133.0.6943.137)'
        clean = context('platform-default', provider, None)
        self.assertEqual(clean['accessibilityMode'], 'platform-default')
        self.assertIsNone(clean['runtimeFlagsSha256'])
        owned = 'nevora_qa_' + 'a' * 32 + ' --force-renderer-accessibility=complete\n'
        self.assertEqual(context('renderer-complete', provider, owned)['runtimeFlagsSha256'], hashlib.sha256(owned.encode()).hexdigest())
        for mode, flag in [('platform-default', owned), ('platform-default', ''), ('renderer-complete', None), ('renderer-complete', '_ --ignore-certificate-errors\n'), ('renderer-complete', owned + '--disable-web-security'), ('unknown', None)]:
            with self.subTest(mode=mode, flag=flag), self.assertRaises(ValueError): context(mode, provider, flag)
        with self.assertRaises(ValueError): context('platform-default', 'unknown provider', None)
    def test_isolation_cannot_reset_the_total_instrumentation_budget(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'instrumentation_remaining')
        clock = __import__('types').SimpleNamespace(monotonic=lambda: 450)
        namespace = {'time': clock}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_budget', 'exec'), namespace)
        self.assertEqual(namespace['instrumentation_remaining'](480), 30)
        clock.monotonic = lambda: 481
        with self.assertRaises(TimeoutError): namespace['instrumentation_remaining'](480)
    def test_all_transport_cases_are_isolated_without_omitting_restart_setup(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'instrumentation_selections')
        namespace = {}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_selections', 'exec'), namespace)
        select = namespace['instrumentation_selections']
        selections = select(False, None)
        self.assertEqual(len(selections), 9)
        self.assertEqual(len(set(selections)), 9)
        self.assertTrue(selections[-1].endswith('#z_ownerSessionForExternalProcessRestartCheck'))
        self.assertTrue(all('#' in name for name in selections))
        self.assertEqual(select(False, 'com.velani.nevora.development.ShellInstrumentedTest'), selections)
        focused = 'com.velani.nevora.development.ShellInstrumentedTest#g_redirectedSubresourcesAreContainedByRendererPolicy'
        self.assertEqual(select(False, focused), [focused])
        self.assertEqual(len(select(True, None)), 3)
    def test_tool_failure_retains_stdout_diagnostic(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'run')
        namespace = {'Path': Path, 'subprocess': subprocess, 'env': {}}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_tool', 'exec'), namespace)
        with patch('subprocess.run', return_value=subprocess.CompletedProcess(['adb'], 1, 'ERROR: fictional hierarchy not ready', '')):
            with self.assertRaisesRegex(RuntimeError, 'fictional hierarchy not ready'):
                namespace['run'](['adb'])
    def test_each_isolated_case_must_pass_and_be_counted_once(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'instrumentation_count')
        namespace = {'re': __import__('re')}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_results', 'exec'), namespace)
        count = namespace['instrumentation_count']
        self.assertEqual(count('OK (1 test)\nOK (1 test)',2,2),2)
        for text in ['OK (1 test)', 'OK (2 tests)', 'OK (1 test)\nFAILURES!!!', 'OK (2 tests)\nOK (0 tests)', 'OK (1 test)\nOK (1 test)\nProcess crashed']:
            with self.subTest(text=text), self.assertRaises(RuntimeError):count(text,2,2)
    def test_a_device_timeout_does_not_skip_other_cleanup_or_failure_evidence(self):
        tree = ast.parse((Path(__file__).parent / 'test-ui.py').read_text())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'finish_cleanup')
        namespace = {}
        exec(compile(ast.Module(body=[function], type_ignores=[]), 'runner_cleanup', 'exec'), namespace)
        attempted = []
        def timeout():
            attempted.append('device')
            raise TimeoutError('fictional unavailable emulator')
        failures = namespace['finish_cleanup']([('force-stop', timeout), ('fixture', lambda: attempted.append('fixture'))])
        self.assertEqual(attempted, ['device','fixture'])
        self.assertEqual(failures, ['force-stop: TimeoutError'])
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
