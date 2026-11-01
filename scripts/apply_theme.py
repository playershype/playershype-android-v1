"""Apply the Laguna + Glaciar presentation theme without changing HypePredict data or JS.

Used by Android CI after expanding the retained V1.3.1 source archive.
Run with an explicit source directory; --legacy updates the repository's old shell.
"""
from pathlib import Path
import argparse
import colorsys
import re

ABYSS = '#0A192F'
MINT = '#64FFDA'
AQUA = '#00B4D8'
MARINE = '#E0FBFC'
ICE = '#BCEBF2'
LAVA = '#FF491C'
COBALT = '#20366B'
FROST = '#E8EDF2'


def color(value, dark_shell=False):
    raw = value.lstrip('#').lower()
    if len(raw) == 3:
        raw = ''.join(c * 2 for c in raw)
    if len(raw) != 6:
        return value
    rgb = tuple(int(raw[i:i+2], 16) / 255 for i in (0, 2, 4))
    h, light, sat = colorsys.rgb_to_hls(*rgb)
    hue = h * 360
    if raw in ('ffffff', 'f4f7fc', 'f2f7fb', 'f5fbff', 'f6fbff'):
        return MARINE
    # Preserve status colors and racing identities; remap presentation accents.
    if 63 <= hue <= 85 and sat > .5:
        return ABYSS if light < .35 else MINT
    if raw in ('25c5df', '22d3ee', '21bfd7', '29aec6'):
        return AQUA
    if raw in ('ff8a34', 'ff7a2f', 'ff7b35', 'ff9838'):
        return LAVA
    if 175 <= hue <= 245 and sat > .06:
        if light < .14:
            return ABYSS
        if light < .24:
            return COBALT
        if light < .37:
            return '#37577A'
        if light < .61:
            if sat > .6:
                return AQUA
            return ICE if dark_shell else COBALT
        if light < .83:
            return MINT if sat > .5 else ICE
        if light < .93:
            return ICE
        return MARINE
    return value


def css_theme(css, dark_shell=False):
    css = re.sub(r'#[0-9a-fA-F]{3,8}\b', lambda m: color(m[0], dark_shell), css)
    css = re.sub(r'(?<=[: ,])white\b', MARINE, css)
    # Brand glows and translucent lime accents; retain alpha and geometry.
    css = re.sub(r'rgba?\(\s*202\s*,\s*255\s*,\s*0\s*,', 'rgba(100,255,218,', css)
    css = re.sub(r'rgba?\(\s*(?:47,159,230|19,167,255|22,168,255|37,197,223)\s*,', 'rgba(0,180,216,', css)
    css = css.replace('background:#20366B;color:#20366B;', 'background:#20366B;color:#BCEBF2;')
    return css


TOKENS = """
/* PlayersHype · Laguna Bioluminiscente + Glaciar en Llamas: eight color palette. */
:root{--ph-abyss:#0A192F;--ph-mint:#64FFDA;--ph-aqua:#00B4D8;--ph-marine:#E0FBFC;--ph-ice:#BCEBF2;--ph-lava:#FF491C;--ph-cobalt:#20366B;--ph-frost:#E8EDF2}
:focus-visible{outline:3px solid #00B4D8;outline-offset:3px}
"""
SHELL_FIX = """
:root{--bg:#0A192F;--text:#E0FBFC;--muted:#BCEBF2}
.btn.primary,.primary{background:#FF491C;border-color:#FF491C;color:#0A192F}
.btn.primary:hover,.primary:hover{background:#64FFDA;border-color:#64FFDA;color:#0A192F}
.navbtn.active,.eyebrow{color:#64FFDA}
.section-link{color:#00B4D8}
.mark{background:#20366B;color:#E0FBFC;border-color:#00B4D8}
"""
WEB_FIX = """
:root{--navy:#0A192F;--navy2:#20366B;--lime:#64FFDA;--cyan:#00B4D8;--bg:#E8EDF2;--card:#E0FBFC;--text:#0A192F;--muted:#20366B;--line:#BCEBF2}
html,body{background:#E8EDF2;color:#0A192F}
.top,.race-page .race-banner,.hm-top{background:linear-gradient(120deg,#0A192F,#20366B)}
.top .brand,.jornada-command-kicker,.radiography-kicker,.wx-kicker,.hm-kicker{color:#64FFDA}
.brand-mark{background:#20366B;color:#64FFDA;border:1px solid #00B4D8}
.section-card,.match-card,.horse-panel,.horse-panel-header,.hm-dialog,.hm-fighter,.hm-choice,.hm-table,.hm-reading,.strip-cell{background:#E0FBFC}
#refresh,.wx-refresh,.hm-open,.hm-actions .primary{background:#FF491C;border-color:#FF491C;color:#0A192F}
.screen-nav{background:#E0FBFC}
.screen-nav a{background:#E8EDF2;color:#20366B;border-color:#BCEBF2}
.screen-nav a.active{background:#20366B;color:#E0FBFC;border-color:#20366B;box-shadow:inset 0 -3px 0 #64FFDA}
.page-kicker,.section-heading,.page-heading,.block-title{color:#20366B}
.race-page .race-core>section,.race-page .quick-cell,.race-page .more,.original-horse{background:#E0FBFC}
.race-page .quick-cell.select{background:#BCEBF2;border-color:#00B4D8;border-top:3px solid #64FFDA}
.race-page .board-table th{background:#20366B;color:#E0FBFC}
.race-page .board-table tbody tr:first-child{background:#BCEBF2}
.scorebar i,.pulse-meter i{background:linear-gradient(90deg,#00B4D8,#64FFDA)}
.hm-edge{background:#64FFDA;color:#0A192F;border-color:#00B4D8}
.hm-vs,.match-vs{background:#20366B;color:#64FFDA}
.wx-state{border-color:#64FFDA;color:#64FFDA}
.hm-cell.metric{background:#E8EDF2;color:#20366B}
"""


