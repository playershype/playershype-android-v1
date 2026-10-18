/* Runtime integration check: npm install playwright; CHROMIUM_PATH optional. */
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(root+'/docs/app/config.json'));
const server=http.createServer((req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const android=url.pathname.startsWith('/android/');
 const file=path.join(root,android?'app/src/main/assets':'docs/hypepredict',url.pathname.replace(/^\/(android|web)\//,''));
 let body=fs.readFileSync(file);if(android&&file.endsWith('.html')){
  body=body.toString();if(file.endsWith('predict.html'))body=body.replace('<script src="predict-dashboard.js">','<script src="remote-config.js"></script><script src="predict-dashboard.js">');
  else body=body.replace('</body>','<script src="race-history.js"></script><script src="remote-config.js"></script></body>');
 }
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html');res.end(body);
}catch(e){res.writeHead(404);res.end('Not found')}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu']}: {})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>{
  const u=route.request().url();if(u.startsWith(origin))return route.continue();
  if(u.includes('/main/docs/app/config.json'))return route.fulfill({json:config});
  return route.fulfill({status:404,body:''});
 });
 await context.addInitScript(c=>{
  window.__exports=[];window.PlayersHypeConfig={getConfig:()=>JSON.stringify(c),getSyncStatus:()=> 'ok',getRevision:()=>c.revision,getLastSync:()=>0,getWeather:()=>null,refresh:()=>window.onPlayersHypeConfigState?.(),exportFile:(name,mime,data)=>{window.__exports.push({name,mime,data});return true}};
 },config);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const date='2026-10-08',track='camarero',snapshot=config.raceDayHistory[track][date],race=snapshot.day.races[0],analysis=snapshot.analyses[race.id],horse=analysis.horses[0];
 await page.goto(origin+'/android/tracks.html?date='+date);await page.waitForSelector('#ph-hub-date');assert.equal(await page.locator('#ph-hub-date').inputValue(),date);
 const link=page.locator('a.ph-track[href*="track=camarero"]');assert.ok((await link.getAttribute('href')).includes('date='+date));await link.click();
 await page.waitForSelector('#ph-date-select');assert.equal(await page.locator('#ph-date-select').inputValue(),date);
 await page.locator('.tabs [data-v="r'+race.number+'"]').click();assert.ok(page.url().includes('race='+race.id));
 await page.locator('.horse[data-h="'+horse.entryId+'"]').click();assert.ok((await page.locator('#ph-v2-modal').innerText()).includes(horse.name));
 await page.locator('#horseTailBtn').click();await page.locator('#cmpSave').click();
 const exported=await page.evaluate(()=>JSON.parse(window.__exports.at(-1).data));assert.equal(exported.date,date);assert.equal(exported.left.name,horse.name);assert.equal(exported.left.hypeScore,horse.hypeScore);
 await page.locator('#ph-compare-modal .close').click();
 await page.locator('#ph-date-select').selectOption('2026-10-16');assert.ok(!page.url().includes('race='));assert.ok((await page.locator('#ph-track-select').innerText()).includes('Gulfstream'));
 await page.locator('#ph-track-select').selectOption('gulfstream');assert.equal(await page.locator('#ph-date-select').inputValue(),'2026-10-16');await page.reload();await page.waitForSelector('#ph-date-select');assert.equal(await page.locator('#ph-track-select').inputValue(),'gulfstream');
 await page.goto(origin+'/android/predict.html?date=1999-01-01&track=camarero');await page.getByText('Sin análisis para esta pista y fecha',{exact:true}).waitFor();assert.equal(await page.locator('.horse').count(),0);
 await page.goto(origin+'/android/predict.html?date='+date+'&track=camarero&race=wrong');await page.getByText('Carrera no disponible en esta jornada',{exact:true}).waitFor();await page.locator('#ph-back-day').click();await page.locator('.tabs').waitFor();
 await page.goto(origin+'/android/predict.html?date=2026-10-05&track=parx-racing');await page.waitForFunction(()=>document.querySelectorAll('.tabs [data-v]').length>3);
 assert.equal(await page.locator('#ph-date-select').inputValue(),'2026-10-05');
 await page.screenshot({path:'/tmp/ph-history-android.png',fullPage:false});
 for(const [t,entries] of Object.entries(config.raceDayHistory))for(const [d,s] of Object.entries(entries)){
  await page.goto(origin+'/web/index.html?date='+d+'&track='+t);await page.waitForSelector('.day-home');assert.equal(await page.locator('#date').inputValue(),d);assert.equal(await page.locator('#track').inputValue(),t);
  const first=s.day.races[0],a=s.analyses[first.id];await page.goto(origin+'/web/index.html?date='+d+'&track='+t+'&race='+first.id);await page.waitForSelector('#backRace');const text=await page.locator('#app').innerText();assert.ok(text.includes(a.horses[0].name),t+' '+d+' original horse');
 }
 await page.goto(origin+'/web/index.html?date='+date+'&track=camarero');await page.waitForSelector('.day-home');await page.locator('#refresh').click();await page.waitForSelector('.day-home');assert.equal(await page.locator('#date').inputValue(),date);
 await page.locator('#date').selectOption('2026-10-16');await page.locator('#track').selectOption('belmont');await page.goBack();await page.waitForFunction(()=>document.querySelector('#date')?.value==='2026-10-16');assert.equal(await page.locator('#date').inputValue(),'2026-10-16');await page.goBack();await page.waitForSelector('.day-home');assert.equal(await page.locator('#date').inputValue(),date);
 await page.goto(origin+'/web/index.html?date=1999-01-01&track=camarero');await page.getByText('No hay análisis para esta pista y fecha',{exact:true}).waitFor();assert.equal(await page.locator('#date').inputValue(),'1999-01-01');assert.equal(await page.locator('.race').count(),0);
 await page.goto(origin+'/web/index.html?date=2026-10-16&track=nonexistent');await page.getByText('No hay análisis para esta pista y fecha',{exact:true}).waitFor();
 await page.goto(origin+'/web/index.html?date='+date+'&track=camarero&race=wrong');await page.getByText('Carrera no disponible en esta jornada',{exact:true}).waitFor();
 await page.goto(origin+'/web/index.html?date=2026-10-05&track=parx-racing');await page.waitForSelector('.day-home');assert.equal(await page.locator('#track').inputValue(),'parx-racing');
 await page.goto(origin+'/web/index.html?date='+date+'&track=camarero');await page.waitForSelector('.day-home');await page.screenshot({path:'/tmp/ph-history-web.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log('PASS: Android Track Hub/date/race/profile/HypeMatch export; all archived web jornadas; refresh/back; missing track/date/race; legacy Parx; zero JS errors.');
}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
