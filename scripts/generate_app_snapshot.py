"""Seed the separate app route from the existing published config, without editing it."""
from pathlib import Path
import argparse,json,gzip,hashlib,base64
p=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--output',type=Path,default=p/'docs/app/index.html');args=a.parse_args()
raw=(p/'docs/app/config.json').read_bytes();config=json.loads(raw)
# Generate the same independent reader template that the Admin packages.
template=(p/'.v131/PlayersHype-Ecosystem-V1.3.1-RC/shared/src/main/assets/sync/dashboard-export.html').read_text()
envelope={'schemaVersion':1,'revision':config['revision'],'sha256':hashlib.sha256(raw).hexdigest(),'encoding':'gzip-base64','data':base64.b64encode(gzip.compress(raw,mtime=0)).decode()}
html=template.replace('</head>','<script id="phPublishedConfig" type="application/json">'+json.dumps(envelope,separators=(',',':'))+'</script></head>')
args.output.write_text(html);print('App route generated:',config['revision'],'bytes',args.output.stat().st_size)
