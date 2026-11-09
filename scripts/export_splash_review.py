"""Attach an offline 2.5-second branding preview to the existing standalone Home review."""
from pathlib import Path
import argparse,base64,hashlib,re

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('home',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
html=a.home.read_text();css=(ROOT/'branding/launch-preview.css').read_text();js=(ROOT/'branding/launch-preview.js').read_text()
logo='data:image/webp;base64,'+base64.b64encode((ROOT/'branding/playershype-wordmark.webp').read_bytes()).decode()
screen='<div id="phLaunch" role="status" aria-label="PlayersHype. Definiendo el estándar."><div class="launch-brand"><div class="launch-kicker">LA MANADA</div><img class="launch-logo" src="'+logo+'" alt="PlayersHype" width="250" height="150"><div class="launch-accent" aria-hidden="true"></div><div class="launch-tagline">Definiendo el estándar.</div></div></div><button type="button" id="phReplay" hidden>Repetir entrada · demo 2.5 s</button>'
html=html.replace('</style>',css+'\n</style>',1).replace('<body>','<body>'+screen,1)
html=html.replace('</body>','<script>'+js+'</script></body>',1)
digest=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode()
html=re.sub(r'script-src ([^;]+);',lambda m:m.group(0)[:-1]+" 'sha256-"+digest+"';",html,count=1)
html=html.replace('PlayersHype · Propuesta de Inicio','PlayersHype · Entrada 2.5 segundos')
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(html)
print(a.output.resolve(),len(html.encode()),'bytes; local splash preview')
