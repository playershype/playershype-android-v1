"""Fail-closed signing and stable identity checks using an independent test key."""
import base64
import contextlib
import hashlib
import io
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from prepare_stable_signing import prepare_signing


class StableSigningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        java_home = os.environ.get('JAVA_HOME', '/usr/lib/jvm/java-17-openjdk-amd64')
        cls.tool = str(Path(java_home) / 'bin/keytool')
        cls.java_home = java_home
        cls.store = 'test-fixture-store-password'
        cls.password = 'test-fixture-key-password'
        env = dict(os.environ, TEST_STORE=cls.store, TEST_KEY=cls.password)
        subprocess.run([cls.tool, '-genkeypair', '-noprompt', '-storetype', 'JKS', '-keystore', str(cls.root / 'fixture.jks'), '-alias', 'fixture', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '2', '-dname', 'CN=Test Fixture', '-storepass:env', 'TEST_STORE', '-keypass:env', 'TEST_KEY'], env=env, check=True, capture_output=True)
        subprocess.run([cls.tool, '-exportcert', '-keystore', str(cls.root / 'fixture.jks'), '-alias', 'fixture', '-storepass:env', 'TEST_STORE', '-file', str(cls.root / 'fixture.cer')], env=env, check=True, capture_output=True)
        cls.encoded = base64.b64encode((cls.root / 'fixture.jks').read_bytes()).decode()
        cls.digest = hashlib.sha256((cls.root / 'fixture.cer').read_bytes()).hexdigest()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.old_cwd = Path.cwd()
        os.chdir(self.root)
        self.env = dict(os.environ, RUNNER_TEMP=str(self.root), JAVA_HOME=self.java_home,
                        GITHUB_ENV=str(self.root / 'runner-env'), QA_KEYSTORE_BASE64=self.encoded,
                        QA_STORE_PASSWORD=self.store, QA_KEY_ALIAS='fixture', QA_KEY_PASSWORD=self.password)

    def tearDown(self):
        os.chdir(self.old_cwd)
        self.temp.cleanup()

    def test_absent_secrets_never_create_temporary_key(self):
        for name in ('QA_KEYSTORE_BASE64', 'QA_STORE_PASSWORD', 'QA_KEY_ALIAS', 'QA_KEY_PASSWORD'):
            self.env.pop(name)
        with self.assertRaisesRegex(ValueError, 'Temporary signing is disabled'):
            prepare_signing(self.env, self.digest)
        self.assertFalse((self.root / 'playershype-qa.jks').exists())

    def test_partial_secrets_rejected(self):
        self.env.pop('QA_KEY_PASSWORD')
        with self.assertRaises(ValueError): prepare_signing(self.env, self.digest)

    def test_invalid_encoding_rejected(self):
        self.env['QA_KEYSTORE_BASE64'] = '**invalid**'
        with self.assertRaisesRegex(ValueError, 'encoding'): prepare_signing(self.env, self.digest)

    def test_wrong_identity_removes_private_key(self):
        with self.assertRaisesRegex(ValueError, 'certificate does not match'):
            prepare_signing(self.env, '0' * 64)
        self.assertFalse((self.root / 'playershype-qa.jks').exists())
        self.assertFalse((self.root / 'runner-env').exists())

    def test_wrong_key_password_rejected_without_disclosure(self):
        self.env['QA_KEY_PASSWORD'] = 'bad-sensitive-value'
        with self.assertRaises(ValueError) as error: prepare_signing(self.env, self.digest)
        self.assertNotIn('bad-sensitive-value', str(error.exception))
        self.assertFalse((self.root / 'playershype-qa.jks').exists())

    def test_password_newline_rejected(self):
        self.env['QA_STORE_PASSWORD'] += '\n'
        with self.assertRaisesRegex(ValueError, 'single-line'): prepare_signing(self.env, self.digest)

    def test_two_builds_retain_same_certificate_and_no_secret_output(self):
        captured = io.StringIO()
        for _ in range(2):
            with contextlib.redirect_stdout(captured): self.assertEqual(prepare_signing(self.env, self.digest), self.digest)
            self.assertEqual((self.root / 'playershype-qa.jks').read_bytes(), (self.__class__.root / 'fixture.jks').read_bytes())
            (self.root / 'playershype-qa.jks').unlink()
        self.assertNotIn(self.store, captured.getvalue())
        self.assertNotIn(self.password, captured.getvalue())
        self.assertNotIn(self.encoded, captured.getvalue())

    def test_existing_store_is_not_overwritten(self):
        key = self.root / 'playershype-qa.jks';key.write_bytes(b'preserve')
        with self.assertRaisesRegex(ValueError, 'refusing to overwrite'): prepare_signing(self.env, self.digest)
        self.assertEqual(key.read_bytes(), b'preserve')


if __name__ == '__main__':
    unittest.main()
