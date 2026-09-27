"""CI-only QA signing. Never writes secrets to the checkout or logs."""
import base64,os,pathlib,re,secrets,subprocess
keys=['QA_KEYSTORE_BASE64','QA_STORE_PASSWORD','QA_KEY_ALIAS','QA_KEY_PASSWORD']
values=[os.environ.get(k,'') for k in keys]
if any(values) and not all(values):raise SystemExit('Configure all four QA secrets or none.')
key=pathlib.Path(os.environ['RUNNER_TEMP'])/'playershype-qa.jks'
if all(values):
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,80}',values[2]):raise SystemExit('Invalid QA alias')
    key.write_bytes(base64.b64decode(values[0],validate=True))
    store,password,alias=values[1],values[3],values[2]
    mode='Stable QA key supplied by repository secrets; never a production key.'
else:
    store,password,alias=secrets.token_hex(32),secrets.token_hex(32),'preview'
    mode='EPHEMERAL QA KEY: uninstall older Preview before installing this build. Export local Admin work first.'
for value in [store,password]:
    if '\n' in value or '\r' in value:raise SystemExit('QA passwords must be single-line')
    print('::add-mask::'+value)
env=dict(os.environ,PREVIEW_STORE_PASSWORD=store,PREVIEW_KEY_PASSWORD=password)
if not all(values):
    subprocess.run(['keytool','-genkeypair','-noprompt','-storetype','JKS','-keystore',str(key),'-alias',alias,'-keyalg','RSA','-keysize','3072','-validity','365','-dname','CN=PlayersHype Preview QA','-storepass:env','PREVIEW_STORE_PASSWORD','-keypass:env','PREVIEW_KEY_PASSWORD'],env=env,check=True)
with open(os.environ['GITHUB_ENV'],'a') as f:
    for k,v in dict(PREVIEW_KEYSTORE=str(key),PREVIEW_STORE_PASSWORD=store,PREVIEW_KEY_PASSWORD=password,PREVIEW_KEY_ALIAS=alias).items():f.write(k+'='+v+'\n')
pathlib.Path('artifacts').mkdir(exist_ok=True)
pathlib.Path('artifacts/SIGNING.txt').write_text(mode+'\n')
print(mode)
