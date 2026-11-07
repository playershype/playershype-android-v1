"""Keep the public reader, snapshot and future Admin exports on one experience."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def transform(html):
    js = (ROOT / 'android-sync/assets/experience.js').read_text().rstrip()
    css = (ROOT / 'android-sync/assets/experience.css').read_text().rstrip()
    if '/* PH_EXPERIENCE_START:' in html:
        html = re.sub(r'/\* PH_EXPERIENCE_START:[\s\S]*?/\* PH_EXPERIENCE_END \*/', lambda _: js, html, count=1)
        html = re.sub(r'/\* PH_EXPERIENCE_START \*/[\s\S]*?/\* PH_EXPERIENCE_END \*/', lambda _: css, html, count=1)
        return html.replace('q.gap||risk.gap||"No disponible"', 'q.gap??risk.gap??"No disponible"')
    for name, following in [('fullCheckList', 'raceCard'), ('hpHorseProfile', 'hpOpenHorse')]:
        start = html.index('function ' + name + '(')
        end = html.index('\nfunction ' + following + '(', start)
        html = html[:start] + html[end:]
    # One inline script is deliberately retained: apply_sync extracts it for native/export.
    start = html.index('<script>') + len('<script>')
    html = html[:start] + '\n' + js + '\n' + html[start:]
    html = html.replace('</style>', '\n' + css + '\n</style>', 1)
    old = "'<div class=\"quick-cell '+hpEsc(variant)+'\"><div class=\"slot\">'"
    new = "'<button type=\"button\" class=\"quick-cell xp-quick '+hpEsc(variant)+'\" data-xp-pick=\"'+hpEsc(h.programNumber)+'\" aria-label=\"Ver perfil de '+hpEsc(h.name)+'\"><div class=\"slot\">'"
    if old not in html:
        raise RuntimeError('Quick Hits source changed; refusing partial update')
    html = html.replace(old, new, 1)
    html = html.replace('/ 10</span></div></div>\';', '/ 10</span></div><span class="xp-quick-cta">Ver perfil ↗</span></button>\';', 1)
    for value in ['q.decision||risk.decision||"No disponible"', 'risk.decision||q.decision||"Sin decisión"']:
        html = html.replace('esc(' + value + ')', 'esc(xpLabel(' + value + '))')
    html = html.replace('hpEsc(f[1])', 'hpEsc(f[0]==="DECISIÓN"?xpLabel(f[1]):f[1])')
    return html.replace('q.gap||risk.gap||"No disponible"', 'q.gap??risk.gap??"No disponible"')

if __name__ == '__main__':
    for path in ['docs/hypepredict/index.html', 'docs/app/index.html']:
        target = ROOT / path
        target.write_text(transform(target.read_text()))
        print('Experience applied:', path)
