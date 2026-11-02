"""Bounded, redacted known-pattern scan; not a proof that arbitrary secrets cannot exist."""
from pathlib import Path
import subprocess,re,argparse,zipfile,io,json
P=Path(__file__).resolve().parents[1]
PATTERNS={
'github_token':re.compile(rb'(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9_]{30,255}|github_pat_[A-Za-z0-9_]{40,255})'),
'openai_key':re.compile(rb'(?<![A-Za-z0-9_])sk-(?:proj-)?[A-Za-z0-9_-]{32,255}'),
'aws_access_key':re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
'private_key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')}
findings=[];count=0;archives=0

def scan(data,label,depth=0):
 global count,archives
 count+=1
 for name,pattern in PATTERNS.items():
  if pattern.search(data):findings.append({'path':label,'pattern':name})
 if depth<2 and data.startswith(b'PK\x03\x04'):
  try:
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    members=[x for x in z.infolist() if not x.is_dir()];total=sum(x.file_size for x in members)
    if total>300*1024*1024:raise RuntimeError('Archive exceeds scan budget: '+label)
    archives+=1
    for m in members:
     if m.file_size>64*1024*1024:raise RuntimeError('Archive member exceeds scan budget: '+label+'!'+m.filename)
     scan(z.read(m),label+'!'+m.filename,depth+1)
  except zipfile.BadZipFile:pass

a=argparse.ArgumentParser();a.add_argument('--history',action='store_true');a.add_argument('--apk',action='append',default=[]);a.add_argument('--output',type=Path);args=a.parse_args()
if args.history:
 seen=set()
 for row in subprocess.check_output(['git','rev-list','--objects','--all'],cwd=P,text=True).splitlines():
  sha,_,name=row.partition(' ')
  if sha in seen:continue
  seen.add(sha)
  kind=subprocess.check_output(['git','cat-file','-t',sha],cwd=P,text=True).strip()
  if kind=='blob':scan(subprocess.check_output(['git','cat-file','blob',sha],cwd=P),sha[:12]+':'+name)
else:
 for name in subprocess.check_output(['git','ls-files'],cwd=P,text=True).splitlines():
  p=P/name
  if p.is_file():scan(p.read_bytes(),name)
for name in args.apk:scan(Path(name).read_bytes(),Path(name).name)
report={'scope':'reachable Git objects' if args.history else 'tracked working files','objects_scanned':count,'archives_scanned':archives,'patterns':list(PATTERNS),'findings':findings,'limits':'Recognized token/key patterns only; no account-side secret validation and no guarantee against unknown secret formats.'}
if args.output:args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False));raise SystemExit(bool(findings))
