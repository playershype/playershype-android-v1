"""Export a standalone review of generated Home assets; not an Android APK."""
from pathlib import Path
import argparse,base64,hashlib,json,re,mimetypes

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('preview',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
user=a.source/'app-user/src/main/assets';shared=a.source/'shared/src/main/assets'
html=(user/'index.html').read_text();js=(user/'home.js').read_text();config=json.loads((a.preview/'home-config.json').read_text())
images={}
for f in (user/'media').glob('*'):
    images['/assets/media/'+f.name]='data:'+str(mimetypes.guess_type(f.name)[0])+';base64,'+base64.b64encode(f.read_bytes()).decode()
def mapped(v):
    if isinstance(v,dict):return {k:mapped(x) for k,x in v.items()}
    if isinstance(v,list):return [mapped(x) for x in v]
    return images.get(v,v) if isinstance(v,str) else v
config=mapped(config)
start=js.index('async function loadPackagedConfig(');end=js.index('\nfunction resolveCore',start)
js=js[:start]+"async function loadPackagedConfig(){return JSON.parse(document.getElementById('homeReviewData').textContent)}"+js[end:]
start=js.index(' async function read(){');end=js.index('\n let lastHome=',start)
js=js[:start]+" async function read(){return loadPackagedConfig()}"+js[end:]
target='https://playershype.github.io/playershype-android-v1/hypepredict/'
js=js.replace('/navigate/predict',target).replace('/navigate/results',target+'#resultados')
html=html.replace('/navigate/predict',target).replace('/navigate/results',target+'#resultados')
for key,value in images.items():js=js.replace(key,value);html=html.replace(key,value)
html=re.sub(r'<script\b[^>]*src=["\'][^"\']+["\'][^>]*></script>','',html)
data=json.dumps(config,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html=html.replace('</body>','<script id="homeReviewData" type="application/json">'+data+'</script><script>'+js+'</script></body>')
digest=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode()
html=re.sub(r'script-src [^;]+;',"script-src 'sha256-"+digest+"';",html,count=1)
html=html.replace('connect-src https:',"connect-src 'none'")
html=html.replace('<title>PlayersHype</title>','<title>PlayersHype · Propuesta de Inicio</title>')
html=html.replace('PlayersHype · Definiendo el estándar.</span>','Propuesta de revisión · no es un APK.</span>')
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(html)
print(a.output.resolve(),len(html.encode()),'bytes; standalone Home snapshot')
