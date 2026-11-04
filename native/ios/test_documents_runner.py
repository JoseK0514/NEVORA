"""Document-only fixtures must never qualify the ordinary/real backend matrix."""
from pathlib import Path
import contextlib
import io
import runpy
import unittest
from unittest.mock import patch


class DocumentFixtureGuardTests(unittest.TestCase):
    def test_document_mode_rejects_backend_or_other_selectors_before_resources(self):
        cases = [
            ['--fixture', 'documents'],
            ['--fixture', 'documents', '--only-testing', 'NevoraUITests/NevoraUITests'],
            ['--fixture', 'documents', '--mode', 'owned-backend', '--only-testing', 'NevoraUITests/NevoraDocumentUITests'],
            ['--only-testing', 'NevoraUITests/NevoraDocumentUITests'],
        ]
        for args in cases:
            with self.subTest(args=args), patch('sys.argv', ['test-ui.py', '--simulator', '00000000-0000-0000-0000-000000000000', *args]), \
                    patch('subprocess.Popen', side_effect=AssertionError('Fixture allocated before validation')), \
                    patch('tempfile.mkdtemp', side_effect=AssertionError('Evidence allocated before validation')), \
                    contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as refused:
                runpy.run_path(str(Path(__file__).parent / 'test-ui.py'), run_name='__main__')
            self.assertEqual(refused.exception.code, 2)


if __name__ == '__main__':
    unittest.main()
