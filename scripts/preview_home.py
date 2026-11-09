"""Prepare an ignored browser QA tree from generated public assets and current public data."""
from pathlib import Path
import argparse,json,shutil
from datetime import datetime
from zoneinfo import ZoneInfo

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--output',type=Path,default=Path('.preview'));a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=a.output;assets=out/'assets';assets.mkdir(parents=True,exist_ok=True)
user=a.source/'app-user/src/main/assets';shared=a.source/'shared/src/main/assets'
for name in ['home.js']:
    shutil.copy(user/name,assets/name)
js=(assets/'home.js').read_text().replace("fetch('/core/home-config'", "fetch('/home-config.json'")
(assets/'home.js').write_text(js)
shutil.copy(shared/'public-app-config.json',assets/'public-app-config.json')
for name in ['media','branding']:
    if (user/name).exists():shutil.copytree(user/name,assets/name,dirs_exist_ok=True)
if (shared/'native/bridge.js').exists():
    (assets/'native').mkdir(exist_ok=True);shutil.copy(shared/'native/bridge.js',assets/'native/bridge.js')
html=(user/'index.html').read_text().replace('connect-src https:', "connect-src 'self' https:").replace('; upgrade-insecure-requests','')
(out/'index.html').write_text(html)  # HTTP QA only; the shipped native CSP is unchanged.
c=json.loads((root/'docs/app/config.json').read_text());date=datetime.now(ZoneInfo('America/Puerto_Rico')).date().isoformat()
small={k:c[k] for k in ['schemaVersion','revision','home','live','channels','tv','latest'] if k in c}
small['hypepredict']={k:v for k,v in c.get('hypepredict',{}).items() if k in ['title','description','image','version']}
small['homeDate']=date;small['tracks']=[]
for t in c.get('tracks',[]):
    raw=c.get('raceDays',{}).get(t['id'],[]);days=raw if isinstance(raw,list) else raw.get('days',[raw]);published=set()
    for day in days:
        if day.get('date')==date:
            for race in day.get('races',[]):
                if c['hypepredict']['analyses'].get(race['id'],{}).get('status')=='published':published.add(race['id'])
    if published:small['tracks'].append({**t,'date':date,'publishedRaces':len(published),'races':len(published)})
small['__sync']={'origin':'cached'}
(out/'core').mkdir(exist_ok=True);(out/'core/home-config').write_text(json.dumps(small,ensure_ascii=False))
(out/'home-config.json').write_text(json.dumps(small,ensure_ascii=False))
shutil.copytree(root/'docs/hypepredict',out/'hypepredict',dirs_exist_ok=True)
(out/'app').mkdir(exist_ok=True);shutil.copy(root/'docs/app/config.json',out/'app/config.json')
nav=out/'navigate/predict';nav.mkdir(parents=True,exist_ok=True)
(nav/'index.html').write_text('<!doctype html><meta charset="utf-8"><script>location.replace("/hypepredict/"+location.search)</script>')
(out/'mobile.html').write_text('''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PlayersHype · Propuesta de Inicio</title><style>body{background:#071322;color:#e0fbfc;font:15px system-ui;margin:0}header{padding:22px;text-align:center}header b{color:#64ffda;letter-spacing:.1em}header p{color:#bcebf2;font-size:12px}main{display:flex;gap:30px;justify-content:center;align-items:flex-start;padding:0 20px 24px}.screen h2{font-size:13px;color:#bcebf2;font-weight:600}iframe{width:390px;height:940px;border:5px solid #29415f;border-radius:18px;background:#0a192f}@media(max-width:860px){main{flex-wrap:wrap}.screen,iframe{max-width:100%;box-sizing:border-box}}</style><header><b>PLAYERSHYPE · INICIO</b><p>Propuesta funcional · datos publicados · página del hero</p></header><main><section class="screen"><h2>Inicio · jornada y accesos</h2><iframe title="Inicio móvil" src="/"></iframe></section><section class="screen"><h2>Al tocar el hero · página propia</h2><iframe title="Página del hero" src="/#destacado"></iframe></section></main></html>''')
print('QA Home:',out.resolve(),'date',date,'tracks',len(small['tracks']))
