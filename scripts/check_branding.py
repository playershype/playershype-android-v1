"""Check the actual overlaid sources, including the intentionally unchanged Admin icon."""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser()
args.add_argument('source', type=Path)
source = args.parse_args().source
user = source / 'app-user/src/main'
admin = source / 'app-admin/src/main'
wordmark = (ROOT / 'branding/playershype-wordmark.webp').read_bytes()
original = (ROOT / 'branding/playershype-original.png').read_bytes()
assert hashlib.sha256(original).hexdigest() == json.loads((ROOT / 'branding/source.json').read_text())['sha256']
pages = [ROOT / 'docs/hypepredict/index.html', ROOT / 'docs/app/index.html', user / 'assets/index.html', source / 'shared/src/main/assets/sync/dashboard.html', source / 'shared/src/main/assets/sync/dashboard-export.html']
for path in pages:
    text = path.read_text()
    header = re.search(r'<header class="(?:top|topbar) ph-masthead">[\s\S]*?</header>', text)[0]
    images = re.findall(r'<img\b[^>]*src="([^"]+)"', header)
    assert len(images) == 1 and images[0].startswith('data:image/webp;base64,')
    assert base64.b64decode(images[0].split(',', 1)[1]) == wordmark
    assert 'alt="PlayersHype" width="640" height="382"' in header
    assert 'prefers-reduced-motion:reduce' in text
    assert 'animation:ph-light-pass 4.6s' in text and 'infinite' not in text[text.index('/* PH_OFFICIAL_MASTHEAD_START */'):text.index('/* PH_OFFICIAL_MASTHEAD_END */')]
print('PASS official logo is self-contained in all five headers; finite/reduced motion')

android = '{http://schemas.android.com/apk/res/android}'
application = ET.parse(user / 'AndroidManifest.xml').getroot().find('application')
assert application.get(android + 'icon') == '@mipmap/app_icon'
assert application.get(android + 'roundIcon') == '@mipmap/app_icon'
adaptive = ET.parse(user / 'res/mipmap-anydpi-v26/app_icon.xml').getroot()
assert adaptive.find('foreground').get(android + 'drawable') == '@drawable/ph_icon_foreground'
for name, target in [('launcher', 'app_icon'), ('foreground', 'ph_icon_foreground')]:
    assert (ROOT / f'branding/icons/{name}.png').read_bytes() == (user / f'res/drawable/{target}.png').read_bytes()
print('PASS user launcher has official legacy, round and adaptive resources')

with zipfile.ZipFile(ROOT / 'PlayersHype-Ecosystem-V1.3.1-RC-SOURCE.zip') as archive:
    suffix = 'app-admin/src/main/res/drawable/app_icon.png'
    old_icon = archive.read(next(n for n in archive.namelist() if n.endswith(suffix)))
    assert old_icon == (admin / 'res/drawable/app_icon.png').read_bytes()
assert ET.parse(admin / 'AndroidManifest.xml').getroot().find('application').get(android + 'icon') == '@drawable/app_icon'
assert old_icon != (user / 'res/drawable/app_icon.png').read_bytes()
print('PASS Admin launcher remains byte-identical and distinct from user app')
