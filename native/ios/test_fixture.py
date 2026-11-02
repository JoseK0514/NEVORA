"""Regression: concurrent native fixtures cannot share ports or login state."""
from pathlib import Path
import http.cookiejar
import json
import re
import subprocess
import unittest
import urllib.error
import urllib.parse
import urllib.request


class FixtureIsolationTests(unittest.TestCase):
    def setUp(self):
        self.fixture = subprocess.Popen(['node', str(Path(__file__).parent / 'Fixtures/server.mjs')], stdout=subprocess.PIPE, text=True)
        self.origin = json.loads(self.fixture.stdout.readline())['origin']
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def tearDown(self):
        self.fixture.terminate()
        try:
            self.fixture.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.fixture.kill(); self.fixture.wait()
        self.fixture.stdout.close()

    def login(self, employee_id):
        body = urllib.parse.urlencode({'employeeId': employee_id, 'password': 'fictional-test-password'}).encode()
        return self.client.open(self.origin + '/login', data=body, timeout=5)

    def test_documents_have_an_accessibility_name_distinct_from_visible_assertions(self):
        for response in [self.client.open(self.origin + '/login', timeout=5), self.login('FICTIONAL')]:
            with response:
                body = response.read().decode()
            title = re.search(r'<title>([^<]+)</title>', body)
            self.assertIsNotNone(title, 'Native fixture documents require an explicit accessibility name')
            self.assertTrue(title.group(1).strip())
            self.assertNotIn('Fictional', title.group(1), 'A document name cannot satisfy the visible-content assertion')

    def test_owner_has_distinct_synthetic_home_and_native_context(self):
        with self.login('FICTIONAL-OWNER') as response:
            self.assertIn('Fictional Owner Home', response.read().decode())
        request = urllib.request.Request(self.origin + '/app', headers={'User-Agent': 'Mozilla/5.0 NEVORA-Native/iOS/1'})
        with self.client.open(request, timeout=5) as response:
            self.assertIn('Native iOS v1', response.read().decode())

    def test_signout_requires_post_and_get_does_not_revoke(self):
        self.login('FICTIONAL').close()
        with self.assertRaises(urllib.error.HTTPError) as denied:
            self.client.open(self.origin + '/logout', timeout=5)
        self.assertEqual(denied.exception.code, 405)
        with self.client.open(self.origin + '/api/mobile/v1/session', timeout=5) as response:
            self.assertEqual(json.load(response)['state'], 'authenticated')
        self.client.open(self.origin + '/logout', data=b'', timeout=5).close()
        with self.assertRaises(urllib.error.HTTPError) as signed_out:
            self.client.open(self.origin + '/api/mobile/v1/session', timeout=5)
        self.assertEqual(signed_out.exception.code, 401)

    def test_server_revocation_invalidates_persisted_browser_session(self):
        self.login('FICTIONAL').close()
        with self.client.open(self.origin + '/__test/revoke-all', data=b'', timeout=5) as response:
            self.assertEqual(response.status, 204)
        with self.assertRaises(urllib.error.HTTPError) as revoked:
            self.client.open(self.origin + '/api/mobile/v1/session', timeout=5)
        self.assertEqual(revoked.exception.code, 401)

    def test_native_unsupported_role_does_not_remove_web_access(self):
        try:
            with self.login('FICTIONAL-MANAGER') as response:
                self.assertIn('Fictional Manager Home', response.read().decode())
        except urllib.error.HTTPError as error:
            self.fail(f'Fictional Manager must retain web access, got {error.code}')
        request = urllib.request.Request(self.origin + '/app', headers={'User-Agent': 'NEVORA-Native/Android/1'})
        with self.client.open(request, timeout=5) as response:
            body = response.read().decode()
            self.assertIn('Employee and Owner accounts', body)
            self.assertNotIn('Fictional Manager Home', body)
        with self.client.open(self.origin + '/api/mobile/v1/session', timeout=5) as response:
            self.assertEqual(json.load(response)['state'], 'authenticated')

    def test_outage_recovery_does_not_silently_revoke_session(self):
        self.login('FICTIONAL').close()
        with self.client.open(self.origin + '/__test/outage-on', data=b'', timeout=5) as response:
            self.assertEqual(response.status, 204)
        for path in ['/api/mobile/v1/session', '/app']:
            with self.assertRaises(urllib.error.HTTPError) as unavailable:
                self.client.open(self.origin + path, timeout=5)
            self.assertEqual(unavailable.exception.code, 503)
        with self.client.open(self.origin + '/__test/outage-off', data=b'', timeout=5) as response:
            self.assertEqual(response.status, 204)
        with self.client.open(self.origin + '/api/mobile/v1/session', timeout=5) as response:
            self.assertEqual(json.load(response)['state'], 'authenticated')

    def test_concurrent_invocations_keep_ports_and_sessions_separate(self):
        processes = []
        try:
            origins = []
            for _ in range(2):
                process = subprocess.Popen(['node', str(Path(__file__).parent / 'Fixtures/server.mjs')],
                                           stdout=subprocess.PIPE, text=True)
                processes.append(process)
                origins.append(json.loads(process.stdout.readline()))
            addresses = [origin[key] for origin in origins for key in ['origin', 'unavailableOrigin']]
            self.assertEqual(len(set(addresses)), 4)
            client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            body = urllib.parse.urlencode({'employeeId': 'FICTIONAL', 'password': 'fictional-test-password'}).encode()
            with client.open(origins[0]['origin'] + '/login', data=body, timeout=5) as response:
                self.assertEqual(response.status, 200)
            with client.open(origins[0]['origin'] + '/api/mobile/v1/session', timeout=5) as response:
                self.assertEqual(json.load(response)['state'], 'authenticated')
            # Even a host-wide cookie copied to another loopback port grants no
            # access: that invocation has a separate session authority/set.
            with self.assertRaises(urllib.error.HTTPError) as denied:
                client.open(origins[1]['origin'] + '/api/mobile/v1/session', timeout=5)
            self.assertEqual(denied.exception.code, 401)
            with self.assertRaises(urllib.error.HTTPError) as unavailable:
                client.open(origins[0]['unavailableOrigin'], timeout=5)
            self.assertEqual(unavailable.exception.code, 503)
        finally:
            for process in processes:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                if process.stdout:
                    process.stdout.close()


if __name__ == '__main__':
    unittest.main()
