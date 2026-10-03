(function(){
'use strict';
if(typeof window==='undefined')return;

function nativeReady(){return !!(window.HypeAndroid&&typeof window.HypeAndroid.publishConfig==='function')}

function credentialDialog(){
  return new Promise(resolve=>{
    let old=document.getElementById('phGithubCredentialOverlay');
    if(old)old.remove();
    const overlay=document.createElement('div');
    overlay.id='phGithubCredentialOverlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px';
    const card=document.createElement('div');
    card.style.cssText='width:min(520px,100%);background:#0b1d30;border:1px solid #28445f;border-radius:20px;padding:20px;color:#f4f7fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.55)';
    card.innerHTML='<div style="font-size:11px;font-weight:900;letter-spacing:.12em;color:#59d8f5">PUBLICACIÓN SEGURA</div><div style="font-size:23px;font-weight:950;margin-top:7px">Configurar GitHub</div><p style="color:#aeb9c7;line-height:1.45;margin:9px 0 14px">Pega tu credencial de publicación. Se guarda cifrada solamente dentro de este Admin y no se escribe en el config ni en el repositorio.</p><input id="phGithubCredentialInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_… o ghp_…" style="width:100%;border:1px solid #3b607f;background:#06182a;color:#f4f7fb;border-radius:14px;padding:15px;font:14px ui-monospace,SFMono-Regular,Menlo,monospace"><div id="phGithubCredentialError" style="min-height:18px;margin-top:8px;color:#ff9393;font-size:12px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><button id="phGithubCancel" style="padding:14px;border:0;border-radius:14px;background:#17314a;color:#59d8f5;font-weight:950">CANCELAR</button><button id="phGithubSave" style="padding:14px;border:0;border-radius:14px;background:#b7e600;color:#07111d;font-weight:950">GUARDAR</button></div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const input=card.querySelector('#phGithubCredentialInput');
    const error=card.querySelector('#phGithubCredentialError');
    const close=value=>{overlay.remove();resolve(value)};
    card.querySelector('#phGithubCancel').onclick=()=>close(false);
    card.querySelector('#phGithubSave').onclick=()=>{
      const token=(input.value||'').trim();
      if(token.length<20){error.textContent='La credencial parece incompleta.';input.focus();return;}
      try{
        if(!nativeReady()||typeof window.HypeAndroid.configurePublisher!=='function'){error.textContent='Este APK no tiene disponible el publisher seguro.';return;}
        if(!window.HypeAndroid.configurePublisher(token)){error.textContent='No se pudo guardar la credencial. Revisa el token e inténtalo otra vez.';return;}
        try{localStorage.removeItem('playershype:admin:v01:githubToken')}catch(_){}
        close(true);
      }catch(e){error.textContent='No se pudo guardar la credencial en este dispositivo.';}
    };
    overlay.onclick=e=>{if(e.target===overlay)close(false)};
    setTimeout(()=>{input.focus();},80);
  });
}

window.configureGitHub=async function(){
  if(!nativeReady()){if(typeof status==='function')status('CONFIGURACIÓN DETENIDA · instala el Admin APK actualizado.','bad');return false;}
  const ok=await credentialDialog();
  if(typeof status==='function')status(ok?'GITHUB CONFIGURADO · credencial guardada de forma segura.':'Configuración GitHub cancelada.',ok?'ok':'');
  return ok;
};

window.forgetToken=async function(){
  try{
    if(nativeReady()&&typeof window.HypeAndroid.clearPublisher==='function')window.HypeAndroid.clearPublisher();
    try{localStorage.removeItem('playershype:admin:v01:githubToken')}catch(_){}
    if(typeof status==='function')status('Credencial GitHub eliminada. Configura la nueva credencial para continuar.');
    return await window.configureGitHub();
  }catch(e){if(typeof status==='function')status('No pude cambiar la credencial local.','bad');return false;}
};

window.publishNow=async function(){
  const btn=document.getElementById('publishBtn');
  try{
    if(btn)btn.disabled=true;
    if(typeof setFlow==='function')setFlow(3);
    if(typeof status==='function')status('PUBLICANDO · validando paquete internamente…');
    if(!readyCandidate&&typeof processInput==='function')processInput();
    if(!readyCandidate)throw new Error('No hay candidato listo.');
    const errors=typeof validateCandidate==='function'?validateCandidate(readyCandidate):[];
    if(errors&&errors.length)throw new Error(errors[0]);
    if(!nativeReady())throw new Error('La publicación segura requiere el Admin APK actualizado.');
    if(!window.HypeAndroid.isPublisherConfigured()){
      if(typeof status==='function')status('CONFIGURAR GITHUB · pega la credencial una sola vez.');
      const configured=await credentialDialog();
      if(!configured)throw new Error('Publicación cancelada: falta la credencial GitHub.');
    }
    if(typeof status==='function')status('PUBLICANDO · preservando jornadas existentes y actualizando config…');
    let publishCandidate=readyCandidate;
    try{
      if(typeof window.HypeAndroid.getPublishedConfig==='function'&&typeof mergePublishedCandidate==='function'){
        const raw=window.HypeAndroid.getPublishedConfig();
        if(raw)publishCandidate=mergePublishedCandidate(JSON.parse(raw),readyCandidate);
      }
    }catch(e){throw new Error('No pude preservar las jornadas publicadas: '+(e&&e.message?e.message:e));}
    window.HypeAndroid.publishConfig(JSON.stringify(publishCandidate));
  }catch(e){
    if(typeof setFlow==='function')setFlow(2);
    if(typeof status==='function')status('PUBLICACIÓN DETENIDA · '+(e&&e.message?e.message:e),'bad');
    if(btn)btn.disabled=!readyCandidate;
  }
};

window.onNativePublishResult=function(ok,message){
  const btn=document.getElementById('publishBtn');
  if(ok){
    if(typeof setFlow==='function')setFlow(3);
    if(typeof status==='function')status('PUBLICADO · '+(message||'config remoto confirmado.'),'ok');
  }else{
    if(typeof setFlow==='function')setFlow(2);
    if(typeof status==='function')status('PUBLICACIÓN DETENIDA · '+(message||'Producción no fue modificada.'),'bad');
  }
  if(btn)btn.disabled=!readyCandidate;
};
})();
