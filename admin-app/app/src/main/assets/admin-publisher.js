(function(){
'use strict';
if(typeof window==='undefined')return;

function nativeReady(){return !!(window.HypeAndroid&&typeof window.HypeAndroid.publishConfig==='function')}

window.forgetToken=function(){
  try{
    if(nativeReady()&&typeof window.HypeAndroid.clearPublisher==='function')window.HypeAndroid.clearPublisher();
    try{localStorage.removeItem('playershype:admin:v01:githubToken')}catch(_){}
    if(typeof status==='function')status('Credencial GitHub eliminada de este Admin APK.','ok');
  }catch(e){if(typeof status==='function')status('No pude borrar la credencial local.','bad')}
};

window.publishNow=function(){
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
      const token=(window.prompt('Conecta GitHub una sola vez. Pega la credencial de publicación:')||'').trim();
      if(!token)throw new Error('Publicación cancelada: falta la credencial GitHub.');
      if(!window.HypeAndroid.configurePublisher(token))throw new Error('No se pudo guardar la credencial de publicación.');
      try{localStorage.removeItem('playershype:admin:v01:githubToken')}catch(_){}
    }
    if(typeof status==='function')status('PUBLICANDO · preservando jornadas existentes y actualizando config…');
    window.HypeAndroid.publishConfig(JSON.stringify(readyCandidate));
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
