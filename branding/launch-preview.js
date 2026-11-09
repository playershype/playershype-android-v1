(()=>{'use strict';
 const screen=document.getElementById('phLaunch'),app=document.querySelector('.app'),replay=document.getElementById('phReplay');
 let timer=null;
 function hide(){screen.hidden=true;screen.classList.remove('play');if(app){app.inert=false;app.removeAttribute('inert')}replay.hidden=false;timer=null;}
 function show(){if(timer!==null)clearTimeout(timer);if(app){app.inert=true;app.setAttribute('inert','')}screen.hidden=false;replay.hidden=true;screen.classList.remove('play');void screen.offsetWidth;screen.classList.add('play');timer=setTimeout(hide,2500);}
 replay.addEventListener('click',show);show();
})();
