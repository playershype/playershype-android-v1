from pathlib import Path
import sys
import subprocess
import xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
manifest=(R/'app-user/src/main/AndroidManifest.xml').read_text()
main=(R/'shared/src/main/java/com/playershype/shared/SecureActivity.java').read_text()
html=(R/'app-user/src/main/assets/index.html').read_text()
net=(R/'shared/src/main/res/xml/network_security_config.xml').read_text()
checks={
'only INTERNET permission': manifest.count('<uses-permission')==1 and 'android.permission.INTERNET' in manifest,
'cleartext disabled manifest':'android:usesCleartextTraffic="false"' in manifest,
'backup disabled':'android:allowBackup="false"' in manifest,
'network cleartext disabled':'cleartextTrafficPermitted="false"' in net,
'webview debugging disabled':'setWebContentsDebuggingEnabled(false)' in main,
'file access disabled':'setAllowFileAccess(false)' in main,
'content access disabled':'setAllowContentAccess(false)' in main,
'file URL universal access disabled':'setAllowUniversalAccessFromFileURLs(false)' in main,
'file URL access disabled':'setAllowFileAccessFromFileURLs(false)' in main,
'mixed content disabled':'MIXED_CONTENT_NEVER_ALLOW' in main,
'no addJavascriptInterface bridge':'addJavascriptInterface' not in main,
'SSL fail closed':'h.cancel()' in main,
'safe browsing back to safety':'backToSafety(true)' in main,
'safe browsing explicitly enabled':'setSafeBrowsingEnabled(true)' in main,
'external navigation uses browser':'Intent.ACTION_VIEW' in main and 'Intent.CATEGORY_BROWSABLE' in main and 'UrlPolicy.isAllowedExternal' in main,
'CSP present':'Content-Security-Policy' in html,
'HTTPS connect only':'connect-src https:' in html,
}
domains={'root','file','database','sharedpref','external'}
backup=ET.fromstring((R/'shared/src/main/res/xml/backup_rules.xml').read_text())
extraction=ET.fromstring((R/'shared/src/main/res/xml/data_extraction_rules.xml').read_text())
for name,node in [('backup exclusions',backup),('cloud extraction exclusions',extraction.find('cloud-backup')),('device transfer exclusions',extraction.find('device-transfer'))]:
    checks[name]=node is not None and domains <= {e.get('domain') for e in node.findall('exclude') if e.get('path')=='.'}
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines()
checks['no signing keys tracked']=not any(p.lower().endswith(('.keystore','.jks','.p12','.pfx')) for p in tracked)
gradle=(R/'app-user/build.gradle').read_text()
checks['preview passwords from environment']="storePassword System.getenv('PREVIEW_STORE_PASSWORD')" in gradle and "keyPassword System.getenv('PREVIEW_KEY_PASSWORD')" in gradle
admin=(R/'app-admin/src/main/AndroidManifest.xml').read_text()
checks['admin cleartext disabled']='android:usesCleartextTraffic="false"' in admin
checks['admin backup disabled']='android:allowBackup="false"' in admin
checks['two independent application modules']=all("id 'com.android.application'" in (R/m/'build.gradle').read_text() for m in ['app-user','app-admin'])
checks['distinct application IDs']="applicationId 'com.playershype.app'" in gradle and "applicationId 'com.playershype.admin'" in (R/'app-admin/build.gradle').read_text()
import json,re
contract=(R/'core-contract/public-projection.json').read_bytes()
checks['single synchronized public projection']=contract==(R/'shared/src/main/assets/public-projection.json').read_bytes()
seed=json.loads((R/'app-user/src/main/assets/hypepredict/public-seed.json').read_text())
forbidden={'promptMaestro','hypeScoreWeights','postmortem','postRaceCalibration','rawSources','operationalNotes','calibrationNotes','baseScore','tacticalAdjustment','components'}
def private_fields(value):
    if isinstance(value,dict):return any(k in forbidden or private_fields(v) for k,v in value.items())
    if isinstance(value,list):return any(private_fields(v) for v in value)
    return False
checks['public seed excludes private fields']=not private_fields(seed)
checks['bounded native actions']=all(x in (R/'shared/src/main/java/com/playershype/shared/ExportController.java').read_text() for x in ['32*1024*1024','Unknown action','ACTION_CREATE_DOCUMENT','ACTION_OPEN_DOCUMENT'])
checks['native messages restricted to main frame and asset origin']=all(x in main for x in ['!main','!ORIGIN.equals(source.toString())','Collections.singleton(ORIGIN)','data.length()>300000'])
for module in ['app-user','app-admin']:
    for path in (R/module/'src/main/assets').rglob('*.html'):
        text=path.read_text(encoding='utf8')
        checks[f'{module}/{path.name}: packaged scripts only']=bool(re.search(r"script-src 'self';",text)) and not re.search(r'<script(?![^>]*(?:src=|application/json))[^>]*>\s*[^<\s]',text,re.I)
adminjs=(R/'app-admin/src/main/assets/hypepredict/module.js').read_text(encoding='utf8')
checks['legacy permanent bearer persistence removed']='HP_LIVE_TOKEN_STORAGE' not in adminjs and 'hpLivePublishToken' not in adminjs
checks['admin packaged without private workspace']=bool(re.search(r'<script[^>]*id="embeddedData"[^>]*>\[\]</script>',(R/'app-admin/src/main/assets/hypepredict/admin.html').read_text(encoding='utf8')))
for k,v in checks.items():print(('PASS' if v else 'FAIL'),'-',k)
if not all(checks.values()):sys.exit(1)
print(f'PASS: {sum(checks.values())} controls')
