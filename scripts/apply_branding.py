"""Reuse the owner's original logo in web headers and the USER launcher only."""
from pathlib import Path
import argparse
import base64
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
START = '/* PH_OFFICIAL_MASTHEAD_START */'
END = '/* PH_OFFICIAL_MASTHEAD_END */'


def logo():
    data = base64.b64encode((ROOT / 'branding/playershype-wordmark.webp').read_bytes()).decode()
    return '<img class="ph-logo" src="data:image/webp;base64,' + data + '" alt="PlayersHype" width="640" height="382" decoding="async" fetchpriority="high">'


def style(html):
    css = START + '\n' + (ROOT / 'branding/masthead.css').read_text() + END
    if START in html:
        return re.sub(re.escape(START) + r'[\s\S]*?' + re.escape(END), lambda _: css, html, count=1)
    if '</style>' not in html:
        raise RuntimeError('Missing header stylesheet')
    return html.replace('</style>', css + '\n</style>', 1)


def web_header(html):
    header = '<header class="top ph-masthead"><div class="wrap ph-masthead-inner">' + logo() + '<div class="brand-copy ph-brand-copy"><div class="ph-kicker">RACE INTELLIGENCE</div><div class="title">HypePredict</div><div class="sub">Track Hub</div></div><div class="public-chip">● PUBLICADO</div></div></header>'
    html, count = re.subn(r'<header class="top(?: ph-masthead)?">[\s\S]*?</header>', lambda _: header, html, count=1)
    if count != 1:
        raise RuntimeError('Expected public header missing')
    return style(html)


def apply_native(source):
    # Deliberately leave all Admin icons and its manifest unchanged.
    user = Path(source) / 'app-user/src/main'
    home = user / 'assets/index.html'
    html = home.read_text()
    header = '<header class="topbar ph-masthead"><div class="topin ph-masthead-inner">' + logo() + '<div class="ph-brand-copy ph-home-copy"><span class="ph-kicker">LA MANADA</span><b>Definiendo el estándar.</b></div><button class="status" id="appStatus"><i></i><span id="appStatusText">LOCAL</span></button></div></header>'
    html, count = re.subn(r'<header class="topbar(?: ph-masthead)?">[\s\S]*?</header>', lambda _: header, html, count=1)
    if count != 1:
        raise RuntimeError('Expected user home header missing')
    home.write_text(style(html))
    res = user / 'res'
    shutil.copy(ROOT / 'branding/icons/launcher.png', res / 'drawable/app_icon.png')
    shutil.copy(ROOT / 'branding/icons/foreground.png', res / 'drawable/ph_icon_foreground.png')
    adaptive = res / 'mipmap-anydpi-v26'
    adaptive.mkdir(exist_ok=True)
    (adaptive / 'app_icon.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ph_launcher_background" />
  <foreground android:drawable="@drawable/ph_icon_foreground" />
</adaptive-icon>
''')
    legacy = res / 'mipmap-anydpi'
    legacy.mkdir(exist_ok=True)
    (legacy / 'app_icon.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/app_icon" android:gravity="fill" />
''')
    (res / 'values/ph_brand.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ph_launcher_background">#080D18</color></resources>
''')
    manifest = user / 'AndroidManifest.xml'
    xml = manifest.read_text().replace('android:icon="@drawable/app_icon"', 'android:icon="@mipmap/app_icon" android:roundIcon="@mipmap/app_icon"')
    manifest.write_text(xml)
    print('Applied official PlayersHype user branding; Admin identity unchanged')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, nargs='?')
    parser.add_argument('--web', action='store_true')
    args = parser.parse_args()
    if args.web:
        for name in ['docs/hypepredict/index.html', 'docs/app/index.html']:
            path = ROOT / name
            path.write_text(web_header(path.read_text()))
            print('Updated official masthead:', name)
    if args.source:
        apply_native(args.source)
