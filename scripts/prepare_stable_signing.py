"""Prepare the existing private signing identity; never generate a replacement key."""
from pathlib import Path
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess

NAMES = ('QA_KEYSTORE_BASE64', 'QA_STORE_PASSWORD', 'QA_KEY_ALIAS', 'QA_KEY_PASSWORD')


def prepare_signing(environment, expected_sha256):
    values = [environment.get(name, '') for name in NAMES]
    if not all(values):
        raise ValueError('Configure all four QA signing secrets. Temporary signing is disabled.')
    encoded, store, alias, password = values
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,80}', alias):
        raise ValueError('Invalid signing alias.')
    if any('\n' in v or '\r' in v for v in (store, password)):
        raise ValueError('Signing passwords must be single-line values.')
    if len(encoded) > 65536:
        raise ValueError('Signing material exceeds the allowed size.')
    try:
        raw = base64.b64decode(''.join(encoded.split()), validate=True)
    except (ValueError, TypeError) as exc:
        raise ValueError('Invalid signing-store encoding.') from exc
    if not raw or len(raw) > 49152:
        raise ValueError('Invalid signing-store size.')
    temp = Path(environment['RUNNER_TEMP'])
    key = temp / 'playershype-qa.jks'
    cert = temp / 'playershype-signing.cer'
    request = temp / 'playershype-signing.csr'
    if key.exists():
        raise ValueError('Signing-store destination already exists; refusing to overwrite it.')
    tool = str(Path(environment['JAVA_HOME']) / 'bin/keytool') if environment.get('JAVA_HOME') else shutil.which('keytool')
    if not tool:
        raise ValueError('Java keytool is required.')
    env = dict(environment, PH_STORE_PASSWORD=store, PH_KEY_PASSWORD=password)
    try:
        with key.open('xb') as output:
            os.chmod(key, 0o600)
            output.write(raw)
        for arguments in (
            ['-exportcert', '-file', str(cert)],
            ['-certreq', '-file', str(request), '-keypass:env', 'PH_KEY_PASSWORD'],
        ):
            command = [tool, '-keystore', str(key), '-alias', alias, '-storepass:env', 'PH_STORE_PASSWORD'] + arguments
            result = subprocess.run(command, env=env, capture_output=True, timeout=30)
            if result.returncode:
                raise ValueError('The signing store, alias or password could not be verified.')
        fingerprint = hashlib.sha256(cert.read_bytes()).hexdigest()
        if fingerprint != expected_sha256:
            raise ValueError('Signing certificate does not match the approved permanent identity.')
        # GITHUB_ENV is the runner's private environment channel, never a public artifact.
        with open(environment['GITHUB_ENV'], 'a') as output:
            for name, value in dict(PREVIEW_KEYSTORE=str(key), PREVIEW_STORE_PASSWORD=store,
                                    PREVIEW_KEY_PASSWORD=password, PREVIEW_KEY_ALIAS=alias).items():
                output.write(name + '=' + value + '\n')
        Path('artifacts').mkdir(exist_ok=True)
        Path('artifacts/SIGNING.txt').write_text('Permanent signing identity verified.\nCertificate SHA256: ' + fingerprint + '\n')
        return fingerprint
    except Exception:
        key.unlink(missing_ok=True)
        raise
    finally:
        cert.unlink(missing_ok=True)
        request.unlink(missing_ok=True)


def main():
    identity = json.loads((Path(__file__).resolve().parents[1] / 'security/signing-identity.json').read_text())
    try:
        if os.environ.get('QA_KEY_ALIAS') and os.environ['QA_KEY_ALIAS'] != identity['alias']:
            raise ValueError('Signing alias does not match the approved identity.')
        digest = prepare_signing(os.environ, identity['certificateSha256'])
    except (ValueError, OSError, subprocess.TimeoutExpired) as exc:
        raise SystemExit(str(exc))
    print('Permanent signing identity verified: ' + digest)


if __name__ == '__main__':
    main()
