'use strict';
// Prüfprogramm für die echte Hülle: lädt main.js wie die App und prüft von innen (keine Fernsteuerung von außen —
// die Hülle verweigert --remote-debugging-*, und die Fuses sperren --inspect). Aufruf über verify-desktop.mjs.
// Gibt je Prüfung eine Zeile "R <json>" aus, nie Tresor- oder Zwischenablage-Inhalte.
const {app,BrowserWindow,Menu,session,clipboard,ClipboardItem,shell}=require('electron');
const path=require('path'); const fs=require('fs'); const net=require('net'); const dgram=require('dgram');
require('./main.js');
const opened=[]; shell.openExternal=async u=>{ opened.push(u); };   // nie wirklich den Browser öffnen, nur mitschreiben

const STEP=process.env.AP_STEP, PP=process.env.AP_PP||'';
const KDE_HINT='electron application/osclipboard;format="x-kde-passwordManagerHint"';
const R=(name,ok,info)=>console.log('R '+JSON.stringify({name,ok:!!ok,info:info===undefined?null:info}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let win=null;
const js=code=>win.webContents.executeJavaScript(code,true);
async function until(code,ms=40000){ const t0=Date.now(); while(Date.now()-t0<ms){ try{ if(await js(code)) return true; }catch(_){} await sleep(100); } return false; }
const visible=id=>`(()=>{const n=document.getElementById(${JSON.stringify(id)});return !!n&&!n.classList.contains('hidden');})()`;
const fill=(id,v)=>js(`(()=>{const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(v)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const click=sel=>js(`document.querySelector(${JSON.stringify(sel)}).click()`);
const DATA=path.join(process.env.XDG_DATA_HOME,'alien-pass'), VAULT=path.join(DATA,'vault.aipv');

async function fresh(){
  R('lädt nur app://alienpass/index.html', win.webContents.getURL()==='app://alienpass/index.html', win.webContents.getURL());
  R('kein Node im Renderer', await js(`typeof require==='undefined'&&typeof process==='undefined'&&typeof module==='undefined'`));
  const keys=await js(`Object.keys(window.AlienDesktop).sort().join(',')`);
  R('Brücke hat genau clip, onBackground, onLock, saveBackup, store', keys==='clip,onBackground,onLock,saveBackup,store', keys);
  R('fetch nach außen scheitert', await js(`fetch('https://example.org/').then(()=>false,()=>true)`));
  R('window.open verweigert', await js(`window.open('https://example.org/')===null`));
  await js(`location.href='https://example.org/'`).catch(()=>{}); await sleep(600);
  R('Navigation verweigert', win.webContents.getURL()==='app://alienpass/index.html', win.webContents.getURL());
  // Links: nur die feste Liste (Spendenseite DE/EN) geht an den System-Browser, alles andere verpufft (Querfund Alien Notes v1.6)
  // openOutside lässt höchstens einen Link je Sekunde durch → vor jedem erwarteten Öffnen 1,1 s Abstand
  const tryOpen=async(u,how)=>{ await sleep(1100); opened.length=0;
    if(how==='open') await js(`window.open(${JSON.stringify(u)})`); else await js(`location.href=${JSON.stringify(u)}`).catch(()=>{});
    await sleep(300); return opened.slice(); };
  const onApp=()=>win.webContents.getURL()==='app://alienpass/index.html';
  for(const u of ['https://alien-investor.org/spenden.html','https://alien-investor.org/en/spenden.html'])
    { const o=await tryOpen(u,'open'); R('Link extern geöffnet: '+u, o.length===1&&o[0]===u, o); }
  { const o=await tryOpen('https://alien-investor.org/en/spenden.html','nav');
    R('Link per Navigation extern, Seite bleibt', o.length===1&&o[0]==='https://alien-investor.org/en/spenden.html'&&onApp(), o); }
  { await sleep(1100); R('window.open auf Listen-Link liefert trotzdem kein Fenster (deny)', await js(`window.open('https://alien-investor.org/spenden.html')===null`)&&BrowserWindow.getAllWindows().length===1, BrowserWindow.getAllWindows().length); }
  { const o=await tryOpen('HTTPS://ALIEN-INVESTOR.ORG:443/spenden.html','open');
    R('nicht-kanonische Schreibweise geht als kanonischer href hinaus', o.length===1&&o[0]==='https://alien-investor.org/spenden.html', o); }
  for(const [l,want] of [['de','https://alien-investor.org/spenden.html'],['en','https://alien-investor.org/en/spenden.html']]){
    await sleep(1100); opened.length=0; await js(`setLang(${JSON.stringify(l)}); document.getElementById('donate-link').click()`); await sleep(300);
    R('Spenden-Blitz extern geöffnet ('+l+')', opened.length===1&&opened[0]===want&&onApp(), opened.slice()); }
  await js(`setLang('de')`);
  { await sleep(1100); opened.length=0; await js(`for(let i=0;i<20;i++) window.open('https://alien-investor.org/spenden.html')`); await sleep(400);
    R('Fensterflut gedrosselt (20 × window.open → 1)', opened.length===1&&BrowserWindow.getAllWindows().length===1, {n:opened.length,win:BrowserWindow.getAllWindows().length}); }
  for(const u of ['https://example.org/','https://alien-investor.org/anderes.html','https://alien-investor.org/spenden.html/../x','http://alien-investor.org/spenden.html','https://alien-investor.org.evil.com/spenden.html','file:///etc/passwd','javascript:alert(1)',
      'https://alien-investor.org/spenden.html?ref=x','https://alien-investor.org/spenden.html#x','https://user:pw@alien-investor.org/spenden.html','https://alien-investor.org:8443/spenden.html','https://www.alien-investor.org/spenden.html','https://alien-investor.org/spenden.html/',
      'https://evilalien-investor.org/spenden.html','https://alien-investor.org/spenden.htmlx','https://evil.example/alien-investor.org/spenden.html','https://evil.example/?u=https://alien-investor.org/spenden.html'])   // Suffix-/Teilstring-Vergleich (Release-Audit v1.18 C M4)
    for(const how of (u.startsWith('javascript:')?['open']:['open','nav']))   // javascript: per location.href liefe IM Renderer (alert blockiert), ist keine Navigation
      { const o=await tryOpen(u,how); R('Link verweigert ('+how+'): '+u, o.length===0&&onApp(), {o,url:win.webContents.getURL()}); }
  // Handler direkt, ohne Chromium dazwischen (das kanonisiert URLs schon vorher; did-start-navigation taugt nicht als Zähler, es feuert in Electron 44 auch für abgebrochene Navigationen): preventDefault, deny und der geprüfte href (Release-Audit v1.18 C M1–M3)
  { const h={}; let woh=null; const fake={on:(n,f)=>{ h[n]=f; },setWindowOpenHandler:f=>{ woh=f; },setWebRTCIPHandlingPolicy:()=>{}};
    try{ app.emit('web-contents-created',{},fake); }catch(e){ R('Handler direkt: Ausnahme',false,String(e)); }
    await sleep(1100); opened.length=0; let pd=0;
    if(h['will-navigate']) h['will-navigate']({preventDefault:()=>pd++},' HTTPS://ALIEN-INVESTOR.ORG:443/en/../spenden.html\t');
    R('will-navigate (direkt): preventDefault + kanonischer href', pd===1&&opened.length===1&&opened[0]==='https://alien-investor.org/spenden.html', {pd,opened:opened.slice()});
    await sleep(1100); opened.length=0; pd=0;
    if(h['will-navigate']) h['will-navigate']({preventDefault:()=>pd++},'https://example.org/');
    R('will-navigate (direkt): fremde Adresse → preventDefault, nichts geöffnet', pd===1&&opened.length===0, {pd,opened:opened.slice()});
    await sleep(1100); opened.length=0; const r=woh?woh({url:'https://alien-investor.org/en/spenden.html'}):null;
    R('setWindowOpenHandler (direkt): deny auch für Listen-Links', !!r&&r.action==='deny'&&opened.length===1, {r,opened:opened.slice()});
    await sleep(1100); opened.length=0; let n=0; for(let i=0;i<3;i++){ if(woh) woh({url:'https://alien-investor.org/spenden.html'}); await sleep(400); n=opened.length; }
    R('Bremse: drei Links im Abstand von 400 ms → 1', n===1, n); }
  const ses=session.defaultSession;
  const st=async u=>{ try{ return (await ses.fetch(u)).status; }catch(e){ return 'FEHLER'; } };
  R('Protokoll liefert index.html', await st('app://alienpass/index.html')===200);
  for(const u of ['app://alienpass/%2e%2e/main.js','app://alienpass/..%2fpackage.json','app://alienpass/vendor/../../main.js','app://anders/index.html','app://alienpass/app.js.map'])
    { const c=await st(u); R('Protokoll verweigert '+u, c===404||c==='FEHLER', c); }   // FEHLER = schon vom Netzfilter verworfen
  R('Hauptprozess erreicht kein Netz (webRequest)', await st('https://example.org/')==='FEHLER');
  R('kein Anwendungsmenü', Menu.getApplicationMenu()===null);
  R('Fenster-Icon gesetzt (Taskleiste, Alt+Tab)', fs.existsSync(path.join(__dirname,'icon.png'))&&fs.readFileSync(path.join(__dirname,'main.js'),'utf8').includes("icon:ICON"));
  R('.desktop StartupWMClass = package.json name (KDE ordnet das Fenster sonst nicht zu)', (()=>{ try{ const d=fs.readFileSync(path.join(__dirname,'..','..','flatpak','org.alieninvestor.pass.desktop'),'utf8'); return /^StartupWMClass=alien-pass$/m.test(d); }catch(_){ return 'n/a'; } })());

  // WebRTC (Audit run-6 #7): weder UDP-STUN noch TURN über TCP darf den Prozess verlassen — hier an eigene Empfänger auf 127.0.0.1
  { const u=dgram.createSocket('udp4'); let udp=0; u.on('message',()=>udp++); await new Promise(r=>u.bind(0,'127.0.0.1',r));
    let tcp=0; const t=net.createServer(c=>{ tcp++; c.destroy(); }); await new Promise(r=>t.listen(0,'127.0.0.1',r));
    const up=u.address().port, tp=t.address().port;
    const cand=await js(`(async()=>{ let n=0; try{ const pc=new RTCPeerConnection({iceServers:[{urls:'stun:127.0.0.1:${up}'},{urls:'turn:127.0.0.1:${tp}?transport=tcp',username:'u',credential:'p'}]});
      pc.onicecandidate=e=>{ if(e.candidate) n++; }; pc.createDataChannel('x'); await pc.setLocalDescription(await pc.createOffer()); await new Promise(r=>setTimeout(r,4000)); pc.close(); }catch(e){ return 'ERR '+e.message; } return n; })()`);
    R('WebRTC: kein UDP nach außen', udp===0, {udp,cand}); R('WebRTC: kein TCP/TURN nach außen', tcp===0, {tcp,cand});
    u.close(); t.close(); }
  const wp=win.webContents.getLastWebPreferences();
  R('Sandbox, Kontext-Isolation, kein Node', wp.sandbox===true&&wp.contextIsolation===true&&wp.nodeIntegration===false, {sandbox:wp.sandbox,contextIsolation:wp.contextIsolation,nodeIntegration:wp.nodeIntegration});
  win.webContents.openDevTools(); await sleep(400);   // am Verhalten prüfen, nicht an den gemeldeten Einstellungen
  R('DevTools lassen sich nicht öffnen', !win.webContents.isDevToolsOpened());
  R('Rechtschreibprüfung aus (lädt sonst aus dem Netz)', ses.isSpellCheckerEnabled()===false);
  R('keine Drosselung im Hintergrund (Sperr-/Lösch-Timer)', win.webContents.getBackgroundThrottling()===false);

  // Fremder Frame mit derselben Brücke: jeder Aufruf muss abgewiesen werden
  const w2=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'preload.js'),sandbox:true,contextIsolation:true}});
  await w2.loadURL('data:text/html,<p>fremd</p>');
  const foreign=await w2.webContents.executeJavaScript(`(async()=>{const r=[];
    try{AlienDesktop.store.read();r.push('read-OK')}catch(e){r.push('read-DENIED')}
    try{AlienDesktop.store.write('x');r.push('write-OK')}catch(e){r.push('write-DENIED')}
    try{await AlienDesktop.clip.write({text:'x'});r.push('clip-OK')}catch(e){r.push('clip-DENIED')}
    try{await AlienDesktop.saveBackup('a.vault','x');r.push('save-OK')}catch(e){r.push('save-DENIED')}
    return r.join(',');})()`,true);
  R('fremder Frame: alle Brücken-Aufrufe abgewiesen', foreign==='read-DENIED,write-DENIED,clip-DENIED,save-DENIED', foreign);
  w2.destroy();

  // Zwischenablage: Hinweis gesetzt, eigene Kopie wird gelöscht, fremde bleibt
  const M1='ap-harness-'+process.pid+'-a', M2='ap-harness-'+process.pid+'-b';
  await js(`AlienDesktop.clip.write({text:${JSON.stringify(M1)}})`);
  R('Kopie trägt den KDE-Hinweis', await clipboard.has(KDE_HINT)&&(await clipboard.readText())===M1);
  await js(`AlienDesktop.clip.clear()`);
  R('eigene Kopie gelöscht', (await clipboard.readText())!==M1);
  await js(`AlienDesktop.clip.write({text:${JSON.stringify(M1)}})`);
  await clipboard.write([new ClipboardItem({'text/plain':new Blob([M2],{type:'text/plain'}),[KDE_HINT]:new Blob(['secret'])})]);   // „Nutzer kopiert etwas anderes“
  await js(`AlienDesktop.clip.clear()`);
  R('fremde Kopie bleibt stehen', (await clipboard.readText())===M2);
  await clipboard.clear();

  // X11-Auswahl (Mittelklick): eigene Markierung wird mitgelöscht, fremde bleibt (Gerätetest 22.09.2026)
  const M3='ap-harness-'+process.pid+'-sel', M4='ap-harness-'+process.pid+'-fremd';
  await clipboard.selection.writeText(M3); await js(`AlienDesktop.clip.selected(${JSON.stringify(M3)})`); await js(`AlienDesktop.clip.clear()`);
  R('eigene Markierung aus der Auswahl gelöscht', (await clipboard.selection.readText())!==M3);
  await js(`AlienDesktop.clip.selected(${JSON.stringify(M3)})`); await clipboard.selection.writeText(M4); await js(`AlienDesktop.clip.clear()`);
  R('fremde Markierung bleibt stehen', (await clipboard.selection.readText())===M4);
  await clipboard.selection.clear();

  // Tresor anlegen über die Oberfläche → Datei statt Browser-Speicher
  R('ohne Datei: Einrichtung', await until(visible('screen-setup'),15000));
  await until(`/ms/.test(document.getElementById('setup-bench').textContent)`,30000);   // Argon2-Messung abwarten
  await fill('setup-pass1',PP); await fill('setup-pass2',PP); await click('#setup-btn');
  R('Tresor angelegt', await until(visible('screen-app')));
  await click('button[data-action="newEntry"]'); await sleep(200);
  await fill('f-title','Harness Eintrag'); await fill('f-user','harness-nutzer'); await fill('f-pass','harness-geheim-5r7t'); await click('#add-btn');
  R('Eintrag gespeichert', await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Harness Eintrag')`,10000));
  let stF=null, stD=null; try{ stF=fs.statSync(VAULT); stD=fs.statSync(DATA); }catch(_){}
  R('Tresor-Datei existiert', !!stF);
  R('Datei 600, Ordner 700', !!stF&&(stF.mode&0o777)===0o600&&(stD.mode&0o777)===0o700, stF&&{file:(stF.mode&0o777).toString(8),dir:(stD.mode&0o777).toString(8)});
  R('keine Temp-Reste', fs.readdirSync(DATA).every(n=>n==='vault.aipv'), fs.readdirSync(DATA));
  R('Datei ist AIPV1 und enthält keinen Klartext', (()=>{ const s=fs.readFileSync(VAULT,'utf8'); let j=null; try{ j=JSON.parse(s); }catch(_){} return !!j&&j.magic==='AIPV1'&&!s.includes('harness-geheim')&&!s.includes('Harness Eintrag'); })());
  R('Tresor nicht im Browser-Speicher', await js(`localStorage.getItem('ai-pass-vault')===null`));

  // Strg+C auf Markiertem läuft über die Brücke: KDE-Hinweis gesetzt (sonst Klipper-Verlauf)
  // wie eine echte Maus-Markierung: der Fokus verlässt ein Eingabefeld (sonst liest selText dessen leere Auswahl und Chromium kopiert selbst — sporadisch, Lehre Alien Notes v1.6)
  await js(`(()=>{ if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); const n=[...document.querySelectorAll('#entry-list .entry .t')].find(x=>x.textContent==='Harness Eintrag'); const r=document.createRange(); r.selectNodeContents(n); const g=getSelection(); g.removeAllRanges(); g.addRange(r); document.execCommand('copy'); g.removeAllRanges(); })()`);
  await sleep(400);
  R('Strg+C: Kopie mit KDE-Hinweis', await clipboard.has(KDE_HINT)&&(await clipboard.readText())==='Harness Eintrag', {hint:await clipboard.has(KDE_HINT),len:(await clipboard.readText()).length,foc:win.isFocused(),dfoc:await js('document.hasFocus()'),ae:await js(`(document.activeElement&&(document.activeElement.tagName+'#'+document.activeElement.id))`)});
  await clipboard.clear();

  // Strg+X (Audit run-7 #1): Ausschneiden läuft ebenfalls über die Brücke, der Text verschwindet aus dem Feld
  const M5='ap-harness-'+process.pid+'-cut';
  await click('button[data-action="newEntry"]'); await sleep(300);
  await js(`(()=>{ const n=document.getElementById('f-notes'); n.value='vor '+${JSON.stringify(M5)}; n.focus(); n.setSelectionRange(4,n.value.length); })()`);
  win.webContents.cut(); await sleep(500);
  R('Strg+X: Kopie mit KDE-Hinweis', await clipboard.has(KDE_HINT)&&(await clipboard.readText())===M5);
  R('Strg+X: Text aus dem Feld entfernt', await js(`document.getElementById('f-notes').value==='vor '`));
  await js(`AlienDesktop.clip.clear()`); await sleep(200);
  R('Strg+X: Kopie wird wieder gelöscht', (await clipboard.readText())!==M5);
  await clipboard.clear(); await js(`App.tab('list')`).catch(()=>{});
}
async function restart(){
  R('Neustart: Sperrbildschirm statt Einrichtung', await until(visible('screen-lock'),15000)&&!(await js(visible('screen-setup'))));
  // Markierte Passphrase auf dem Sperrbildschirm (Audit run-7 #2): wird gemeldet und beim Entsperren aus der Auswahl gelöscht.
  // Die Auswahl setzt hier das Prüfprogramm selbst (wie X11 beim Markieren) — geprüft wird, dass die App sie als eigene meldet.
  await fill('lock-pass',PP);
  // Chromium legt auch die Markierung des MASKIERTEN Feldes im Klartext in PRIMARY (echte Eingabe: Strg+A über sendInputEvent, Messung 23.09.2026)
  await clipboard.selection.writeText('vorher-'+process.pid);
  await js(`document.getElementById('lock-pass').focus(); true`); await sleep(200);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'A',modifiers:['control']});
  await sleep(500);
  R('Sperrbildschirm: Strg+A im maskierten Feld legt die Passphrase in PRIMARY (Chromium) — darum muss die App sie melden', (await clipboard.selection.readText())===PP);
  await click('#unlock-btn');
  R('entsperrt mit der Passphrase', await until(visible('screen-app')));
  R('Eintrag aus der Datei da', await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Harness Eintrag')`,10000));
  await sleep(500);
  R('Sperrbildschirm: markierte Passphrase nach dem Entsperren aus der Auswahl', (await clipboard.selection.readText())!==PP);
  await clipboard.selection.clear();
  // Auge beim Tippen (v1.17): Chromium setzt beim type-Wechsel die Auswahl auf 0 — echte Tasten und echter Mausklick aufs Auge
  const key=c=>{ win.webContents.sendInputEvent({type:'char',keyCode:c}); };
  const press=k=>{ win.webContents.sendInputEvent({type:'keyDown',keyCode:k}); win.webContents.sendInputEvent({type:'keyUp',keyCode:k}); };
  const eye=async()=>{ const r=await js(`(()=>{const b=document.querySelector('[data-showpass="f-pass"]').getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
    win.webContents.sendInputEvent({type:'mouseDown',x:r.x,y:r.y,button:'left',clickCount:1}); win.webContents.sendInputEvent({type:'mouseUp',x:r.x,y:r.y,button:'left',clickCount:1}); await sleep(300); };
  const cur=()=>js(`(()=>{const f=document.getElementById('f-pass');return {v:f.value,s:f.selectionStart,e:f.selectionEnd,t:f.type,foc:document.activeElement===f};})()`);
  await js(`App.newEntry(); true`); await sleep(400); await js(`document.getElementById('f-pass').focus(); true`); await sleep(100);
  for(const c of 'abcdef') key(c); await sleep(200);
  await eye(); key('X'); await sleep(200);
  { const c=await cur(); R('Auge beim Tippen: Cursor bleibt am Ende (aufdecken)', c.v==='abcdefX'&&c.s===7&&c.t==='text'&&c.foc, {s:c.s,t:c.t,foc:c.foc,len:c.v.length}); }
  press('Left'); press('Left'); await sleep(100); await eye(); key('Y'); await sleep(200);
  { const c=await cur(); R('Auge beim Tippen: Cursor mitten im Wort bleibt stehen (verdecken)', c.v==='abcdeYfX'&&c.s===6&&c.t==='password', {s:c.s,t:c.t,v_ok:c.v==='abcdeYfX'}); }
  // Markierte Passphrase + Auge auf → keine Klartext-Markierung, Cursor am Ende (Querfund Alien Notes Audit run-4 B-V1)
  if((await cur()).t!=='password') await eye();
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'A',modifiers:['control']}); await sleep(200);
  await eye(); await sleep(200);
  { const c=await cur(); R('Auge auf bei markierter Passphrase: keine Klartext-Markierung, Cursor am Ende', c.t==='text'&&c.s===c.e&&c.e===c.v.length&&c.foc, {s:c.s,e:c.e,t:c.t,len:c.v.length}); }
  // Tab in das gefüllte, maskierte Passwortfeld (Release-Audit v1.18 B-1): Chromium markiert den ganzen Inhalt → muss gemeldet und beim Sperren gelöscht werden
  await eye(); await sleep(100);
  await clipboard.selection.writeText('vorher-tab-'+process.pid);
  const TABV='tab-wert-'+process.pid;   // eigener Wert: der Auge-Test oben hat 'abcdeYfX' per Strg+A schon gemeldet, die Hülle räumte ihn sonst ohnehin
  await js(`(()=>{ const p=document.getElementById('f-pass'); p.value=${JSON.stringify(TABV)}; p.dispatchEvent(new Event('input',{bubbles:true})); const f=document.getElementById('f-email'); f.value='tab@example.org'; f.focus(); return true; })()`); await sleep(150);
  press('Tab'); await sleep(500);
  { const c=await cur(); R('Tab ins Passwortfeld: Feld maskiert und ganz markiert (Ausgangslage)', c.t==='password'&&c.foc&&c.s===0&&c.e===c.v.length, {s:c.s,e:c.e,t:c.t,foc:c.foc}); }
  R('Tab ins Passwortfeld: Chromium legt den Wert in PRIMARY (Messung)', (await clipboard.selection.readText())===TABV);
  await js(`App.lockNow(); true`); await sleep(600);
  R('Tab ins Passwortfeld: nach dem Sperren nicht mehr in PRIMARY (gemeldet + gelöscht)', (await clipboard.selection.readText())==='');   // clearOwned leert, kein anderer Text (R2-3)
  await clipboard.selection.clear();
  // Wie am Gerät (03.10.2026): Tab ins Passwortfeld, Fensterwechsel (Gegenprobe im Editor), zurück, echte Klicks auf „Einstellungen“ und „Jetzt sperren“
  { await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
    await js(`App.newEntry(); true`); await sleep(400);
    const V='geraet-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('f-pass'); p.value=${JSON.stringify(V)}; p.dispatchEvent(new Event('input',{bubbles:true})); const f=document.getElementById('f-email'); f.value='geraet@example.org'; f.focus(); return true; })()`); await sleep(150);
    await clipboard.selection.writeText('vorher-geraet-'+process.pid);
    press('Tab'); await sleep(500);
    const inP=(await clipboard.selection.readText())===V;
    win.blur(); await sleep(400); win.focus(); await sleep(400);
    const realClick=async sel=>{ const r=await js(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); b.scrollIntoView({block:'center'}); const q=b.getBoundingClientRect(); return {x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`);
      win.webContents.sendInputEvent({type:'mouseDown',x:r.x,y:r.y,button:'left',clickCount:1}); win.webContents.sendInputEvent({type:'mouseUp',x:r.x,y:r.y,button:'left',clickCount:1}); await sleep(400); };
    await realClick('button.tab[data-tab="settings"]'); await realClick('button[data-action="lockNow"]'); await sleep(500);
    R('Wie am Gerät (Tab, Fensterwechsel, Klick Einstellungen + Jetzt sperren): Wert war in PRIMARY und ist danach weg', inP&&(await js(visible('screen-lock')))&&(await clipboard.selection.readText())==='', {inP,prim:(await clipboard.selection.readText()).length});
    await clipboard.selection.clear(); }
  // Markiertes Feld, Fokus per Mausklick woanders (Kästchen), dann Strg+C: Kopie über die Brücke mit KDE-Hinweis, nicht Chromium selbst (Runde 4)
  { await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
    await js(`App.newEntry(); true`); await sleep(400);
    const V='kopie-'+process.pid;
    await js(`(()=>{ const u=document.getElementById('f-user'); u.value=${JSON.stringify(V)}; u.focus(); u.select(); return true; })()`); await sleep(200);
    const r=await js(`(()=>{const b=document.getElementById('f-nowarn'); b.scrollIntoView({block:'center'}); const q=b.getBoundingClientRect(); return {x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`);
    win.webContents.sendInputEvent({type:'mouseDown',x:r.x,y:r.y,button:'left',clickCount:1}); win.webContents.sendInputEvent({type:'mouseUp',x:r.x,y:r.y,button:'left',clickCount:1}); await sleep(300);
    const ae=await js(`document.activeElement&&document.activeElement.id`);
    await clipboard.clear(); win.webContents.copy(); await sleep(500);
    R('Feld markiert, Klick aufs Kästchen, Strg+C: Kopie über die Brücke (KDE-Hinweis, echter Wert)', ae==='f-nowarn'&&await clipboard.has(KDE_HINT)&&(await clipboard.readText())===V, {ae,hint:await clipboard.has(KDE_HINT),len:(await clipboard.readText()).length});
    await js(`AlienDesktop.clip.clear()`); await sleep(200); await clipboard.clear(); await clipboard.selection.clear();
    await js(`App.lockNow(); true`); await sleep(400); }
  // Gehaltenes Tab (Runde 2, R2-1): keyDown wiederholt sich, der Fokus wandert über f-pass weiter auf das Auge, keyup kommt erst auf dem Knopf an
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.newEntry(); true`); await sleep(400);
  const HOLDV='halte-tab-'+process.pid;
  await js(`(()=>{ const p=document.getElementById('f-pass'); p.value=${JSON.stringify(HOLDV)}; p.dispatchEvent(new Event('input',{bubbles:true})); const f=document.getElementById('f-email'); f.value='halt@example.org'; f.focus(); return true; })()`); await sleep(150);
  await clipboard.selection.writeText('vorher-halt-'+process.pid);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'}); await sleep(120); win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'}); await sleep(120);
  const ae=await js(`(document.activeElement&&(document.activeElement.className||document.activeElement.id))`);
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'}); await sleep(400);
  R('Tab gehalten: Fokus über f-pass hinaus auf das Auge, Wert in PRIMARY (Messung)', /pw-eye/.test(ae)&&(await clipboard.selection.readText())===HOLDV, {ae});
  await js(`App.lockNow(); true`); await sleep(600);
  R('Tab gehalten: nach dem Sperren nicht mehr in PRIMARY', (await clipboard.selection.readText())==='');
  await clipboard.selection.clear();
  // Varianten ohne Pause (Runde 3 N-3): zwei Tab-keyDowns direkt hintereinander bzw. Tab + sofort ein Zeichen, je vor dem Loslassen
  for(const [name,seq] of [['zwei Tabs ohne Pause',['Tab','Tab']],['Tab + sofort getippt',['Tab','char']]]){
    await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
    await js(`App.newEntry(); true`); await sleep(400);
    const V='schnell-'+seq.join('')+'-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('f-pass'); p.value=${JSON.stringify(V)}; p.dispatchEvent(new Event('input',{bubbles:true})); const f=document.getElementById('f-email'); f.value='schnell@example.org'; f.focus(); return true; })()`); await sleep(150);
    await clipboard.selection.writeText('vorher-schnell-'+process.pid);
    for(const k of seq) if(k==='char') win.webContents.sendInputEvent({type:'char',keyCode:'x'}); else win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'}); await sleep(400);
    const inP=(await clipboard.selection.readText())===V;
    await js(`App.lockNow(); true`); await sleep(600);
    R('Schnell ('+name+'): Wert war in PRIMARY und ist nach dem Sperren weg', inP&&(await clipboard.selection.readText())==='', {inP});
    await clipboard.selection.clear(); }
  await js(`App.tab('list')`).catch(()=>{}); await sleep(300);
}
// Sperre beim Minimieren (Audit run-6 #1): backgroundThrottling:false schaltet visibilitychange ab, die Hülle meldet selbst
async function background(){
  R('Hintergrund: Sperrbildschirm', await until(visible('screen-lock'),15000));
  await fill('lock-pass',PP); await click('#unlock-btn'); R('Hintergrund: entsperrt', await until(visible('screen-app')));
  await js(`App.setAutolock('0')`); await js(`App.setBgLock('0')`); await sleep(600);
  win.minimize(); const locked=await until(visible('screen-lock'),5000);
  R('Minimieren sperrt bei „sofort“ (Inaktivität aus)', locked);
  win.restore(); await sleep(400);
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.setBgLock('30')`); await sleep(600);
  win.minimize(); await sleep(1200); win.restore(); await sleep(600);
  R('kurz minimiert bei 30 s: bleibt entsperrt', await js(visible('screen-app')));
  await fill('lock-pass','x'); win.hide(); await sleep(600); win.show(); await sleep(400);   // zweites Signal-Paar: verstecken/zeigen
  R('Verstecken leert getippte Eingaben', await js(`document.getElementById('lock-pass').value===''`));
  // Fensterwechsel (Audit run-8 #9): die Hülle meldet 'blur', die App leert nur Gate-Eingaben und sperrt nicht
  R('Hülle verdrahtet blur', require('fs').readFileSync(require('path').join(__dirname,'main.js'),'utf8').includes("win.on('blur',bg('blur'))"));
  await js(`App.tab('settings')`); await fill('cp-cur','halb-getippt'); win.webContents.send('bg','blur'); await sleep(400);
  R('Fensterwechsel leert getippte Passphrase, sperrt nicht', await js(`document.getElementById('cp-cur').value===''`)&&await js(visible('screen-app')));
  await js(`App.tab('list')`);
  // Minimiert, während Argon2 noch läuft (Audit run-7, Härtung): bei „sofort“ darf der Tresor danach nicht offen stehen
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.setBgLock('0')`); await sleep(600); await js(`App.lockNow()`); await until(visible('screen-lock'),5000);
  await fill('lock-pass',PP); await click('#unlock-btn'); win.minimize(); await sleep(4000); win.restore(); await sleep(600);
  R('während des Entsperrens minimiert: bleibt gesperrt', await js(visible('screen-lock'))&&!(await js(visible('screen-app'))));
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.setBgLock('30')`); await js(`App.setAutolock('2')`); await sleep(600);
}
async function unreadable(){
  R('Lesefehler: keine Einrichtung', await until(visible('screen-lock'),15000)&&!(await js(visible('screen-setup'))));
  R('Lesefehler: Meldung', /nicht lesbar|not readable/.test(await js(`document.getElementById('lock-err').textContent`)));
  await fill('lock-pass',PP); await click('#unlock-btn'); await sleep(800);
  R('Lesefehler: Entsperren bleibt gesperrt', await js(visible('screen-lock'))&&!(await js(visible('screen-app'))));
}

app.on('browser-window-created',(_e,w)=>{ if(win) return; win=w;
  w.webContents.once('did-finish-load',async()=>{
    try{
      await until(`document.readyState==='complete'&&typeof App!=='undefined'`,15000); await js('void (window.confirm=()=>true)');   // Rückfragen bestätigen (kein Dialog im Test)
      if(STEP==='fresh') await fresh(); else if(STEP==='restart') await restart(); else if(STEP==='unreadable') await unreadable();
      else if(STEP==='background') await background();
      else if(STEP==='hold'){ R('läuft',true); await sleep(Number(process.env.AP_HOLD||8000)); }
    }catch(e){ R('Ausnahme im Prüfprogramm',false,String(e&&e.stack||e)); }
    app.exit(0);
  });
});
