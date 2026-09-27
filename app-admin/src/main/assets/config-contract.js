/* Shared validation of local drafts only. Server validation remains mandatory. */
(function(root){
'use strict';
const definitions={
 home:{title:'App Home',description:'Hero y orden de módulos.',initial:{schemaVersion:1,hero:{title:'No seguimos el hype. Lo creamos.',subtitle:''},modules:['tracks','predict','live','tv','latest']}},
 tracks:{title:'Hipódromos',description:'Registro de hipódromos. Las jornadas se editan en el HUB.',initial:{schemaVersion:1,items:[]}},
 live:{title:'Player Live',description:'Estado y enlace HTTPS de la transmisión.',initial:{schemaVersion:1,status:'offline',title:'Player Live',url:''}},
 tv:{title:'PlayersHype TV',description:'Programación y enlaces HTTPS.',initial:{schemaVersion:1,items:[]}},
 latest:{title:'Latest',description:'Contenido editorial y enlaces HTTPS.',initial:{schemaVersion:1,items:[]}},
 sponsors:{title:'Sponsors',description:'Patrocinios y destinos HTTPS.',initial:{schemaVersion:1,items:[]}},
 registry:{title:'Prompt / Config Registry',description:'Versiones privadas para nuevas ejecuciones. Nunca cambia jornadas selladas.',initial:{schemaVersion:1,version:'draft-1',compatibleSchema:1,prompt:'',config:{}}}
};
function validate(kind,data){
 if(!definitions[kind]||!data||Array.isArray(data)||data.schemaVersion!==1)throw Error('Schema incompatible');
 if(JSON.stringify(data).length>262144)throw Error('Borrador demasiado grande');
 const allowed=Object.keys(definitions[kind].initial);for(const k of Object.keys(data))if(!allowed.includes(k))throw Error('Campo desconocido: '+k);
 function inspect(v,depth=0){if(depth>16)throw Error('Profundidad excesiva');if(typeof v==='string'&&(/<\/?(?:script|iframe|object)\b|javascript:|data:text\/html/i.test(v)))throw Error('Contenido ejecutable bloqueado');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(/token|password|secret|authorization/i.test(k))throw Error('No guardar credenciales en borradores');if(/url|image/i.test(k)&&x){let u;try{u=new URL(x)}catch{throw Error('URL inválida')};if(u.protocol!=='https:'||u.username||u.password)throw Error('Solo HTTPS sin credenciales');}inspect(x,depth+1);}}
 inspect(data);
 if('items' in definitions[kind].initial){if(!Array.isArray(data.items)||data.items.length>200)throw Error('Lista inválida');const ids=new Set();for(const x of data.items){if(!x||typeof x.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(x.id)||ids.has(x.id))throw Error('ID inválido o repetido');ids.add(x.id);}}
 if(kind==='home'&&(!data.hero||typeof data.hero.title!=='string'||!Array.isArray(data.modules)||data.modules.some(x=>!['tracks','predict','live','tv','latest'].includes(x))))throw Error('Home incompatible');
 if(kind==='live'&&!['offline','scheduled','live','ended'].includes(data.status))throw Error('Estado Live inválido');
 if(kind==='registry'&&(data.compatibleSchema!==1||typeof data.prompt!=='string'||!data.version))throw Error('Compatibility gate rechazado');
 return JSON.parse(JSON.stringify(data));
}
root.ConfigContract=Object.freeze({definitions,validate});
})(typeof window==='undefined'?globalThis:window);