def html_theme(path, dark_shell=False, web=False):
    before = path.read_text(encoding='utf-8')
    if '--ph-abyss:' in before:
        return
    after = re.sub(r'(<style\b[^>]*>)([\s\S]*?)(</style>)',
                   lambda m: m[1] + css_theme(m[2], dark_shell) + m[3], before, flags=re.I)
    after = re.sub(r'(<meta\b[^>]*name="theme-color"[^>]*content=")[^"]*', r'\g<1>' + ABYSS, after)
    # Append within the existing style, respecting packaged CSP (no JS changes).
    extra = TOKENS + (SHELL_FIX if dark_shell else '') + (WEB_FIX if web else '')
    after = after.replace('</style>', extra + '</style>', 1)
    assert re.findall(r'<script\b[\s\S]*?</script>', before, re.I) == re.findall(r'<script\b[\s\S]*?</script>', after, re.I)
    path.write_text(after, encoding='utf-8')
    print('Themed', path)


def native_theme(root):
    for path in root.rglob('styles.xml'):
        source = path.read_text()
        path.write_text(source.replace('#07111D', ABYSS).replace('#062E44', ABYSS))
    for name in ('SecureActivity.java', 'MainActivity.java'):
        for path in root.rglob(name):
            source = path.read_text()
            source = source.replace('Color.rgb(7,17,29)', 'Color.rgb(10,25,47)').replace('Color.rgb(6,46,68)', 'Color.rgb(10,25,47)')
            source = source.replace('Color.rgb(13,33,51)', 'Color.rgb(32,54,107)').replace('Color.rgb(12,59,80)', 'Color.rgb(32,54,107)')
            source = source.replace('b.setTextColor(Color.WHITE)', 'b.setTextColor(Color.rgb(224,251,252))').replace('Color.rgb(255,240,207)', 'Color.rgb(224,251,252)')
            path.write_text(source)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--legacy', action='store_true')
    args = parser.parse_args()
    root = args.source.resolve()
    if args.legacy:
        html_theme(root / 'app/src/main/assets/index.html', True)
        html_theme(root / 'docs/hypepredict/index.html', web=True)
        html_theme(root / 'docs/index.html', True)
        native_theme(root / 'app/src/main')
        return
    assert (root / 'app-user/src/main/assets/index.html').is_file(), 'Expected ecosystem source'
    for module in ('app-user', 'app-admin'):
        assets = root / module / 'src/main/assets'
        for path in assets.rglob('*.html'):
            html_theme(path, path == assets / 'index.html')
        control = assets / 'control.css'
        if control.exists() and '--ph-abyss:' not in control.read_text():
            control.write_text(css_theme(control.read_text(), True) + TOKENS + SHELL_FIX)
        gradle = root / module / 'build.gradle'
        gradle.write_text(gradle.read_text().replace('versionCode 5', 'versionCode 7').replace("versionName '1.3.1'", "versionName '1.3.3'"))
    native_theme(root)
    audit = root / 'scripts/v131_static_audit.py'
    audit.write_text(audit.read_text().replace('version code 5', 'version code 7').replace('versionCode 5', 'versionCode 7').replace('version 1.3.1', 'version 1.3.3').replace("versionName '1.3.1'", "versionName '1.3.3'"))


if __name__ == '__main__':
    main()
