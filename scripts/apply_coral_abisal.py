"""Apply the Coral Abisal presentation theme without changing HypePredict data or JS.

Used by Android CI after expanding the retained V1.3.1 source archive.
Run with an explicit source directory; --legacy updates the repository's old shell.
"""
from pathlib import Path
import argparse
import colorsys
import re

ABYSS = '#062E44'
CORAL = '#FF715B'
TURQUOISE = '#36D6B4'
IVORY = '#FFF0CF'


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
        return IVORY if dark_shell or raw != 'ffffff' else '#FFF9ED'
    # Lime was the old brand accent. Keep semantic red/amber/green and silks intact.
    if 63 <= hue <= 85 and sat > .5:
        return CORAL
    if raw in ('25c5df', '22d3ee', '21bfd7', '29aec6'):
        return TURQUOISE
    if 175 <= hue <= 245 and sat > .06:
        if light < .14:
            return ABYSS
        if light < .23:
            return '#0C3B50'
        if light < .37:
            return '#315E6B'
        if light < .61:
            if sat > .6:
                return CORAL if dark_shell else '#087C6D'
            return '#A8C4C2' if dark_shell else '#526D73'
        if light < .83:
            return TURQUOISE if sat > .5 else '#BED4CE'
        if light < .93:
            return '#DCD3BE'
        return '#FFF9ED'
    return value


def css_theme(css, dark_shell=False):
    css = re.sub(r'#[0-9a-fA-F]{3,8}\b', lambda m: color(m[0], dark_shell), css)
    css = re.sub(r'(?<=[: ,])white\b', IVORY, css)
    # Brand glows and translucent lime accents; retain alpha and geometry.
    css = re.sub(r'rgba?\(\s*202\s*,\s*255\s*,\s*0\s*,', 'rgba(255,113,91,', css)
    css = re.sub(r'rgba?\(\s*(?:47,159,230|19,167,255|22,168,255|37,197,223)\s*,', 'rgba(54,214,180,', css)
    return css


TOKENS = '''
/* PlayersHype · Coral Abisal. Mantillas, sedas y estados conservan su semántica. */
:root{--ph-abyss:#062E44;--ph-coral:#FF715B;--ph-turquoise:#36D6B4;--ph-ivory:#FFF0CF}
:focus-visible{outline:3px solid #36D6B4;outline-offset:3px}
'''
SHELL_FIX = '''
.btn.primary,.primary{background:#FF715B;border-color:#FF715B;color:#062E44}
.btn.primary:hover,.primary:hover{background:#FF8A77;color:#062E44}
.navbtn.active{color:#FF715B}
'''
WEB_FIX = '''
#refresh,.wx-refresh{background:#FF715B;border-color:#FF715B;color:#062E44}
.screen-nav a.active{background:#062E44;color:#FFF0CF;border-color:#062E44;box-shadow:inset 0 -3px 0 #FF715B}
.page-kicker,.section-heading,.page-heading,.block-title{color:#062E44}
.race-page .quick-cell.select{background:#FFE3CC;border-color:#FF715B}
.race-page .board-table tbody tr:first-child{background:#E1F6E9}
.hm-open,.hm-actions .primary{background:#FF715B;border-color:#FF715B;color:#062E44}
.scorebar i{background:linear-gradient(90deg,#36D6B4,#FF715B)}
.wx-state{border-color:#36D6B4;color:#36D6B4}
'''


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
        path.write_text(source.replace('#07111D', ABYSS))
    for name in ('SecureActivity.java', 'MainActivity.java'):
        for path in root.rglob(name):
            source = path.read_text()
            source = source.replace('Color.rgb(7,17,29)', 'Color.rgb(6,46,68)')
            source = source.replace('Color.rgb(13,33,51)', 'Color.rgb(12,59,80)')
            source = source.replace('b.setTextColor(Color.WHITE)', 'b.setTextColor(Color.rgb(255,240,207))')
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
        gradle.write_text(gradle.read_text().replace('versionCode 5', 'versionCode 6').replace("versionName '1.3.1'", "versionName '1.3.2'"))
    native_theme(root)
    audit = root / 'scripts/v131_static_audit.py'
    audit.write_text(audit.read_text().replace('version code 5', 'version code 6').replace('versionCode 5', 'versionCode 6').replace('version 1.3.1', 'version 1.3.2').replace("versionName '1.3.1'", "versionName '1.3.2'"))


if __name__ == '__main__':
    main()
