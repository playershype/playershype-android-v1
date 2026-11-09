'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),src=path.resolve(process.argv[2]||path.join(root,'.home-src/PlayersHype-Ecosystem-V1.3.1-RC')),file=process.argv[3];
const {JSDOM}=require(path.join(src,'scripts/ui-tests/node_modules/jsdom'));
const html=fs.readFileSync(file,'utf8'),dom=new JSDOM(html,{url:'https://preview.playershype.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
const timers=[];let requests=0;w.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length};w.clearTimeout=()=>{};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.fetch=async()=>{requests++;throw Error('No network expected')};
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(m[1]);const hash=crypto.createHash('sha256').update(m[1]).digest('base64');assert(html.includes("'sha256-"+hash+"'"));w.eval(m[1])}
(async()=>{
 await new Promise(r=>setImmediate(r));
 assert.equal(d.querySelector('#phLaunch').hidden,false);assert(d.querySelector('.app').hasAttribute('inert'));
 assert.equal(d.querySelector('#heroTitle').textContent.length>0,true,'Home renders behind branding');
 assert.equal(timers.filter(t=>t.ms===2500).length,1);assert.equal(requests,0);
 const logo=Buffer.from(d.querySelector('.launch-logo').src.split(',')[1],'base64');assert(logo.equals(fs.readFileSync(path.join(root,'branding/playershype-wordmark.webp'))));
 timers.find(t=>t.ms===2500).fn();assert.equal(d.querySelector('#phLaunch').hidden,true);assert(!d.querySelector('.app').hasAttribute('inert'));assert.equal(d.querySelector('#phReplay').hidden,false);
 d.querySelector('#phReplay').click();assert.equal(d.querySelector('#phLaunch').hidden,false);assert.equal(timers.filter(t=>t.ms===2500).length,2);
 assert(html.includes('prefers-reduced-motion:reduce'));assert(!html.includes('animation:ph-launch-exit infinite'));
 const native=fs.readFileSync(path.join(src,'shared/src/main/java/com/playershype/shared/SecureActivity.java'),'utf8');assert(native.includes('if(!isAdmin())LaunchSplash.attach(this,launchStage,root,state!=null)'));
 const logoPath=path.join(src,'app-user/src/main/assets/branding/playershype-wordmark.webp');assert(fs.readFileSync(logoPath).equals(logo));
 assert(!fs.existsSync(path.join(src,'app-admin/src/main/assets/branding/playershype-wordmark.webp')));
 w.close();console.log('PASS local logo, 2500 ms budget, background Home render, cleanup, replay, reduced-motion, CSP hashes and user-only native hook (DOM/static; not APK installation)');
})().catch(e=>{w.close();console.error(e);process.exit(1)});
