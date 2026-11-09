"""Apply the reviewed security controls after the retained theme and sync overlays."""
from pathlib import Path
import argparse,hashlib,json,shutil,urllib.request,zipfile,io,re,ast
P=Path(__file__).resolve().parents[1]
def replace(path,old,new):
 s=path.read_text()
 if old not in s:raise RuntimeError('Security patch source mismatch: '+str(path)+' / '+old[:70])
 path.write_text(s.replace(old,new))
def core_hash(audit,text):
 tree=ast.parse(audit.read_text());fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='protected_core');scope={};exec(compile(ast.Module(body=[fn],type_ignores=[]),'core_check','exec'),scope);return hashlib.sha256(scope['protected_core'](text)).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('source',type=Path);ap.add_argument('--archive',type=Path);a=ap.parse_args();r=a.source.resolve();shared=r/'shared/src/main';java=shared/'java/com/playershype/shared'
 for p in (P/'security/java').glob('*.java'):shutil.copy(p,java/p.name)
 for p in (P/'security/tests').glob('*.java'):shutil.copy(p,r/'shared/src/test/java/com/playershype/shared'/p.name)
 export=java/'ExportController.java';replace(export,'files.put(new JSONObject().put("name",filename)', 'ImportPolicy.validate(filename,type,bytes.toByteArray());\n          files.put(new JSONObject().put("name",filename)')
 # Reject oversized/deep JSON before Android's recursive parser, including the envelope.
 pub=java/'PublishedConfig.java'
 replace(pub,'JSONObject e=new JSONObject(m.group(1));','JSONObject e=JsonBounds.object(m.group(1),LIMIT);')
 replace(pub,'validate(new JSONObject(new String(json,StandardCharsets.UTF_8)))','validate(JsonBounds.object(new String(json,StandardCharsets.UTF_8),LIMIT))')
 replace(pub,'(token|password|secret|authorization|promptMaestro','(api[-_]?key|access[-_]?key|credential|private[-_]?key|token|password|secret|authorization|promptMaestro')
 replace(java/'AtomicGitPublisher.java','PublishedConfig.validate(new JSONObject(json))','PublishedConfig.validate(JsonBounds.object(json,PublishedConfig.LIMIT))')
 replace(java/'PublishController.java','new JSONObject(new String(readAll(source,MAX),StandardCharsets.UTF_8))','JsonBounds.object(new String(readAll(source,MAX),StandardCharsets.UTF_8),MAX)')
 # Also reject private-key field names in both browser-side publication gates.
 for p in [shared/'assets/sync/publication.js',r/'app-admin/src/main/assets/config-contract.js']:
  replace(p,'/token|password|secret|authorization','/api[-_]?key|access[-_]?key|credential|private[-_]?key|token|password|secret|authorization')
 # Defense headers belong to actual native responses; no pretend GitHub Pages headers file.
 secure=java/'SecureActivity.java'
 replace(secure,'h.put("X-Content-Type-Options","nosniff");','h.put("X-Content-Type-Options","nosniff");h.put("Referrer-Policy","no-referrer");h.put("X-Frame-Options","DENY");h.put("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=()");h.put("Cross-Origin-Resource-Policy","same-origin");')
 replace(secure,'if(!main||!ORIGIN.equals(source.toString())||!UrlPolicy.isInternal(view.getUrl()))return;', 'if(!main||!ORIGIN.equals(source.toString())||!UrlPolicy.isInternal(view.getUrl())){android.util.Log.w("PlayersHypeSecurity","Rejected native message: origin/frame");return;}')
 replace(secure,'toast("Operación bloqueada por seguridad");','android.util.Log.w("PlayersHypeSecurity","Rejected native action");toast("Operación bloqueada por seguridad");')
 # Serve pinned ES modules with an explicit JS MIME type on every supported Android version.
 replace(secure,'WebResourceResponse found=loader.shouldInterceptRequest(u);','if(path!=null&&(path.equals("/assets/vendor/pdf.mjs")||path.equals("/assets/vendor/pdf.worker.mjs"))){try(InputStream in=getAssets().open(path.substring(8))){return response("text/javascript",200,PublicFeedStore.read(in,8*1024*1024));}}\n          WebResourceResponse found=loader.shouldInterceptRequest(u);')
 manifest=json.loads((P/'security/vendor-manifest.json').read_text())['pdfjs'];raw=a.archive.read_bytes() if a.archive else urllib.request.urlopen(manifest['url'],timeout=90).read()
 if hashlib.sha256(raw).hexdigest()!=manifest['archive_sha256']:raise RuntimeError('PDF.js release integrity mismatch')
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  for name,digest in manifest['files'].items():
   b=z.read(name)
   if hashlib.sha256(b).hexdigest()!=digest:raise RuntimeError('PDF.js file integrity mismatch: '+name)
   dest=r/'app-admin/src/main/assets/vendor'/(Path(name).name if name!='LICENSE' else 'PDFJS-LICENSE.txt');dest.write_bytes(b)
 for role in ['app-admin','app-user']:
  for name in ['pdf.min.js','pdf.worker.min.js']:(r/role/'src/main/assets/vendor'/name).unlink(missing_ok=True)
 # Only the Admin imports PDFs. Keep the upgraded runtime out of the public reader.
 module=r/'app-admin/src/main/assets/hypepredict/module.js';s=module.read_text();audit=r/'scripts/v131_static_audit.py'
 if core_hash(audit,s)!='59705d564fe4c07dc445835b7df9f6b0805bec72c57fbb031213a10b4cd5324c':raise RuntimeError('Unexpected pre-security HypePredict core')
 s=s.replace("/assets/vendor/pdf.min.js","/assets/vendor/pdf.mjs").replace("/assets/vendor/pdf.worker.min.js","/assets/vendor/pdf.worker.mjs")
 start=s.index('function hpEnsurePdfLib(){');end=s.index('\nfunction hpPdfTextFromItems',start)
 s=s[:start]+'''function hpEnsurePdfLib(){
 if(window.pdfjsLib)return window.pdfjsLib;
 if(!hpPdfLibPromise)hpPdfLibPromise=import(HP_PDFJS_URL).then(lib=>{lib.GlobalWorkerOptions.workerSrc=HP_PDFWORKER_URL;window.pdfjsLib=lib;return lib}).catch(()=>{hpPdfLibPromise=null;throw new Error('No pude cargar el lector PDF seguro. Puedes pegar el análisis como texto.')});
 return hpPdfLibPromise;
}
'''+s[end:]
 start=s.index('async function hpExtractPdfTextCandidates(file){');end=s.index('\nfunction hpParsedCardScore(',start)
 s=s[:start]+'''async function hpExtractPdfTextCandidates(file){
 const lib=await hpEnsurePdfLib(),data=new Uint8Array(await file.arrayBuffer()),task=lib.getDocument({data,isEvalSupported:false,enableScripting:false,useWasm:false});
 try{
 const doc=await task.promise;if(doc.numPages>200)throw new Error('El PDF supera el límite de 200 páginas.');
 const seq=[],spatial=[],hybrid=[];let extractedSize=0;
 for(let p=1;p<=doc.numPages;p++){
  loadStatus.textContent=`Leyendo ${file.name}: página ${p}/${doc.numPages}…`;
  const page=await doc.getPage(p),content=await page.getTextContent(),mark=`\\n<<HP_PAGE_${p}>>\\n`;
  extractedSize+=content.items.reduce((n,it)=>n+String(it.str||'').length,0);if(extractedSize>5000000)throw new Error('El texto del PDF supera el límite permitido.');
  seq.push(mark+hpPdfTextFromItems(content.items));spatial.push(mark+hpPdfTextSpatial(content.items));hybrid.push(mark+hpPdfTextHybrid(content.items));
 }
 return [{mode:'sequential',text:seq.join('\\n')},{mode:'spatial',text:spatial.join('\\n')},{mode:'hybrid',text:hybrid.join('\\n')}];
 }finally{await task.destroy()}
}
'''+s[end:]
 s=s.replace('JSON.parse(', 'hpSafeJSONParse(')
 s='''function hpSafeJSONParse(text){return JSON.parse(text,(key,value)=>{if(key==='__proto__'||key==='prototype'||key==='constructor')throw new Error('El archivo contiene una clave de objeto no permitida.');return value})}\n'''+s
 module.write_text(s)
 approved=json.loads((P/'security/vendor-manifest.json').read_text())['protected_core_sha256']
 if core_hash(audit,s)!=approved:raise RuntimeError('Unexpected post-security HypePredict core')
 for role in ['app-user','app-admin']:
  p=r/role/'build.gradle';replace(p,'versionCode 8','versionCode 15');replace(p,"versionName '1.4.0'","versionName '1.4.7'")
 replace(audit,'versionCode 8','versionCode 15');replace(audit,"versionName '1.4.0'","versionName '1.4.7'")
 replace(audit,'59705d564fe4c07dc445835b7df9f6b0805bec72c57fbb031213a10b4cd5324c',approved)
 replace(audit,'HypePredict V1 core unchanged from V1.2','HypePredict V1 core matches reviewed security build');replace(audit,'app version code 8','app version code 15');replace(audit,'app version 1.4.0','app version 1.4.7')
 # Rebuildable source must enforce the same permanent identity as CI.
 (r/'security').mkdir(exist_ok=True)
 shutil.copy(P/'scripts/prepare_stable_signing.py',r/'scripts/prepare_ci_signing.py')
 shutil.copy(P/'security/signing-identity.json',r/'security/signing-identity.json')
 (r/'docs/SECURITY-BASELINE-27.md').write_text((P/'docs/security/SECURITY_BASELINE_27.md').read_text())
 print('Applied security baseline v1.4.7; pinned PDF.js '+manifest['version'])
if __name__=='__main__':main()
