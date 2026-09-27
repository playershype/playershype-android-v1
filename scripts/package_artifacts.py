"""Bundle verified APKs plus source and candid verification status; never local tools/keys."""
import hashlib,pathlib,subprocess,zipfile
r=pathlib.Path(__file__).resolve().parents[1];out=r/'artifacts';out.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
(out/'BUILD_COMMIT.txt').write_text(commit+'\n')
files=subprocess.check_output(['git','ls-files'],cwd=r,text=True).splitlines()
for role,module in [('App','app-user'),('Admin','app-admin')]:
    name=f'PlayersHype-{role}-V1-PREVIEW.apk';apk=out/name
    digest=hashlib.sha256(apk.read_bytes()).hexdigest();(out/(name+'.sha256')).write_text(digest+'  '+name+'\n');print(name,digest)
    with zipfile.ZipFile(out/f'PlayersHype-{role}-V1-MASTER-PACKAGE.zip','w',zipfile.ZIP_DEFLATED) as z:
        for extra in [apk,out/(name+'.sha256'),out/'BUILD_COMMIT.txt',out/'SIGNING.txt',out/f'{role}-signature.txt',out/f'{role}-metadata.txt']:
            if extra.exists():z.write(extra,extra.name)
        for report_module in [module,'shared']:
            report_root=r/report_module/'build'
            for folder in ['reports','test-results']:
                for report in (report_root/folder).rglob('*'):
                    if report.is_file():z.write(report,'verification/'+report_module+'/'+report.relative_to(report_root).as_posix())
        for report_name in ['security-audit.txt','ui-tests.txt']:
            report=out/report_name
            if report.exists():z.write(report,'verification/'+report_name)
        # Include full multi-module source so Gradle settings remain directly buildable.
        for f in files:
            path=r/f
            if path.is_file() and not f.lower().endswith(('.jks','.keystore','.p12','.pfx','.apk')):z.write(path,'source/'+f)
with zipfile.ZipFile(out/'PlayersHype-Ecosystem-V1-MASTER-PACKAGE.zip','w',zipfile.ZIP_DEFLATED) as z:
    for role in ['App','Admin']:
        p=out/f'PlayersHype-{role}-V1-MASTER-PACKAGE.zip';z.write(p,p.name)
    for p in (r/'docs').glob('*.md'):z.write(p,'docs/'+p.name)
