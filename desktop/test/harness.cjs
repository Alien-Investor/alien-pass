'use strict';
// Prüfprogramm für die echte Hülle: lädt main.js wie die App und prüft von innen (keine Fernsteuerung von außen —
// die Hülle verweigert --remote-debugging-*, und die Fuses sperren --inspect). Aufruf über verify-desktop.mjs.
// Gibt je Prüfung eine Zeile "R <json>" aus, nie Tresor- oder Zwischenablage-Inhalte.
const {app,BrowserWindow,Menu,session,clipboard,ClipboardItem,shell,dialog}=require('electron');
const path=require('path'); const fs=require('fs'); const net=require('net'); const dgram=require('dgram');
require('./main.js');
const opened=[]; shell.openExternal=async u=>{ opened.push(u); };   // nie wirklich den Browser öffnen, nur mitschreiben
// Speichern-Dialog nie wirklich öffnen: Aufrufe mitschreiben, Antwort aus dlgNext (sonst „abgebrochen“) — Schritt sichern (v1.22, wie Alien Notes v1.12)
let dlgNext=null; const dlgCalls=[]; dialog.showSaveDialog=async(_w,o)=>{ dlgCalls.push(o); const n=dlgNext; dlgNext=null; return n||{canceled:true}; };

const STEP=process.env.AP_STEP, PP=process.env.AP_PP||'';
const KDE_HINT='electron application/osclipboard;format="x-kde-passwordManagerHint"';
const R=(name,ok,info)=>console.log('R '+JSON.stringify({name,ok:!!ok,info:info===undefined?null:info}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let win=null;
const js=code=>win.webContents.executeJavaScript(code,true);
async function until(code,ms=40000){ const t0=Date.now(); while(Date.now()-t0<ms){ try{ if(await js(code)) return true; }catch(_){} await sleep(100); } return false; }
async function restoreFocused(){ win.restore(); for(let i=0;i<30&&!win.isFocused();i++) await sleep(100); if(!win.isFocused()){ win.focus(); for(let i=0;i<30&&!win.isFocused();i++) await sleep(100); } await sleep(300); return win.isFocused()&&!win.isMinimized(); }
const prim=()=>clipboard.selection.readText();
const visible=id=>`(()=>{const n=document.getElementById(${JSON.stringify(id)});return !!n&&!n.classList.contains('hidden');})()`;
const fill=(id,v)=>js(`(()=>{const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(v)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const click=sel=>js(`document.querySelector(${JSON.stringify(sel)}).click()`);
const DATA=path.join(process.env.XDG_DATA_HOME,'alien-pass'), VAULT=path.join(DATA,'vault.aipv');

async function fresh(){
  R('lädt nur app://alienpass/index.html', win.webContents.getURL()==='app://alienpass/index.html', win.webContents.getURL());
  R('kein Node im Renderer', await js(`typeof require==='undefined'&&typeof process==='undefined'&&typeof module==='undefined'`));
  const keys=await js(`Object.keys(window.AlienDesktop).sort().join(',')`);
  R('Brücke hat genau clip, onBackground, onLock, saveBackup, store', keys==='clip,onBackground,onLock,saveBackup,store', keys);
  R('Scrollbalken im Neon-Look greift in der echten Hülle: (hover:hover) and (pointer:fine) trifft zu (Review v1.20 H-5)', await js(`matchMedia('(hover:hover) and (pointer:fine)').matches`));
  // Die Medienbedingung allein bliebe auch ohne Neon-Daumen grün (v1.23, Querfund BTC Steuertool v1.5 run-2 #9): im Handbuch 10 px Balkenbreite und im 10-px-Band
  // rechts Neon-Pixel zählen. Nur das Band aufnehmen (CSS-Pixel); die Aufnahme kommt in Gerätepixeln — Breite/Höhe aus dem Bitmap selbst (stimmt bei jeder Skalierung).
  { await js(`App.openHelp(); true`); await sleep(400);
    const sb=await js(`(()=>{const o=document.getElementById('help-overlay');return {tall:o.scrollHeight>o.clientHeight,bar:o.offsetWidth-o.clientWidth};})()`);
    R('Handbuch: Scrollbalken 10 px breit', sb.tall&&sb.bar===10, sb);
    const rc=await js(`(()=>{const r=document.getElementById('help-overlay').getBoundingClientRect();return {r:r.right,t:r.top,h:r.height,dpr:devicePixelRatio};})()`);
    const img=await win.webContents.capturePage({x:Math.floor(rc.r-10),y:Math.floor(rc.t),width:10,height:Math.floor(rc.h)});
    const {width:bw,height:bh}=img.getSize(), buf=img.toBitmap(), W=Math.round(buf.length/4/bh);   // BGRA: [i+1]=G, [i+2]=R
    let rows=0; for(let y=0;y<bh;y++){ for(let x=0;x<W;x++){ const i=(y*W+x)*4; if(buf[i+1]>=60&&buf[i+2]<60){ rows++; break; } } }
    R('Neon-Daumen im Scrollbalken des Handbuchs sichtbar (Pixelzeilen mit Neon im Balkenband)', rows>=Math.ceil(20*rc.dpr), {rows,bw,bh,dpr:rc.dpr});
    await js(`App.closeHelp(); true`); await sleep(200); }
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
    R('Bremse: drei Links im Abstand von 400 ms → 1', n===1, n);
    // Zurückgestellte Systemuhr legt den Link nicht still (monotone Uhr, Release-Audit v1.18 A-2; Querfund Alien Notes v1.7 A-1): main.js läuft im selben Realm
    await sleep(1100); opened.length=0; const dn=Date.now; Date.now=()=>dn()-3600e3; try{ if(woh) woh({url:'https://alien-investor.org/spenden.html'}); }finally{ Date.now=dn; }
    R('Bremse übersteht eine zurückgestellte Uhr (1 h)', opened.length===1, opened.slice()); }
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
    try{await AlienDesktop.clip.selected('x');r.push('sel-OK')}catch(e){r.push('sel-DENIED')}
    try{await AlienDesktop.saveBackup('a.vault','x');r.push('save-OK')}catch(e){r.push('save-DENIED')}
    return r.join(',');})()`,true);
  R('fremder Frame: alle Brücken-Aufrufe abgewiesen', foreign==='read-DENIED,write-DENIED,clip-DENIED,sel-DENIED,save-DENIED', foreign);
  w2.destroy();

  // Zwischenablage: Hinweis gesetzt, eigene Kopie wird gelöscht, fremde bleibt
  const M1='ap-harness-'+process.pid+'-a', M2='ap-harness-'+process.pid+'-b';
  await js(`AlienDesktop.clip.write({text:${JSON.stringify(M1)}})`);
  R('Kopie trägt den KDE-Hinweis', await clipboard.has(KDE_HINT)&&(await clipboard.readText())===M1);
  await sleep(800); const kopieInPrim=(await prim())===M1;   // X11/KDE: Klipper spiegelt die Kopie in PRIMARY (Messung, je nach Klipper-Einstellung)
  await clipboard.selection.writeText(M1);   // Spiegelung deterministisch nachstellen — prüft den PRIMARY-Zweig auch ohne Klipper (Querfund Tresor v3.7 M-1/C-5)
  const vorM1=(await prim())===M1;
  await js(`AlienDesktop.clip.clear()`);
  R('eigene Kopie gelöscht', (await clipboard.readText())!==M1);
  R('eigene Kopie auch aus PRIMARY gelöscht (v1.19, Klipper spiegelt hier: '+kopieInPrim+')', vorM1&&(await prim())==='', {vorM1,kopieInPrim});
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
  // a2-1 (Audit run-11 a-2): die eigene Kopie ist ROH gehasht — eine Kopie mit NBSP/U+FFFC muss weiter aus CLIPBOARD und dem Klipper-Spiegel in PRIMARY
  // verschwinden (Mutant „nur sha(nsel(cur))“ ließ sie stehen). Eine Meldung nur aus U+FFFC merkt nichts (Frühausstieg): fremde Auswahl aus U+FFFC bleibt.
  { const FC=String.fromCharCode(0xfffc), NBS=String.fromCharCode(0xa0), K='ap-harness-'+process.pid+NBS+'kopie'+FC+'x';
    await js(`AlienDesktop.clip.write({text:${JSON.stringify(K)}})`); await clipboard.selection.writeText(K);
    const vor=(await clipboard.readText())===K&&(await prim())===K;
    await js(`AlienDesktop.clip.clear()`);
    R('a2-1: eigene Kopie mit NBSP/U+FFFC aus CLIPBOARD und PRIMARY gelöscht (Roh-Vergleich)', vor&&(await clipboard.readText())!==K&&(await prim())==='', {vor});
    await clipboard.clear(); await clipboard.selection.clear();
    await js(`AlienDesktop.clip.selected(${JSON.stringify(FC)})`); await clipboard.selection.writeText(FC+FC); await js(`AlienDesktop.clip.clear()`);
    R('a2-1: Meldung nur aus U+FFFC merkt nichts, fremde Auswahl aus U+FFFC bleibt stehen (Frühausstieg)', (await prim())===FC+FC);
    await clipboard.selection.clear(); }
  // Hash-Ring (R2-N2): eine spätere falsche Meldung (Wert eines anderen Feldes, das nicht in PRIMARY liegt) verdrängt die richtige nicht mehr
  { const P='ap-harness-'+process.pid+'-ring-p';
    await clipboard.selection.writeText(P); await js(`AlienDesktop.clip.selected(${JSON.stringify(P)})`);
    for(let i=0;i<7;i++) await js(`AlienDesktop.clip.selected(${JSON.stringify('anderes-feld-'+i)})`);
    await js(`AlienDesktop.clip.clear()`);
    R('Hash-Ring: Markierung nach 7 fremden Meldungen trotzdem aus PRIMARY gelöscht', (await prim())==='', {prim:(await prim()).length});
    await clipboard.selection.writeText(P); await js(`AlienDesktop.clip.selected(${JSON.stringify(P)})`);
    // P, 7 fremde, dann eine leere: würde die leere gehasht, verdrängte sie als 9. Eintrag P (eine leere direkt nach P passte noch in den Ring und konnte
    // nie rot werden; acht leere allein entdoppelt der Ring zu einem — Querfund Sachwert-Tresor Release-Audit v3.8 C-3)
    for(let i=0;i<7;i++) await js(`AlienDesktop.clip.selected(${JSON.stringify('anderes-feld-'+i)})`);
    await js(`AlienDesktop.clip.selected('')`);
    await js(`AlienDesktop.clip.clear()`);
    R('Hash-Ring: eine leere Meldung verdrängt nichts (P, 7 fremde, leer → P gelöscht)', (await prim())==='', {prim:(await prim()).length});
    await clipboard.selection.writeText(P); await js(`AlienDesktop.clip.selected(${JSON.stringify(P)})`);
    for(let i=0;i<8;i++) await js(`AlienDesktop.clip.selected(${JSON.stringify('anderes-feld-'+i)})`);
    await js(`AlienDesktop.clip.clear()`);
    R('Hash-Ring: Grenze 8 — nach 8 fremden Meldungen ist die erste verdrängt (bleibt stehen)', (await prim())===P, {prim:(await prim()).length});
    await clipboard.selection.clear(); }
  // Rückspiegelung Markierung → CLIPBOARD (Release-Audit v1.19 A-4): Messung, und die Abwehr in clearOwned
  { const P='ap-harness-'+process.pid+'-rueck';
    await clipboard.clear(); await clipboard.selection.writeText(P); await js(`AlienDesktop.clip.selected(${JSON.stringify(P)})`); await sleep(800);
    R('Messung: die Markierung landet nicht in CLIPBOARD (Klipper spiegelt nicht zurück)', (await clipboard.readText())!==P);
    await clipboard.writeText(P); await js(`AlienDesktop.clip.clear()`);
    R('Abwehr: stünde die Markierung doch in CLIPBOARD, wird sie dort mitgelöscht', (await clipboard.readText())!==P&&(await prim())==='');
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Hängender Besitzer (Release-Audit v1.19 A-1, Runde 2 R2-1): das Lesen von CLIPBOARD hängt FÜR IMMER — PRIMARY wird trotzdem gelöscht, die Kette läuft weiter
  { const P='ap-harness-'+process.pid+'-haengt-p', N='ap-harness-'+process.pid+'-nach-haenger', orig=clipboard.readText;
    clipboard.readText=function(){ return new Promise(()=>{}); };
    try{ await clipboard.selection.writeText(P); await js(`AlienDesktop.clip.selected(${JSON.stringify(P)})`);
      const t0=Date.now(); const r1=await js(`Promise.race([AlienDesktop.clip.clear().then(()=>'ok',()=>'abgelehnt'),new Promise(r=>setTimeout(()=>r('haengt'),6000))])`); const ms=Date.now()-t0;
      R('CLIPBOARD-Lesen hängt dauerhaft: PRIMARY trotzdem gelöscht, Löschen kehrt nach ~2 s zurück', r1==='ok'&&ms>=1800&&ms<4500&&(await prim())==='', {r1,ms,prim:(await prim()).length}); }
    finally{ clipboard.readText=orig; }
    // … und danach: einmaliger Hänger bei einer Kopie — die Hülle fasst selbst nach (kein weiteres clear der App), dann löscht auch das nächste Löschen
    let einmal=true; clipboard.readText=function(...a){ if(einmal){ einmal=false; return new Promise(()=>{}); } return orig.apply(this,a); };
    try{ const M='ap-harness-'+process.pid+'-nachfassen';
      await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`); const drin=(await orig.call(clipboard))===M;   // Vorbedingung: Kopie steht
      const t0=Date.now(); await js(`AlienDesktop.clip.clear().catch(()=>'abgelehnt')`); const ms=Date.now()-t0;   // Vorbedingung: das Lesen hing wirklich (~2 s)
      let weg=false; for(let i=0;i<40&&!weg;i++){ await sleep(100); weg=(await orig.call(clipboard))!==M; }
      R('einmaliger Hänger: die Hülle fasst nach und löscht die Kopie ohne neues clear der App', drin&&ms>=1800&&weg, {drin,ms,weg}); }
    finally{ clipboard.readText=orig; }
    await js(`AlienDesktop.clip.write({text:${JSON.stringify(N)}})`); await js(`AlienDesktop.clip.clear().catch(()=>'abgelehnt')`);
    R('nach dem Hänger: Kette läuft, das nächste Löschen löscht', (await clipboard.readText())!==N);
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Spätes Schreiben (R2-2): clipboard.write braucht 2,5 s — die App bekommt eine Ablehnung (setzt keine Frist), die doch noch gelandete Kopie wird sofort gelöscht
  { const M='ap-harness-'+process.pid+'-spaet', ow=clipboard.write;
    // Klipper spiegelt erst NACH dem Landen — hier 300 ms danach nachgestellt (Nachprüfung N-2: vorher stand der Spiegel bequem schon vorher da)
    clipboard.write=async function(...a){ await sleep(2500); const r=await ow.apply(this,a); setTimeout(()=>{ clipboard.selection.writeText(M); },300); return r; };
    let r='?'; try{ r=await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}}).then(()=>'ok',()=>'abgelehnt')`); }
    finally{ clipboard.write=ow; }
    await sleep(4000);
    R('spätes Schreiben: App bekommt Ablehnung, die gelandete Kopie ist danach aus CLIPBOARD und PRIMARY weg', r==='abgelehnt'&&(await clipboard.readText())!==M&&(await prim())==='', {r,clip:(await clipboard.readText())===M,prim:(await prim()).length});
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Kappung der offenen Hashes wirft die ÄLTESTEN (Nachprüfung N-1): zwei Zyklen mit hängendem PRIMARY-Lesen (je Kopie + 8 Markierungen = 18 Hashes),
  // danach erholt sich der Besitzer — die NEUESTE Kopie muss trotzdem aus PRIMARY verschwinden
  { let vorP2=false; const tK=Date.now(), sr=clipboard.selection.readText, P2='zyklus4-markierung-7';   // die zuletzt gemeldete Markierung — unter X11 liegt immer die letzte in PRIMARY; wirft die Kappung die NEUESTEN, fehlt genau sie
    clipboard.selection.readText=function(){ return new Promise(()=>{}); };
    // 4 × (Kopie + 8 Markierungen) = 36 > 32: die Kappung greift wirklich (Querfund Notes v1.8 C-1)
    try{ for(const z of ['zyklus1','zyklus2','zyklus3','zyklus4']){ await js(`AlienDesktop.clip.write({text:${JSON.stringify('ap-harness-'+process.pid+'-'+z)}})`);
        for(let i=0;i<8;i++) await js(`AlienDesktop.clip.selected(${JSON.stringify(z+'-markierung-'+i)})`);
        await js(`AlienDesktop.clip.clear().catch(()=>0)`); }
      await clipboard.selection.writeText(P2); vorP2=(await sr.call(clipboard.selection))===P2; }   // liegt schon WÄHREND der Hängephase in PRIMARY (sonst gab ein
    finally{ clipboard.selection.readText=sr; }    // Nachfassen zwischen Erholung und Spiegel die Hashes korrekt frei, und der Test prüfte nichts — 04.10.2026 gemessen)
    let weg=false; for(let i=0;i<50&&!weg;i++){ await sleep(100); weg=(await prim())===''; }
    // Hat die lange Hängephase das Nachfassen schon in den 30-s-Takt gebracht (N-3, gewollt), löscht das nächste Löschen der App (Frist/Sperre) — auch das
    // findet die neueste Kopie nur, wenn die Kappung die ÄLTESTEN geworfen hat
    const perNachfassen=weg; if(!weg){ await js(`AlienDesktop.clip.clear()`); await sleep(200); weg=(await prim())===''; }
    R('Kappung der offenen Hashes (36 > 32) wirft die ältesten: neueste Markierung nach Erholung aus PRIMARY', vorP2&&weg, {vorP2,ms:Date.now()-tK,perNachfassen});
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Abgelehntes Lesen zählt wie Hängen (Nachprüfung N-5): einmal lehnt readText ab — die Hülle fasst nach, die Kopie verschwindet ohne neues clear der App
  { const M='ap-harness-'+process.pid+'-abgelehnt', orig=clipboard.readText; let einmal=true;
    clipboard.readText=function(...a){ if(einmal){ einmal=false; return Promise.reject(new Error('X11')); } return orig.apply(this,a); };
    try{ await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`); await js(`AlienDesktop.clip.clear().catch(()=>0)`);
      let weg=false; for(let i=0;i<40&&!weg;i++){ await sleep(100); weg=(await orig.call(clipboard))!==M; }
      R('abgelehntes Lesen: die Hülle fasst nach und löscht die Kopie', !einmal&&weg, {weg}); }
    finally{ clipboard.readText=orig; }
    await clipboard.clear(); await clipboard.selection.clear(); }
  // CLIP_MAX 16 Mi (statt 20.000): eine lange Kopie geht über die Brücke und wird gelöscht (C-6)
  { const L='ap-harness-'+process.pid+'-langkopie-'+'z'.repeat(60000);
    const a=await js(`AlienDesktop.clip.write({text:${JSON.stringify(L)}}).then(()=>'ok',()=>'abgewiesen')`); const drin=(await clipboard.readText())===L;
    await js(`AlienDesktop.clip.clear()`);
    R('Kopie mit 60.000 Zeichen über die Brücke und wieder gelöscht', a==='ok'&&drin&&(await clipboard.readText())!==L, {a,drin});
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Grenze nur für Markierungen (gehasht): seitenweite Markierung über der alten Grenze 20.000 wird angenommen und gelöscht, über SEL_MAX abgewiesen (Notes v1.7 B-M1)
  { const L='ap-harness-'+process.pid+'-lang-'+'y'.repeat(60000);
    await clipboard.selection.writeText(L); const a=await js(`AlienDesktop.clip.selected(${JSON.stringify(L)}).then(()=>'ok',()=>'abgewiesen')`); await js(`AlienDesktop.clip.clear()`);
    R('Markierung mit 60.000 Zeichen gemeldet und gelöscht', a==='ok'&&(await prim())==='', a);
    let big='bad'; try{ big=await js(`AlienDesktop.clip.selected('y'.repeat(16*1024*1024+1)).then(()=>'ok',()=>'abgewiesen')`); }catch(_){}
    R('Markierung über SEL_MAX (16 Mi) abgewiesen', big==='abgewiesen', big); }
  // Wettlauf (Querfund Tresor v3.7 A-1/R2-1): eine Meldung, die während eines laufenden Löschens ankommt (readText ist asynchron), muss beim nächsten Löschen weg
  // Kopie während eines laufenden Löschens (C-3): ohne Kette nullte das Löschen nach seinen awaits den Hash der neuen Kopie — sie blieb unbegrenzt in CLIPBOARD
  { const M6='ap-harness-'+process.pid+'-lauf', M7='ap-harness-'+process.pid+'-mitten';
    await js(`AlienDesktop.clip.write({text:${JSON.stringify(M6)}})`); await sleep(300);
    await js(`(()=>{ AlienDesktop.clip.clear(); AlienDesktop.clip.write({text:${JSON.stringify(M7)}}); return true; })()`); await sleep(600);
    const drin=(await clipboard.readText())===M7;   // Vorbedingung: die neue Kopie steht (die Kette hat sie NACH dem Löschen geschrieben)
    await clipboard.selection.writeText(M7);   // Klipper-Spiegelung
    await js(`AlienDesktop.clip.clear()`); await sleep(200);
    R('Kopie während eines laufenden Löschens: beim nächsten Löschen aus CLIPBOARD und PRIMARY', drin&&(await clipboard.readText())!==M7&&(await prim())==='', {drin});
    await clipboard.clear(); await clipboard.selection.clear(); }
  // Variante nur mit Markierungen: alte Markierung A wird gerade gelöscht, die neue Meldung X kommt mitten hinein — ohne Kette nullte das Löschen den Hash von X
  { const A='ap-harness-'+process.pid+'-alt', X='ap-harness-'+process.pid+'-neu';
    await clipboard.selection.writeText(A); await js(`AlienDesktop.clip.selected(${JSON.stringify(A)})`);
    await js(`(()=>{ AlienDesktop.clip.clear(); AlienDesktop.clip.selected(${JSON.stringify(X)}); return true; })()`); await sleep(400);
    await clipboard.selection.writeText(X);   // wie X11 beim Markieren
    const vorX=(await prim())===X;   // Vorbedingung: das erste Löschen ist durch und hat X nicht (zufällig) mitgenommen (C-4)
    await js(`AlienDesktop.clip.clear()`); await sleep(200);
    R('Markierung während eines laufenden Löschens (Markierung) gemeldet: beim nächsten Löschen aus PRIMARY', vorX&&(await prim())==='', {vorX,prim:(await prim()).length});
    await clipboard.selection.clear(); }

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
  { const t0=Date.now(); let weg=false; while(Date.now()-t0<5000&&!(weg=(await prim())!==PP)) await sleep(100);   // unter Last kann das Löschen nach Argon2 dauern (Runde 2 R2-5)
    R('Sperrbildschirm: markierte Passphrase nach dem Entsperren aus der Auswahl', weg, {ms:Date.now()-t0}); }
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
  const unlock=async()=>{ if(await js(visible('screen-lock'))){ await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app')); } };
  const realClick=async sel=>{ const r=await js(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); b.scrollIntoView({block:'center'}); const q=b.getBoundingClientRect(); return {x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)};})()`);
    win.webContents.sendInputEvent({type:'mouseDown',x:r.x,y:r.y,button:'left',clickCount:1}); win.webContents.sendInputEvent({type:'mouseUp',x:r.x,y:r.y,button:'left',clickCount:1}); await sleep(400); };
  // Nur der Capture-keydown meldet (Querfund Notes v1.7 A-2): Strg+A als keyDown OHNE keyUp (kein keyup-Melder, kein focusin, kein mouseup), dann eine echte Taste
  { await unlock(); await js(`App.tab('settings')`); await sleep(300); const V='keydown-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('cp1'); p.value=${JSON.stringify(V)}; p.scrollIntoView({block:'center'}); p.focus(); p.setSelectionRange(p.value.length,p.value.length); return true; })()`); await sleep(200);
    await clipboard.selection.writeText('vorher-keydown-'+process.pid);
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); await sleep(300);
    const inP=(await prim())===V;
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'X'}); win.webContents.sendInputEvent({type:'char',keyCode:'x'}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'X'}); await sleep(300);
    await js(`App.lockNow(); true`); await sleep(600);
    R('Strg+A ohne Loslassen, dann getippt: Capture-keydown meldet, nach dem Sperren nicht mehr in PRIMARY', inP&&(await prim())==='', {inP});
    await clipboard.selection.clear(); }
  // Markieren und SOFORT per Klick sperren (Querfund Notes v1.7 B-N2): mouseup meldet, derselbe Klick sperrt — die Frist muss schon vor der IPC-Antwort stehen
  { await unlock(); await js(`App.tab('settings')`); await sleep(300); const V='sofort-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('cp1'); p.value=${JSON.stringify(V)}; p.scrollIntoView({block:'center'}); p.focus(); p.setSelectionRange(p.value.length,p.value.length); return true; })()`); await sleep(200);
    await clipboard.selection.writeText('vorher-sofort-'+process.pid);
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); await sleep(300);
    const inP=(await prim())===V;
    await realClick('button[data-action="lockNow"]'); await sleep(600);
    R('Markiert, dann sofort Klick auf „Jetzt sperren“: beim Sperren aus PRIMARY (nicht erst nach der Frist)', inP&&(await js(visible('screen-lock')))&&(await prim())==='', {inP,prim:(await prim()).length});
    await clipboard.selection.clear(); }
  // Wie gemessen (R2-N2, 03.10.2026): f-user mit alter interner Markierung, f-pass per Strg+A markiert, dann echter Klick LINKS neben f-user — die leere Range
  // zeigt auf f-user, selText meldet dessen Wert; das Passwort liegt weiter in PRIMARY und muss beim Sperren trotzdem weg
  { await unlock(); await js(`App.newEntry(); true`); await sleep(400); const V='ring-pass-'+process.pid;
    await js(`(()=>{ const u=document.getElementById('f-user'); u.value='ring-user-'+${JSON.stringify(String(process.pid))}; u.focus(); u.setSelectionRange(0,u.value.length);
      const p=document.getElementById('f-pass'); p.value=${JSON.stringify(V)}; p.dispatchEvent(new Event('input',{bubbles:true})); p.focus(); return true; })()`); await sleep(200);
    if((await cur()).t!=='password') await eye();
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'A',modifiers:['control']}); await sleep(300);
    const inP=(await prim())===V;
    const r=await js(`(()=>{ const q=document.getElementById('f-user').getBoundingClientRect(); return {x:Math.round(q.left-6),y:Math.round(q.top+q.height/2)}; })()`);
    win.webContents.sendInputEvent({type:'mouseDown',x:r.x,y:r.y,button:'left',clickCount:1}); win.webContents.sendInputEvent({type:'mouseUp',x:r.x,y:r.y,button:'left',clickCount:1}); await sleep(400);
    const still=(await prim())===V;
    await js(`App.lockNow(); true`); await sleep(600);
    R('Klick links neben ein Feld mit alter Markierung (R2-N2): Passwort war in PRIMARY und ist nach dem Sperren weg', inP&&still&&(await prim())==='', {inP,still,prim:(await prim()).length});
    await clipboard.selection.clear(); }
  // Entsperrt, Passphrase-Wechsel: neue Passphrase per Strg+A markiert, Fensterwechsel → Feld leer UND PRIMARY geräumt (Querfund Notes v1.8 B-1 in der echten Hülle, R2-A5)
  { await unlock(); await js(`App.tab('settings'); true`); await sleep(300); const V='einst-blur-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('cp1'); p.value=${JSON.stringify(V)}; p.dispatchEvent(new Event('input',{bubbles:true})); p.scrollIntoView({block:'center'}); p.focus(); return true; })()`); await sleep(200);
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'A',modifiers:['control']}); await sleep(400);
    const inP=(await prim())===V;
    win.webContents.send('bg','blur'); await sleep(600);
    R('entsperrt, Strg+A in der neuen Passphrase, Fensterwechsel: Feld leer und PRIMARY geräumt (B-1)', inP&&(await js(`document.getElementById('cp1').value===''`))&&(await prim())==='', {inP,prim:(await prim()).length});
    await clipboard.selection.clear(); }
  // Sofort-Sperre (bgLock=0) beim Minimieren lässt nur eine echte Kopie bis zur Frist stehen, keine bloße Markierung (Querfund Notes v1.7 R2-N1)
  { await unlock(); await js(`App.setBgLock('0')`); await sleep(400);
    await js(`App.newEntry(); true`); await sleep(400);
    const V='sofortsperre-'+process.pid;
    await js(`(()=>{ const p=document.getElementById('f-pass'); p.value=${JSON.stringify(V)}; p.dispatchEvent(new Event('input',{bubbles:true})); const f=document.getElementById('f-email'); f.value='sofort@example.org'; f.focus(); return true; })()`); await sleep(150);
    await clipboard.selection.writeText('vorher-sofortsperre-'+process.pid);
    press('Tab'); await sleep(500);
    const inP=(await prim())===V;
    win.minimize(); const locked=await until(visible('screen-lock'),5000); await sleep(400); const primMin=await prim(); const fo=await restoreFocused(); await sleep(400);
    R('Sofort-Sperre beim Minimieren: per Tab markierte Passphrase sofort aus PRIMARY (noch minimiert geprüft)', inP&&locked&&primMin==='', {inP,locked,prim:primMin.length,fo});
    await clipboard.selection.clear();
    // Gegenprobe: eine echte Kopie bleibt bei der Sofort-Sperre bis zur Frist stehen (UI-INVARIANTEN, Sofort-Sperre v1.11)
    await unlock(); await js(`App.tab('list')`); await sleep(300);
    await js(`[...document.querySelectorAll('#entry-list .entry')].find(n=>n.querySelector('.t')&&n.querySelector('.t').textContent==='Harness Eintrag').click()`); await sleep(400);
    await clipboard.clear(); await js(`App.copyField('pass'); true`); await sleep(500);
    const K='harness-geheim-5r7t', kop=(await clipboard.readText())===K;
    win.minimize(); const l2=await until(visible('screen-lock'),5000); await sleep(400); const cMin=await clipboard.readText(); const fo2=await restoreFocused(); await sleep(400);
    R('Sofort-Sperre: echte Kopie bleibt bis zur Frist stehen (Gegenprobe, noch minimiert geprüft)', kop&&l2&&cMin===K, {kop,l2,len:cMin.length,fo2});
    await unlock(); await js(`AlienDesktop.clip.clear(); App.setBgLock('30'); true`); await sleep(400); await clipboard.clear(); await clipboard.selection.clear(); }
  await unlock();
  await js(`document.getElementById('cp1').value=''; App.tab('list')`).catch(()=>{}); await sleep(300);
}
// Beenden (Querfund Tresor v3.7 M-1 + R2-1): before-quit läuft über die Kette und löscht die eigene Kopie auch aus PRIMARY (Klipper-Spiegelung).
// Variante 'quit': die Kopie ist beim Beenden noch UNTERWEGS (clipboard.write hängt 1 s) — v1.18 beendete dann sofort ohne Löschen (Hashes noch frei, R2-1);
// zweimal app.quit (A-3). Variante 'quithang': zwei Schreibvorgänge hängen für immer VOR dem Löschen — Beenden spätestens nach ~2 s direkt (R2-3).
// Variante 'quitslow' (Nachprüfung N-4): das PRIMARY-Lesen beim Beenden braucht 2,3 s — das Kettenglied läuft in seine Frist, der direkte Durchgang
// muss die Hashes des laufenden Glieds mitnehmen und löschen
async function quitSlow(){
  R('Beenden: Sperrbildschirm', await until(visible('screen-lock'),15000));
  const M='ap-harness-'+process.pid+'-quitslow';
  await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`); await sleep(300); await clipboard.selection.writeText(M);
  const sr=clipboard.selection.readText; let einmal=true;
  clipboard.selection.readText=function(...a){ if(einmal){ einmal=false; return new Promise(r=>setTimeout(()=>r(sr.apply(clipboard.selection,a)),2300)); } return sr.apply(this,a); };
  const t0=Date.now();
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0; (async()=>{ const c=await clipboard.readText(), p=await sr.call(clipboard.selection);
    R('Beenden mit langsamem PRIMARY-Lesen: direkter Durchgang löscht auch die Hashes des laufenden Glieds', !einmal&&ms>=1900&&c!==M&&p==='', {ms,clip:c===M,prim:p.length,langsam:!einmal});
    try{ await clipboard.clear(); }catch(_){} R('Schritt vollständig',true); app.exit(0); })(); });
  app.quit();
}
// Variante 'quitreject' (Querfund Notes v1.8 A-1): das Glied läuft rechtzeitig durch, aber das PRIMARY-Lesen lehnt einmal ab — die Kopie steht
// (Klipper-Spiegel) noch in PRIMARY; vorher galt das als erledigt, es gab keinen direkten Durchgang, und die Kopie überlebte das Beenden
async function quitReject(){
  R('Beenden: Sperrbildschirm', await until(visible('screen-lock'),15000));
  const M='ap-harness-'+process.pid+'-quitreject';
  await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`); await sleep(300); await clipboard.selection.writeText(M);
  const vor=(await prim())===M;
  const sr=clipboard.selection.readText; let einmal=true;
  clipboard.selection.readText=function(...a){ if(einmal){ einmal=false; return Promise.reject(new Error('X11')); } return sr.apply(this,a); };
  const t0=Date.now();
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0; (async()=>{ const c=await clipboard.readText(), p=await sr.call(clipboard.selection);
    R('Beenden mit einmal abgelehntem PRIMARY-Lesen: Kopie trotzdem aus CLIPBOARD und PRIMARY gelöscht', vor&&!einmal&&c!==M&&p==='', {vor,abgelehnt:!einmal,ms,clip:c===M,prim:p.length});
    R('Beenden bleibt unter ~5 s', ms<5500, ms);
    try{ await clipboard.clear(); }catch(_){} R('Schritt vollständig',true); app.exit(0); })(); });
  app.quit();
}
// Variante 'quitlate' (Querfund Notes v1.8 R2-H2): clip:write hängt 2,5 s — die App bekommt nach 2 s die Ablehnung, gleich danach wird beendet; die Kopie landet
// erst WÄHREND des Beendens (Klipper spiegelt 300 ms danach). Vorher stand sie noch nicht in `pending`, das Beenden war nach 1 ms fertig, der Spiegel blieb
async function quitLate(){
  R('Beenden: Sperrbildschirm', await until(visible('screen-lock'),15000));
  const M='ap-harness-'+process.pid+'-quitlate', ow=clipboard.write; let gelandet=0;
  clipboard.write=async function(...a){ await sleep(2500); const r=await ow.apply(this,a); gelandet=Date.now(); setTimeout(()=>{ clipboard.selection.writeText(M); },300); return r; };
  const r=await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}}).then(()=>'ok',()=>'abgelehnt')`);
  const t0=Date.now();
  // Sofort bei will-quit prüfen, ohne zu warten: in echt endet der Prozess hier — eine Wartezeit im Test ließe die normalen Nachfass-Zeitgeber aufräumen
  // und machte den Test gegen die Hülle ohne R2-H2-Fix grün. Vorbedingung: die Kopie ist bis zum Ende des Beendens gelandet (das Beenden hat auf sie gewartet)
  // Vorbedingung auch: will-quit erst NACH dem nachgestellten Spiegel (Landung + 300 ms) — sonst wäre PRIMARY nur „noch leer“ (Notes-Nachprüfung N-1)
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0, gel=gelandet>0&&Date.now()-gelandet>=400; (async()=>{ const c=await clipboard.readText(), p=await prim();
    R('Beenden während ein spätes Schreiben noch unterwegs ist: auf die Kopie und ihren Spiegel gewartet, beide beim Prozessende aus CLIPBOARD und PRIMARY weg', r==='abgelehnt'&&gel&&c!==M&&p==='', {r,gel,nachLandung:gelandet?Date.now()-gelandet:0,ms,clip:c===M,prim:p.length});
    R('Beenden bleibt unter ~5 s', ms<5500, ms);
    clipboard.write=ow; try{ await clipboard.clear(); await clipboard.selection.clear(); }catch(_){} R('Schritt vollständig',true); app.exit(0); })(); });
  app.quit();
}
async function quitStep(hang){
  R('Beenden: Sperrbildschirm', await until(visible('screen-lock'),15000));
  const M='ap-harness-'+process.pid+'-quit';
  let drin=false, t0=0;
  if(hang){ await js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`); await sleep(300); await clipboard.selection.writeText(M);
    clipboard.write=()=>new Promise(()=>{});
    js(`AlienDesktop.clip.write({text:'haengt-1'}).catch(()=>{}); AlienDesktop.clip.write({text:'haengt-2'}).catch(()=>{}); true`).catch(()=>{}); await sleep(200); }
  else { const ow=clipboard.write; clipboard.write=async function(...a){ drin=true; await sleep(1000); return ow.apply(this,a); };
    js(`AlienDesktop.clip.write({text:${JSON.stringify(M)}})`).catch(()=>{});
    for(let i=0;i<50&&!drin;i++) await sleep(20);
    await clipboard.selection.writeText(M); }   // Klipper-Spiegelung nachstellen
  // quithang: während des Beendens abtasten — der direkte Durchgang an der stehenden Kette vorbei muss nach ~2 s löschen, nicht erst das Kettenglied
  // bei ~3,8 s (seit R2-H2 hält `lateN` das Beenden ohnehin bis zum Deckel offen, die Endprüfung allein trennt den Durchgang nicht mehr — Notes-Nachprüfung N-2)
  let leerAb=0; const tast=hang?setInterval(async()=>{ if(leerAb||!t0) return; try{ if((await clipboard.readText())!==M&&(await prim())==='') leerAb=Date.now()-t0; }catch(_){} },50):null;
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0; if(tast) clearInterval(tast); (async()=>{
    if(hang){ const c=await clipboard.readText(), s=await prim();
      R('Beenden hinter einer stehenden Kette: direkter Durchgang löscht nach ~2 s (≤ 2,7 s), nicht erst das Kettenglied', leerAb>0&&leerAb<=2700, {leerAb});
      // ≤ ~5 s statt ~2 s: die beiden nie landenden Schreibvorgänge zählen seit R2-H2 als „spät, noch nicht gelandet“, das Beenden wartet bis zum Deckel `end`
      R('Beenden hinter einer stehenden Kette: direkt gelöscht (CLIPBOARD + PRIMARY), unter dem Deckel ~5 s', ms<5500&&c!==M&&s==='', {ms,clip:c===M,prim:s.length}); }
    else { const c=await clipboard.readText(), s=await prim();
      R('Beenden während die Kopie noch geschrieben wird (zweimal quit): Kopie aus CLIPBOARD und PRIMARY gelöscht, auf das Schreiben gewartet (≥ 0,9 s)', drin&&ms>=900&&c!==M&&s==='', {drin,clip:c===M,prim:s.length,ms}); }
    try{ await clipboard.clear(); }catch(_){} R('Schritt vollständig',true); app.exit(0); })(); });
  t0=Date.now(); app.quit(); if(!hang){ await sleep(50); app.quit(); }
}
// Sperre beim Minimieren (Audit run-6 #1): backgroundThrottling:false schaltet visibilitychange ab, die Hülle meldet selbst
async function background(){
  R('Hintergrund: Sperrbildschirm', await until(visible('screen-lock'),15000));
  await fill('lock-pass',PP); await click('#unlock-btn'); R('Hintergrund: entsperrt', await until(visible('screen-app')));
  await js(`App.setAutolock('0')`); await js(`App.setBgLock('0')`); await sleep(600);
  win.minimize(); const locked=await until(visible('screen-lock'),5000);
  R('Minimieren sperrt bei „sofort“ (Inaktivität aus)', locked);
  await restoreFocused(); await sleep(400);
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.setBgLock('30')`); await sleep(600);
  win.minimize(); await sleep(1200); await restoreFocused(); await sleep(600);
  R('kurz minimiert bei 30 s: bleibt entsperrt', await js(visible('screen-app')), {lock:await js(visible('screen-lock')),min:win.isMinimized()});
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
  await fill('lock-pass',PP); await click('#unlock-btn'); win.minimize(); await sleep(4000); await restoreFocused(); await sleep(600);
  R('während des Entsperrens minimiert: bleibt gesperrt', await js(visible('screen-lock'))&&!(await js(visible('screen-app'))));
  await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'));
  await js(`App.setBgLock('30')`); await js(`App.setAutolock('2')`); await sleep(600);
}
// Markierungen AUSSERHALB von Feldern (Querfund Alien Notes v1.10, Release-Audit run-8 a2-1, gemessen 10.10.2026 in der echten Hülle): Strg+A ohne Textfeld-Fokus
// markierte die ganze Seite samt aufgedecktem Passwort und TOTP-Code, und Chromium legt in PRIMARY einen anderen Text, als die App meldet (U+FFFC je Knopf/Feld,
// NBSP als Leerzeichen) — Frist und Sperre löschten nie. Tasten, Klicks und Ziehen per sendInputEvent auf Koordinaten; Fokus und Feldwerte zur Vorbereitung teils
// per Skript. Ein keydown-Haken am window (Bubble, also nach deskKey) zählt je Strg+A, ob die Taste ankam und gesperrt wurde. Gegen den alten Stand rot
// (Negativprobe 10.10.2026) und gegen die Mutanten aus Audit run-11 (Liste `DESKTOP-INVARIANTEN.md`; „jedes INPUT als Textfeld“ ist seit dem Umbau gleichwertig).
async function markierung(){
  const ensureFocus=async()=>{ if(!win.isFocused()){ win.focus(); for(let i=0;i<30&&!win.isFocused();i++) await sleep(100); await sleep(200); } return win.isFocused(); };
  const wc=win.webContents, NB='\u00a0', V='mk-geheim-'+process.pid, TAIL='Leerzeichen-'+process.pid;
  const mclick=async(p,n=1)=>{ for(let i=1;i<=n;i++){ wc.sendInputEvent({type:'mouseDown',x:p.x,y:p.y,button:'left',clickCount:i}); wc.sendInputEvent({type:'mouseUp',x:p.x,y:p.y,button:'left',clickCount:i}); } await sleep(500); };
  const at=sel=>js(`(()=>{const n=document.querySelector(${JSON.stringify(sel)}); if(!n) return null; const b=n.getBoundingClientRect(); return {x:Math.round(b.x+Math.min(b.width/2,30)),y:Math.round(b.y+b.height/2)};})()`);
  const atText=(root,needle)=>js(`(()=>{ const w=document.createTreeWalker(document.querySelector(${JSON.stringify(root)}),NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){ const i=n.data.indexOf(${JSON.stringify(needle)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i+1); r.setEnd(n,i+2); const b=r.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)}; } } return null; })()`);
  const ctrl=k=>{ wc.sendInputEvent({type:'keyDown',keyCode:k,modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:k,modifiers:['control']}); };
  const sel=()=>js(`String(getSelection())`);
  const leer=async(ms=3000)=>{ const t0=Date.now(); let ok=false; while(Date.now()-t0<ms&&!(ok=(await prim())==='')) await sleep(100); return ok; };
  const ka=()=>js(`window.__ka.splice(0)`);
  let nr=0;
  // Strg+A mit Fokus außerhalb eines Textfelds: Taste kam an und wurde gesperrt, keine Markierung, PRIMARY unverändert
  const nichts=async(titel,vorb,info)=>{ await js(`getSelection().removeAllRanges(); true`); await ka(); const M='mk-vorher-'+(++nr)+'-'+process.pid;
    await clipboard.selection.writeText(M); const foc=await ensureFocus(); ctrl('A'); await sleep(500);
    const k=await ka(), gesperrt=k.length===1&&k[0]===true, unv=(await prim())===M, s=await sel();
    R(titel, vorb&&foc&&gesperrt&&unv&&s==='', {...info,foc,k,unv,selLen:s.length}); };
  const openIt=async t=>{ const p=await js(`(()=>{const n=[...document.querySelectorAll('#entry-list .entry .t')].find(n=>n.textContent===${JSON.stringify(t)}); if(!n) return null; n.scrollIntoView({block:'center'}); const b=n.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()`);
    if(!p) return false; await ensureFocus(); await mclick(p); return until(`${visible('detail-overlay')}&&!!document.getElementById('d-notes')`,5000); };
  R('Markierung: Sperrbildschirm', await until(visible('screen-lock'),15000));
  await ensureFocus(); await fill('lock-pass',PP); await click('#unlock-btn'); R('Markierung: entsperrt', await until(visible('screen-app')));
  await js(`window.__ka=[]; window.addEventListener('keydown',e=>{ if(e.ctrlKey&&e.keyCode===65) window.__ka.push(e.defaultPrevented); }); true`);
  await click('button[data-action="newEntry"]'); await sleep(300);
  await fill('f-title','Markierung'); await fill('f-user','mk-nutzer'); await fill('f-pass',V); await fill('f-notes','Notiz:'+NB+'mit'+NB+TAIL); await click('#add-btn');
  R('Markierung: Eintrag gespeichert', await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Markierung')`,10000));
  R('Markierung: Detail offen', await openIt('Markierung'));
  // (1) Passwort aufgedeckt, Klick auf ein Feld-Etikett (Fokus nirgends)
  { await mclick(await at('#d-reveal-pass')); const auf=await js(`document.getElementById('d-pass').textContent===${JSON.stringify(V)}`);
    await mclick(await at('#d-body .kv .k')); const nirgends=await js(`document.activeElement===document.body`);
    await nichts('Strg+A ohne Feld-Fokus, Passwort aufgedeckt: gesperrt, nichts markiert, PRIMARY unverändert (a2-1)', auf&&nirgends, {auf,nirgends}); }
  // (2) Fokus auf einem Knopf — per Klick aufs Auge, das verdeckt das Passwort wieder (anderer Seitentext als in (1): Chromium schriebe PRIMARY sonst nicht neu)
  { await mclick(await at('#d-reveal-pass')); const knopf=await js(`document.activeElement.id==='d-reveal-pass'&&document.getElementById('d-pass').classList.contains('masked')`);
    await nichts('Strg+A mit Fokus auf einem Knopf: gesperrt, nichts markiert, PRIMARY unverändert (a2-1)', knopf, {knopf}); }
  // (2b) Kästchen und Regler (Generator, das erzeugte Passwort steht dort als Text): Fokus auf einem Nicht-Textfeld
  { await click('[data-action="tab"][data-arg="gen"]'); await sleep(400); const gen=await js(`document.getElementById('gen-out').textContent.length>0`);
    await js(`document.getElementById('gen-upper').focus(); true`); const kast=await js(`document.activeElement.id==='gen-upper'`);
    await nichts('Strg+A mit Fokus auf einem Kästchen (Generator): gesperrt, nichts markiert (a2-1)', gen&&kast, {gen,kast});
    await js(`document.getElementById('gen-len').focus(); true`); const regler=await js(`document.activeElement.id==='gen-len'`);
    await nichts('Strg+A mit Fokus auf einem Regler (Generator): gesperrt, nichts markiert (a2-1)', gen&&regler, {gen,regler});
    await click('[data-action="tab"][data-arg="list"]'); await sleep(400); }
  // (2c) Offene Rückfrage über dem Detail mit aufgedecktem Passwort, Fokus auf einem Dialogknopf — Mutant „Sperre hinter der Rückfrage-Weiche“; danach Escape
  { const offen=await openIt('Markierung'); await mclick(await at('#d-reveal-pass')); const auf=await js(`document.getElementById('d-pass').textContent===${JSON.stringify(V)}`);
    await click('#detail-overlay [data-action="deleteCurrent"]'); const dlg=await until(visible('dlg'),3000);
    const knopf=await js(`['dlg-ok','dlg-cancel'].includes(document.activeElement.id)`);
    await nichts('Strg+A bei offener Rückfrage (Fokus auf Dialogknopf, Passwort dahinter aufgedeckt): gesperrt, nichts markiert (a2-1)', offen&&auf&&dlg&&knopf, {offen,auf,dlg,knopf});
    wc.sendInputEvent({type:'keyDown',keyCode:'Escape'}); wc.sendInputEvent({type:'keyUp',keyCode:'Escape'});
    const zu=await until(`document.getElementById('dlg').classList.contains('hidden')`,3000), da=await js(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Markierung')`);
    R('Markierung: Rückfrage per Escape abgebrochen, Eintrag bleibt', zu&&da, {zu,da}); }
  // (3) Gefülltes Textfeld (Suche): die App sperrt Chromiums „Alles markieren“ und markiert das Feld selbst (select() im keydown → PRIMARY wie bisher)
  { await js(`(()=>{ const q=document.getElementById('search'); q.value='mk-suche'; q.focus(); return true; })()`); await ka();
    const M='mk-vorher-s-'+process.pid; await clipboard.selection.writeText(M); const foc=await ensureFocus(); ctrl('A'); await sleep(500);
    const k=await ka(), selbst=k.length===1&&k[0]===true;
    const ganz=await js(`(()=>{ const q=document.getElementById('search'); return q.selectionStart===0&&q.selectionEnd===q.value.length; })()`), inP=(await prim())==='mk-suche';
    R('Strg+A im gefüllten Textfeld: App markiert das Feld (Suchfeld ganz markiert und in PRIMARY)', foc&&selbst&&ganz&&inP, {foc,k,ganz,inP});
    await js(`(()=>{ const q=document.getElementById('search'); q.value=''; q.blur(); return true; })()`); await js('AlienDesktop.clip.clear()');
    R('Strg+A im gefüllten Suchfeld: die von der App gesetzte Markierung ist gemeldet und wird gelöscht', inP&&await leer()); }
  // (3d) Strg ZUERST losgelassen (keyup von A ohne Strg): die App meldet schon im keydown (Audit run-11 e-3, Querfund Notes v1.9 a-1) — sonst blieb der
  // Feldwert ungemeldet in PRIMARY, nach Fensterwechsel/Sperre ohne Frist
  { const W='mk-suche-zwei-'+process.pid; await js(`(()=>{ const q=document.getElementById('search'); q.value=${JSON.stringify(W)}; q.focus(); return true; })()`); await ka();
    const foc=await ensureFocus();
    wc.sendInputEvent({type:'keyDown',keyCode:'A',modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:'Control'}); wc.sendInputEvent({type:'keyUp',keyCode:'A'}); await sleep(500);
    const k=await ka(), inP=(await prim())===W;
    await js(`(()=>{ const q=document.getElementById('search'); q.value=''; q.blur(); return true; })()`); await js('AlienDesktop.clip.clear()'); const weg=await leer();
    R('Strg+A, Strg zuerst losgelassen: Feld markiert (PRIMARY) und trotzdem gemeldet — Löschen leert PRIMARY (e-3)', foc&&k.length===1&&k[0]===true&&inP&&weg, {foc,k,inP,weg}); }
  // (3c) LEERES Textfeld (Suche) bei aufgedecktem Passwort: Chromium markierte dort mit Strg+A die ganze Seite (gemessen 10.10.2026 in der Hauptansicht, 682 Zeichen),
  // die App meldete nur die leere Feld-Auswahl — die Taste muss gesperrt sein (Befund aus Runde 1, Nachprüfung)
  { const offen=await openIt('Markierung'); await mclick(await at('#d-reveal-pass')); const auf=await js(`document.getElementById('d-pass').textContent===${JSON.stringify(V)}`);
    await js(`(()=>{ const q=document.getElementById('search'); q.value=''; q.focus(); return true; })()`); const leerFeld=await js(`document.activeElement.id==='search'&&document.getElementById('search').value===''`);
    await nichts('Strg+A im LEEREN Suchfeld, Passwort aufgedeckt: gesperrt, nichts markiert (a2-1)', offen&&auf&&leerFeld, {offen,auf,leerFeld});
    await js(`document.getElementById('search').blur(); true`); }
  // (3b) TEXTAREA (Notizen im Formular): leer → gesperrt, nichts markiert (Audit run-11 d-2); gefüllt → die App markiert das Feld. Danach speichern (schließt das Formular)
  { await click('button[data-action="newEntry"]'); await sleep(300); const T='mk-text-'+process.pid;
    await fill('f-title','Markierung zwei'); await js(`(()=>{ const n=document.getElementById('f-notes'); n.value=''; n.focus(); return true; })()`);
    const leerFeld=await js(`document.activeElement.id==='f-notes'&&document.getElementById('f-notes').value===''`);
    await nichts('Strg+A im LEEREN Notizfeld (TEXTAREA): gesperrt, nichts markiert (a2-1)', leerFeld, {leerFeld});
    await js(`(()=>{ const n=document.getElementById('f-notes'); n.value=${JSON.stringify(T)}; n.focus(); return true; })()`); await ka();
    const M='mk-vorher-t-'+process.pid; await clipboard.selection.writeText(M); const foc=await ensureFocus(); ctrl('A'); await sleep(500);
    const k=await ka(), selbst=k.length===1&&k[0]===true;
    const ganz=await js(`(()=>{ const n=document.getElementById('f-notes'); return n.selectionStart===0&&n.selectionEnd===n.value.length; })()`), inP=(await prim())===T;
    R('Strg+A im gefüllten Notizfeld (TEXTAREA): App markiert das Feld (ganz markiert und in PRIMARY)', foc&&selbst&&ganz&&inP, {foc,k,ganz,inP});
    await click('#add-btn'); await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Markierung zwei')`,10000);
    await js('AlienDesktop.clip.clear()');
    R('Strg+A im gefüllten Notizfeld: die von der App gesetzte Markierung ist gemeldet und wird gelöscht', inP&&await leer()); }
  R('Markierung: Detail wieder offen', await openIt('Markierung'));
  // (4) Dreifachklick auf Notizen mit NBSP: App meldet NBSP, PRIMARY hat Leerzeichen — das Löschen muss trotzdem greifen (Frist-Weg: clip.clear)
  { const M='mk-vorher-4-'+process.pid; await clipboard.selection.writeText(M); await ensureFocus(); await mclick(await atText('#d-notes','mit'),3);
    const hatNb=(await sel()).includes(NB), P=await prim(), vorb=P!==M&&!P.includes(NB)&&P.includes(TAIL);
    await js('AlienDesktop.clip.clear()'); const weg=await leer();
    R('NBSP-Absatz per Dreifachklick: Meldung mit NBSP, PRIMARY mit Leerzeichen — Löschen leert PRIMARY (a2-1)', hatNb&&vorb&&weg, {hatNb,vorb,weg}); }
  // (5) Ziehen über das Detail (Knöpfe → U+FFFC in PRIMARY), dann echtes Strg+L: auf dem Sperrbildschirm ist PRIMARY leer
  { const M='mk-vorher-5-'+process.pid; await clipboard.selection.writeText(M);
    const p1=await atText('#d-body','mk-nutzer'), p2=await atText('#d-notes',TAIL); await ensureFocus();
    wc.sendInputEvent({type:'mouseDown',x:p1.x,y:p1.y,button:'left',clickCount:1});
    for(let i=1;i<=12;i++) { wc.sendInputEvent({type:'mouseMove',x:Math.round(p1.x+(p2.x-p1.x)*i/12),y:Math.round(p1.y+(p2.y-p1.y)*i/12),button:'left',modifiers:['leftButtonDown']}); await sleep(40); }
    wc.sendInputEvent({type:'mouseUp',x:p2.x,y:p2.y,button:'left',clickCount:1}); await sleep(500);
    const P=await prim(), ffc=P.includes('\ufffc'), notiz=P.includes('Notiz: mit'), vorb=P!==M&&ffc&&notiz;
    await ensureFocus(); ctrl('L'); const gesperrt=await until(visible('screen-lock'),5000); const weg=await leer();
    R('Ziehen über Knöpfe im Detail (U+FFFC in PRIMARY), dann Strg+L: PRIMARY leer (a2-1)', vorb&&gesperrt&&weg, {ffc,notiz,gesperrt,weg}); }
  // (6) Gesperrt: boot() setzt den Fokus per 100-ms-Zeitgeber ins LEERE Passphrase-Feld (Audit run-11 c-2/d-1) — abwarten, dann Strg+A. Dort markierte
  // Chromium die ganze Sperrseite (270 Zeichen). Mutanten „Sperre hinter if(!DEK)“ und „leeres Feld durchlassen“.
  { const leerFeld=await until(`document.activeElement&&document.activeElement.id==='lock-pass'&&document.getElementById('lock-pass').value===''`,3000);
    await nichts('Gesperrt, Strg+A im leeren Passphrase-Feld: gesperrt, nichts markiert (a2-1)', leerFeld, {leerFeld}); }
  // (6b) Gesperrt, Klick auf die Überschrift nach dem Zeitgeber: Fokus nirgends
  { await sleep(300); await mclick(await at('#screen-lock [data-i18n="lock.title"]')); const nirgends=await js(`document.activeElement===document.body`);
    await nichts('Gesperrt, Strg+A ohne Feld-Fokus: gesperrt, nichts markiert (a2-1)', nirgends, {nirgends}); }
  await clipboard.selection.clear();
}
// v1.22 (Plan alien-pass-v122.md): Messungen in der echten Hülle — Markierung endet am Anfang des nächsten Blocks (nsel-trim, Querfund Tresor v3.10),
// Großschrift (text-transform) in Markierung und PRIMARY (Querfund Notes 1.13), Strg+Z holt eine überschriebene Markierung zurück (Notes v1.9 a2-1),
// Strg+F im fokussierten Suchfeld (R3a-2). Je Fall: Marke in PRIMARY, Geste, Vergleich Markierung/PRIMARY, Löschen über die Brücke → PRIMARY leer?
async function m122(){
  const wc=win.webContents, V='m122-geheim-'+process.pid;
  const ensureFocus=async()=>{ if(!win.isFocused()){ win.focus(); for(let i=0;i<30&&!win.isFocused();i++) await sleep(100); await sleep(200); } return win.isFocused(); };
  const mclick=async(p,n=1)=>{ for(let i=1;i<=n;i++){ wc.sendInputEvent({type:'mouseDown',x:p.x,y:p.y,button:'left',clickCount:i}); wc.sendInputEvent({type:'mouseUp',x:p.x,y:p.y,button:'left',clickCount:i}); } await sleep(500); };
  const at=sel=>js(`(()=>{const n=document.querySelector(${JSON.stringify(sel)}); if(!n) return null; const b=n.getBoundingClientRect(); return {x:Math.round(b.x+Math.min(b.width/2,30)),y:Math.round(b.y+b.height/2),l:Math.round(b.left),t:Math.round(b.top),b:Math.round(b.bottom),r:Math.round(b.right)};})()`);
  const atText=(root,needle,off=1)=>js(`(()=>{ const w=document.createTreeWalker(document.querySelector(${JSON.stringify(root)}),NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){ const i=n.data.indexOf(${JSON.stringify(needle)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i+${off}); r.setEnd(n,i+${off}+1); const b=r.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)}; } } return null; })()`);
  const drag=async(p1,p2)=>{ await ensureFocus(); wc.sendInputEvent({type:'mouseDown',x:p1.x,y:p1.y,button:'left',clickCount:1});
    for(let i=1;i<=12;i++){ wc.sendInputEvent({type:'mouseMove',x:Math.round(p1.x+(p2.x-p1.x)*i/12),y:Math.round(p1.y+(p2.y-p1.y)*i/12),button:'left',modifiers:['leftButtonDown']}); await sleep(30); }
    wc.sendInputEvent({type:'mouseUp',x:p2.x,y:p2.y,button:'left',clickCount:1}); await sleep(500); };
  const key=(k,mods=[])=>{ wc.sendInputEvent({type:'keyDown',keyCode:k,modifiers:mods}); if(k.length===1&&!mods.includes('control')) wc.sendInputEvent({type:'char',keyCode:k,modifiers:mods}); wc.sendInputEvent({type:'keyUp',keyCode:k,modifiers:mods}); };
  const type=async s=>{ for(const ch of s){ key(ch); await sleep(15); } await sleep(150); };
  const sel=()=>js(`String(getSelection())`);
  const leer=async(ms=3000)=>{ const t0=Date.now(); let ok=false; while(Date.now()-t0<ms&&!(ok=(await prim())==='')) await sleep(100); return ok; };
  const clear=async()=>{ await js('AlienDesktop.clip.clear()'); return leer(); };
  const neutral=async()=>{ await js(`getSelection().removeAllRanges(); document.activeElement&&document.activeElement.blur&&document.activeElement.blur(); true`); };
  let nr=0; const marke=async()=>{ const M='m122-vorher-'+(++nr)+'-'+process.pid; await clipboard.selection.writeText(M); return M; };
  // Fall: Geste ausführen, dann vergleichen und über die Brücke löschen. ok = PRIMARY danach leer (Messwerte in info)
  const fall=async(titel,geste)=>{ await neutral(); const M=await marke(); const vorb=await geste(); const P=await prim(), S=await sel();
    const info={vorb,primNeu:P!==M,gleich:P===S,selLen:S.length,primLen:P.length,selEnde:JSON.stringify(S.slice(-3)),primEnde:JSON.stringify(P.slice(-3)),grossSel:/[A-ZÄÖÜ]{5}/.test(S),grossPrim:/[A-ZÄÖÜ]{5}/.test(P)};
    const mu=await js(`window.__mu.splice(0)`); info.muLetzte=mu.length?mu[mu.length-1].length:null; info.dragstart=await js(`window.__ds`); await js(`window.__ds=0; true`); info.muGleichSel=mu.length?mu[mu.length-1]===S:null;
    info.weg=P===M?null:await clear();
    // Vorbedingung der Geste muss stehen (run-12 e-2), und der Ziehen-und-Ablegen-Fall muss wirklich ohne mouseup über dragstart laufen (e-3)
    const vok=vorb===true||(vorb&&typeof vorb==='object'&&vorb.ok!==false), dok=!/Ziehen-und-Ablegen/.test(titel)||(info.dragstart>=1&&info.muLetzte===null);
    R(titel, info.weg===true&&vok&&dok, info); };
  const openIt=async t=>{ const p=await js(`(()=>{const n=[...document.querySelectorAll('#entry-list .entry .t')].find(n=>n.textContent===${JSON.stringify(t)}); if(!n) return null; n.scrollIntoView({block:'center'}); const b=n.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()`);
    if(!p) return false; await ensureFocus(); await mclick(p); return until(`${visible('detail-overlay')}&&!!document.getElementById('d-notes')`,5000); };
  await js(`window.__mu=[]; window.__ds=0; document.addEventListener('mouseup',()=>{ window.__mu.push(String(getSelection())); },true); document.addEventListener('dragstart',()=>{ window.__ds++; },true); true`);
  R('m122: Sperrbildschirm', await until(visible('screen-lock'),15000));
  await ensureFocus(); await fill('lock-pass',PP); await click('#unlock-btn'); R('m122: entsperrt', await until(visible('screen-app')));
  await click('button[data-action="newEntry"]'); await sleep(300);
  await fill('f-title','Messung'); await fill('f-user','mess-nutzer-1'); await fill('f-pass',V); await fill('f-url','beispiel.example'); await fill('f-notes','Zeile eins\n\nZeile zwei'); await click('#add-btn');
  R('m122: Eintrag gespeichert', await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Messung')`,10000));
  R('m122: Detail offen', await openIt('Messung'));
  await mclick(await at('#d-reveal-pass')); R('m122: Passwort aufgedeckt', await js(`document.getElementById('d-pass').textContent===${JSON.stringify(V)}`));
  // (9) nsel-trim: Ziehen aus einem Wert in die Lücke vor dem nächsten Block bzw. an dessen Anfang
  const boxes=await js(`[...document.querySelectorAll('#d-body .kv')].map(k=>{ const b=k.getBoundingClientRect(); return {l:Math.round(b.left),t:Math.round(b.top),b:Math.round(b.bottom),r:Math.round(b.right),k:(k.querySelector('.k')||{}).textContent}; })`);
  R('m122: Blöcke im Detail', boxes.length>=3, boxes.map(b=>b.k+':'+b.t+'-'+b.b));
  const pU=await atText('#d-body','mess-nutzer-1',2);
  for(let i=0;i+1<boxes.length&&i<4;i++){ const a=boxes[i], z=boxes[i+1], gap=Math.max(1,z.t-a.b);
    for(const [wo,p2] of [['Lücke',{x:a.l+8,y:a.b+Math.floor(gap/2)}],['Anfang nächster Block',{x:z.l+1,y:z.t+2}],['links neben nächstem Block',{x:Math.max(1,z.l-4),y:z.t+6}]]){
      const start=i===0?pU:{x:a.l+12,y:Math.round((a.t+a.b)/2)};
      await fall('nsel: Ziehen aus „'+a.k+'“ bis '+wo+' (y '+p2.y+')', async()=>{ await drag(start,p2); return true; }); } }
  // (9b) Tresor-Form (run-12 c-2): Ende am ANFANG eines Absatzes hinter einem Rand — Notizen → #d-meta
  { await js(`document.getElementById('d-meta').scrollIntoView({block:'center'}); true`); await sleep(300);
    const m=await at('#d-meta'), pz=await atText('#d-notes','zwei',1);
    for(const [wo,p2] of [['Anfang #d-meta',{x:m.l+1,y:m.t+2}],['Rand über #d-meta',{x:m.l+4,y:m.t-6}],['links neben #d-meta',{x:Math.max(1,m.l-4),y:m.t+4}]])
      await fall('nsel (Tresor-Form): Ziehen aus den Notizen bis '+wo, async()=>{ if(!pz||!m) return false; await drag(pz,p2); return true; }); }
  // (18b) Großschrift: Etikett (CSS uppercase) bis in den Wert, Dreifachklick aufs Etikett
  { const lab=await atText('#d-body','Passwort',1)||await at('#d-body .kv .k'); const val=await atText('#d-pass',V.slice(0,6),3);
    await fall('Großschrift: Ziehen vom Etikett „Passwort“ in das aufgedeckte Passwort', async()=>{ if(!lab||!val) return false; await drag(lab,val); return true; });
    await fall('Großschrift: Dreifachklick auf ein Etikett', async()=>{ const p=await at('#d-body .kv .k'); if(!p) return false; await ensureFocus(); await mclick(p,3); return true; }); }
  // (18a) Fokus im Suchfeld, dann mit der Maus über Listentext ziehen
  { await js(`App.closeDetail(); true`); await sleep(200);
    await fall('Fokus im Suchfeld, Ziehen über die Liste', async()=>{ const s=await at('#search'); await mclick(s); const t=await atText('#entry-list','Messung',0), u=await atText('#entry-list','Messung',6);
      if(!t||!u) return false; await drag(t,u); return {fokus:await js(`document.activeElement.id||document.activeElement.tagName`)}; }); }
  // (15) Strg+F im schon fokussierten Suchfeld
  { await fall('Strg+F im fokussierten Suchfeld mit Text', async()=>{ const s=await at('#search'); await mclick(s); await type('Mes'); await clipboard.selection.writeText('m122-vor-strgf-'+process.pid);
      key('F',['control']); await sleep(400); return {fokus:await js(`document.activeElement.id`), wert:await js(`document.getElementById('search').value`)}; });
    await fill('search',''); await js(`App.renderList(); true`); }
  // (12) a2-1: Markierung im Feld (gemeldet), Frist abgelaufen (Brücke löscht), überschreiben, Strg+Z holt sie zurück
  for(const f of ['f-notes','f-pass']){
    await click('button[data-action="newEntry"]'); await sleep(400);
    await fall('Strg+Z NACH Ablauf der Frist holt überschriebene Markierung zurück ('+f+') — gemeldet, gelöscht (run-12 c-1)', async()=>{ await js(`document.getElementById(${JSON.stringify(f)}).scrollIntoView({block:'center'}); true`); await sleep(200); const p=await at('#'+f); await mclick(p); await type(f==='f-pass'?'geheim-defgh':'abc-defgh');
      const nachTippen={akt:await js(`document.activeElement.id`),wert:await js(`document.getElementById(${JSON.stringify(f)}).value.length`)};
      for(let i=0;i<5;i++){ key('Left',['shift']); await sleep(40); } await sleep(300); const vor=await prim();
      await type('X'); await sleep(200); const weg1=await clear(); key('Z',['control']); await sleep(500);
      const feldNach=await js(`(()=>{const n=document.getElementById(${JSON.stringify(f)}); return n.value.substring(n.selectionStart,n.selectionEnd);})()`);
      return {ok:vor==='defgh'&&weg1&&feldNach==='defgh'&&(await prim())==='defgh', nachTippen,vor:vor==='defgh',weg1, feld:await js(`(()=>{const n=document.getElementById(${JSON.stringify(f)}); return n.value.substring(n.selectionStart,n.selectionEnd);})()`)}; });
    await click('button[data-action="cancelEdit"]'); await sleep(300); }
  // (9c) Tresor-Form am TOTP-Schlüssel der Aegis-Hürde: #totp-secret → Knöpfe → p.muted (Einrichtung, danach abbrechen). Als LETZTES: user-select:all lässt
  // Chromium beim Ziehen ein Ziehen-und-Ablegen starten (kein mouseup) — danach nimmt die Seite im Test keine Klicks mehr an
  { await js(`App.tab('settings'); true`); await sleep(300); await click('[data-action="totpStart"]'); await sleep(500);
    await js(`document.getElementById('totp-secret').scrollIntoView({block:'center'}); true`); await sleep(300);
    const sec=await js(`document.getElementById('totp-secret').textContent.slice(2,6)`), ps=sec?await atText('#totp-secret',sec,1):null;
    const mu=await js(`(()=>{ const n=document.querySelector('#totp-setup p.muted[data-i18n="set.totpSetup3"]'); const b=n.getBoundingClientRect(); return {l:Math.round(b.left),t:Math.round(b.top)}; })()`);
    for(const [wo,p2] of [['Anfang p.muted',{x:mu.l+1,y:mu.t+2}],['Rand über p.muted',{x:mu.l+4,y:mu.t-6}]])
      await fall('nsel (Tresor-Form): Ziehen aus dem TOTP-Schlüssel bis '+wo+(wo==='Rand über p.muted'?' — Ziehen-und-Ablegen ohne mouseup, dragstart meldet':''), async()=>{ if(!ps) return false; await drag(ps,p2); return true; });
    await js(`App.totpCancel(); App.tab('list'); true`); await sleep(300); }
  await clipboard.selection.clear();
}
// v1.22: Backup über den Speichern-Dialog (Querfunde Alien Notes 1.12 run-10 b-5/b-8, atomic.js wie Notes 1.13): Rückfrage beim Überschreiben verlangt,
// neu und überschreibend mit Rechten 600 und ohne Temp-Reste, Fehler nur mit Code (ohne Pfad), Abbruch ohne Meldung
async function sichern(){
  const dir=path.join(path.dirname(DATA),'sichern-'+process.pid); fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
  const msg=()=>js(`document.getElementById('bk-msg').textContent`);
  const exp=async()=>{ await js(`App.exportVault(); true`); await sleep(900); };
  R('Sichern: Sperrbildschirm', await until(visible('screen-lock'),15000));
  await fill('lock-pass',PP); await click('#unlock-btn'); R('Sichern: entsperrt', await until(visible('screen-app')));
  const ziel=path.join(dir,'b1.vault'); dlgNext={canceled:false,filePath:ziel}; dlgCalls.length=0; await exp();
  { const o=dlgCalls[0]||{}, da=fs.existsSync(ziel), m=da?(fs.statSync(ziel).mode&0o777):0;
    R('Sichern neu: ein Dialog, Option showOverwriteConfirmation übergeben (ob gefragt wird: Portal, Gerätetest), Filter .vault', dlgCalls.length===1&&Array.isArray(o.properties)&&o.properties.includes('showOverwriteConfirmation')&&JSON.stringify(o.filters)==='[{"name":"Alien Pass Backup","extensions":["vault"]}]', {n:dlgCalls.length,props:o.properties,filters:o.filters});
    R('Sichern neu: Datei da, Rechte 600, Meldung nennt nur den Dateinamen', da&&m===0o600&&/b1\.vault/.test(await msg())&&!(await msg()).includes(dir), {da,m:m.toString(8)}); }
  { const vor=fs.readFileSync(ziel,'utf8'); fs.writeFileSync(ziel,'alt'); fs.chmodSync(ziel,0o644); dlgNext={canceled:false,filePath:ziel}; await exp();
    const jetzt=fs.readFileSync(ziel,'utf8'), m=fs.statSync(ziel).mode&0o777, rest=fs.readdirSync(dir).filter(n=>n!=='b1.vault');
    R('Sichern überschreibend: neuer Inhalt, Rechte 600, keine Temp-Reste', jetzt!=='alt'&&jetzt.length>100&&vor.length>100&&m===0o600&&rest.length===0, {m:m.toString(8),rest}); }
  { dlgNext={canceled:false,filePath:path.join(dir,'fehlt','x.vault')}; await exp(); const t=await msg();
    R('Sichern Schreibfehler: Meldung mit Code, ohne Pfad', /ENOENT/.test(t)&&!t.includes(dir)&&!t.includes('fehlt'), t.replace(dir,'<DIR>')); }
  { await js(`document.getElementById('bk-msg').textContent='x'; true`); dlgNext=null; await exp(); R('Sichern abgebrochen: keine Meldung', (await msg())===''); }
  fs.rmSync(dir,{recursive:true,force:true});
}
async function unreadable(){
  R('Lesefehler: keine Einrichtung', await until(visible('screen-lock'),15000)&&!(await js(visible('screen-setup'))));
  R('Lesefehler: Meldung', /nicht lesbar|not readable/.test(await js(`document.getElementById('lock-err').textContent`)));
  await fill('lock-pass',PP); await click('#unlock-btn'); await sleep(800);
  R('Lesefehler: Entsperren bleibt gesperrt', await js(visible('screen-lock'))&&!(await js(visible('screen-app'))));
}

// v1.23 (Querfunde Alien Notes v1.14, Release-Audit run-12 b-1/b2-1/b2-2/b3-1/b3-2/r4-1, in Pass gemessen 17.10.2026): Markieren in der echten Hülle.
// Proben aus der Notes-Hülle übernommen und an Pass angepasst: Notizfeld im Formular (#f-notes, Textfeld), Detailansicht (#d-notes, Seitentext).
// nachrollen/sperrziehen: die Befunde (gegen v1.22 rot); markklick/fremdanfang/spiegel (+AP_VOR=zitter): Rückschritte der Notes-Fixfassungen (Wächter).
const {spawn:spawnM}=require('child_process');
const ensureFocusM=async()=>{ if(!win.isFocused()){ win.focus(); for(let i=0;i<30&&!win.isFocused();i++) await sleep(100); await sleep(200); } return win.isFocused(); };
const mouseOfM=wc=>(type,x,y,o={})=>wc.sendInputEvent({type,x:Math.round(x),y:Math.round(y),button:o.button||'left',clickCount:o.cc||1,...(o.mod?{modifiers:o.mod}:{})});
const keyM=(wc,k,mod)=>{ wc.sendInputEvent({type:'keyDown',keyCode:k,...(mod?{modifiers:mod}:{})}); if(!mod||!mod.includes('control')) wc.sendInputEvent({type:'char',keyCode:k,...(mod?{modifiers:mod}:{})}); wc.sendInputEvent({type:'keyUp',keyCode:k,...(mod?{modifiers:mod}:{})}); };
const keyNCM=(wc,k,mod)=>{ wc.sendInputEvent({type:'keyDown',keyCode:k,...(mod?{modifiers:mod}:{})}); wc.sendInputEvent({type:'keyUp',keyCode:k,...(mod?{modifiers:mod}:{})}); };
const strgLM=wc=>{ wc.sendInputEvent({type:'keyDown',keyCode:'Control'}); wc.sendInputEvent({type:'keyDown',keyCode:'L',modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:'L',modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:'Control'}); };
const strgCM=wc=>{ wc.sendInputEvent({type:'keyDown',keyCode:'Control'}); wc.sendInputEvent({type:'keyDown',keyCode:'C',modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:'C',modifiers:['control']}); wc.sendInputEvent({type:'keyUp',keyCode:'Control'}); };
const fselM=id=>js(`(()=>{ const t=document.getElementById(${JSON.stringify(id)}); return {s:t.selectionStart,e:t.selectionEnd,d:t.selectionDirection,akt:document.activeElement&&document.activeElement.id,v:t.value}; })()`);
const caretXYM=(id,pos)=>js(`(()=>{ const n=document.getElementById(${JSON.stringify(id)}), cs=getComputedStyle(n), d=document.createElement('div');
  ['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','wordBreak','overflowWrap','tabSize','paddingTop','paddingLeft','paddingRight','borderTopWidth','borderLeftWidth'].forEach(k=>d.style[k]=cs[k]);
  Object.assign(d.style,{position:'absolute',visibility:'hidden',whiteSpace:n.tagName==='TEXTAREA'?'pre-wrap':'pre',boxSizing:'content-box',width:(n.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))+'px',left:'0',top:'0'});
  d.textContent=n.value.slice(0,${pos}); const m=document.createElement('span'); m.textContent=n.value.slice(${pos},${pos}+1)||'.'; d.appendChild(m); document.body.appendChild(d);
  const b=n.getBoundingClientRect(), x=b.left+parseFloat(cs.borderLeftWidth)+m.offsetLeft+m.offsetWidth/2-n.scrollLeft, y=b.top+parseFloat(cs.borderTopWidth)+m.offsetTop+m.offsetHeight/2-n.scrollTop; d.remove(); return {x,y}; })()`);
const txtPosM=(root,needle)=>js(`(()=>{ const w=document.createTreeWalker(document.querySelector(${JSON.stringify(root)}),NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ const i=n.data.indexOf(${JSON.stringify(needle)}); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+1); const b=r.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; } } return null; })()`);
const leerM=async(ms=3000)=>{ const t0=Date.now(); let ok=false; while(Date.now()-t0<ms&&!(ok=(await prim())==='')) await sleep(100); return ok; };
async function unlockM(){ R('Sperrbildschirm', await until(visible('screen-lock'),15000)); await ensureFocusM(); await fill('lock-pass',PP); await click('#unlock-btn');
  const ok=await until(visible('screen-app')); if(ok){ await js(`App.setAutolock('0'); true`); await sleep(300); } return ok; }
async function relockM(){ if(await js(visible('screen-lock'))){ await ensureFocusM(); await fill('lock-pass',PP); await click('#unlock-btn'); await until(visible('screen-app'),60000); await sleep(400); } }
// Formular „Neuer Eintrag“ mit Notizfeld-Inhalt (ohne Speichern); nach einer Sperre ist das Formular geleert und wird neu geöffnet
async function formM(title,notes){ await click('button[data-action="newEntry"]'); await sleep(400); await fill('f-title',title); await fill('f-notes',notes); await sleep(250); }
// gespeicherter Eintrag, dessen Notizen in der Detailansicht als Seitentext stehen
async function saveM(title,notes){ await formM(title,notes); await click('#add-btn'); return until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent===${JSON.stringify(title)})`,10000); }
async function openDetailM(t){ const p=await js(`(()=>{const n=[...document.querySelectorAll('#entry-list .entry .t')].find(n=>n.textContent===${JSON.stringify(t)}); if(!n) return null; n.scrollIntoView({block:'center'}); const b=n.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()`);
  if(!p) return false; await ensureFocusM(); const wc=win.webContents; wc.sendInputEvent({type:'mouseDown',x:p.x,y:p.y,button:'left',clickCount:1}); wc.sendInputEvent({type:'mouseUp',x:p.x,y:p.y,button:'left',clickCount:1}); await sleep(500);
  return until(`${visible('detail-overlay')}&&!!document.getElementById('d-notes')`,5000); }
const closeDetailM=()=>js(`(()=>{ getSelection().removeAllRanges(); try{ App.closeDetail(); }catch(_){} return true; })()`);

// b-1 MITTEL: Markieren bis an den Rand, Maus ruht → Chromium rollt nach; PRIMARY muss den Endstand tragen und nach dem Löschen leer sein.
async function nachrollen(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid, M='mk-nachrollen-'+process.pid, REST=40;
  const cnt=t=>(t.match(new RegExp(G,'g'))||[]).length;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const lines=Array.from({length:150},(_,i)=>'Zeile '+i+' '+G+' text').join('\n');
  // (A) Notizfeld im Formular (Textfeld, Standardhöhe und größer gezogen)
  await formM('Lang-Feld',lines);
  for(const [off,hold,hoch] of [[1,3000,0],[3,3000,0],[1,3000,260]]){
    const f=await js(`(()=>{ const t=document.getElementById('f-notes'); if(${hoch}) t.style.height='${hoch}px'; t.setSelectionRange(0,0); t.scrollIntoView({block:'center'}); t.scrollTop=t.scrollHeight-t.clientHeight-${REST}; const b=t.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height,top:t.scrollTop,leer:t.selectionStart===t.selectionEnd}; })()`);
    await clipboard.selection.writeText(M); await ensureFocusM();
    const a={x:f.x+30,y:f.y+Math.min(20,f.h/4)}, z={x:f.x+f.w/2,y:f.y+f.h-off};
    mouse('mouseDown',a.x,a.y); for(let i=1;i<=14;i++){ mouse('mouseMove',a.x+(z.x-a.x)*i/14,a.y+(z.y-a.y)*i/14,{mod:['leftButtonDown']}); await sleep(30); }
    await sleep(120); const y0=await js(`document.getElementById('f-notes').scrollTop`); await sleep(hold); const y1=await js(`document.getElementById('f-notes').scrollTop`);
    mouse('mouseUp',z.x,z.y); await sleep(700);
    const p=await prim(), sel=await js(`(()=>{ const t=document.getElementById('f-notes'); return t.value.substring(t.selectionStart,t.selectionEnd); })()`);
    const vorb=f.leer&&p!==M&&cnt(sel)>0&&y1>f.top;
    await js('AlienDesktop.clip.clear()'); const weg=await leerM();
    R(`Nachrollen im Notizfeld (Höhe ${Math.round(f.h)} px, Rand-${off}, Maus ruht ${hold} ms): PRIMARY = Endstand, nach dem Löschen leer`, vorb&&p===sel&&weg, {vorb,gleich:p===sel,weg,scroll:[f.top,y0,y1],primLen:p.length,selLen:sel.length,primMarker:cnt(p),selMarker:cnt(sel)});
    if(!weg){ await js('App.lock(); true'); await sleep(1000); R('  danach gesperrt: PRIMARY leer', (await prim())===''||(await prim())===M, {primMarker:cnt(await prim())}); await relockM(); await formM('Lang-Feld',lines); }
    await clipboard.selection.clear(); }
  // (B) Detailansicht (Seitentext im rollenden Overlay), gezogen bis an den unteren Fensterrand
  try{ await js(`(()=>{ const t=document.getElementById('f-notes'); t.style.height=''; return true; })()`); }catch(_){}
  const TD='Lang-Detail-'+process.pid;   // Titel je Prozess eindeutig (Lehre Spiegel-<pid>): bei einem zweiten Lauf auf demselben Tresor öffnete openDetailM sonst den älteren Eintrag (fremde Marker)
  const okS=await saveM(TD,lines); R('Eintrag mit langen Notizen gespeichert', okS);
  // negative Werte: Maus UNTER dem Fensterrand (wie beim Markieren über den Rand hinaus). Nur −20/−60 (run-13 a H-3): 1/3 px ÜBER dem Fensterrand rollt die
  // Detailspalte nicht nach und die Markierung wächst bei ruhender Maus nicht (gemessen: scroll [0,0], PRIMARY = Auswahl, 23/23 Marker) — die Lage von b-1
  // entsteht dort gar nicht, auch v1.22 bliebe grün; die alte Vorbedingung war nur erfüllt, wenn die Markierung 120 ms nach dem Ziehen zufällig noch
  // hinterherhinkte (unveränderter Stand 2/2 rot, früher grün). Im Notizfeld (A) bleiben Rand-1/-3: das Feld rollt dort nach (Vorbedingung y1>top).
  // AP_DOFF=1,3 nur zum Nachmessen (meldet dann rot über die Vorbedingung).
  for(const off of (process.env.AP_DOFF||'-20,-60').split(',').map(Number)){
    if(!(await openDetailM(TD))){ R('Detail offen',false); break; }
    const info=await js(`(()=>{ const o=document.getElementById('detail-overlay'); o.scrollTop=0; const d=document.getElementById('d-notes'); const b=d.getBoundingClientRect(); return {sh:o.scrollHeight,ch:o.clientHeight,ih:innerHeight,top:b.top,left:b.left}; })()`);
    const a=await txtPosM('#d-notes','Zeile 2 '); await clipboard.selection.writeText(M); await ensureFocusM();
    const z={x:a.x+120,y:info.ih-off};
    // Ziehen an Zustände gebunden (wie [2r], gemessen 17.10.2026): kamen die Bewegungen gebündelt an, war die Markierung 120 ms nach dem Ziehen noch leer
    // (wuchs [0,4267], scroll [0,0]) — die alte Vorbedingung „gewachsen“ war dann allein durch die späte Zustellung erfüllt, auch bei −20/−60. Darum auf der
    // gleichen Geraden in Stufen bis 40 px über den Fensterrand, je bis die Markierung gewachsen ist, dann unter den Rand, bis sie dort gewachsen ist.
    const L='String(getSelection()).length', tIn=Math.max(0.2,Math.min(1,(info.ih-40-a.y)/(z.y-a.y))); let stufen=0;
    mouse('mouseDown',a.x-4,a.y); await sleep(40);
    for(let i=1;i<=5;i++){ const t=tIn*i/5, l=await js(L); mouse('mouseMove',a.x-4+(z.x-(a.x-4))*t,a.y+(z.y-a.y)*t,{mod:['leftButtonDown']}); if(await until(`${L}>${l}`,2000)) stufen++; }
    { const l=await js(L); mouse('mouseMove',z.x,z.y,{mod:['leftButtonDown']}); await until(`${L}>${l}`,3000); }
    await sleep(120); const y0=await js(`document.getElementById('detail-overlay').scrollTop`), l0=await js(L); await sleep(3000); const y1=await js(`document.getElementById('detail-overlay').scrollTop`), l1=await js(L);
    const pR=await prim(), selR=await js(`String(getSelection())`);
    mouse('mouseUp',z.x,z.y); await sleep(700);
    const p=await prim(), sel=await js(`String(getSelection())`);
    // Lage (b-1): PRIMARY hinkt bei ruhender Maus der Markierung hinterher (Markerzahl, unabhängig von der Zeilenend-Angleichung) — genau der Stand, den v1.22
    // nach Frist und Sperre stehen ließ (gemessen: 680 von 736, 708 von 4436 Zeichen)
    const vorb=p!==M&&cnt(sel)>0&&cnt(selR)>cnt(pR);
    await js('AlienDesktop.clip.clear()'); const weg=await leerM();
    R(`Nachrollen in der Detailansicht (Seitentext, ${off<0?(-off)+' px unter dem Fensterrand':'Rand-'+off}, Maus ruht 3000 ms): PRIMARY = Endstand, nach dem Löschen leer`, vorb&&weg, {vorb,stufen,gleich:p===sel,weg,scroll:[y0,y1],wuchs:[l0,l1],ruheMarker:[cnt(pR),cnt(selR)],overlay:[info.sh,info.ch],primLen:p.length,selLen:sel.length,primMarker:cnt(p),selMarker:cnt(sel)});
    if(!weg){ await js('App.lock(); true'); await sleep(1000); R('  danach gesperrt: PRIMARY leer', (await prim())===''||(await prim())===M, {primMarker:cnt(await prim())}); await relockM(); }
    else await closeDetailM();
    await clipboard.selection.clear(); }
}

// b2-1 (Rückschritt-Probe für einen reselect-Fix): ein Klick IN eine Markierung hebt sie auf, ein danach getipptes Zeichen überschreibt nichts.
async function markklick(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='Klick-'+process.pid;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const body='alpha beta gamma delta epsilon zeta eta theta iota kappa lambda my ny xi omikron '+G;
  await formM('Titel-alpha-beta-gamma-delta',body);
  for(const [art,wie] of [['Ziehen','drag'],['Doppelklick','dbl']]){
    await fill('f-notes',body); await sleep(150);
    await js(`(()=>{ const t=document.getElementById('f-notes'); t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollTop=0; return true; })()`); await sleep(150);
    await clipboard.selection.clear(); await ensureFocusM();
    const i0=body.indexOf('beta'), i1=body.indexOf('delta')+5;
    const a=await caretXYM('f-notes',i0), z=await caretXYM('f-notes',i1-1);
    if(wie==='drag'){ mouse('mouseDown',a.x-3,a.y); for(let i=1;i<=8;i++){ mouse('mouseMove',a.x-3+(z.x+4-(a.x-3))*i/8,a.y,{mod:['leftButtonDown']}); await sleep(30); } mouse('mouseUp',z.x+4,z.y); }
    else { mouse('mouseDown',a.x,a.y,{cc:1}); mouse('mouseUp',a.x,a.y,{cc:1}); mouse('mouseDown',a.x,a.y,{cc:2}); mouse('mouseUp',a.x,a.y,{cc:2}); }
    await sleep(400); const s1=await fselM('f-notes'); const p1=await prim();
    await sleep(900); const mid=await caretXYM('f-notes',wie==='drag'?body.indexOf('gamma')+2:i0+2);
    mouse('mouseDown',mid.x,mid.y,{cc:1}); await sleep(60); mouse('mouseUp',mid.x,mid.y,{cc:1}); await sleep(400);
    const s2=await fselM('f-notes');
    R(`Notizfeld, ${art} markiert, Klick hinein: Markierung aufgehoben`, s1.s<s1.e&&s2.s===s2.e, {vorher:[s1.s,s1.e,s1.d,s1.akt], primGleich:p1===body.slice(s1.s,s1.e), nachher:[s2.s,s2.e,s2.d,s2.akt]});
    keyM(wc,'X'); await sleep(300); const s3=await fselM('f-notes');
    R(`  → ein Zeichen getippt: kein markierter Text überschrieben`, body.length-(s3.v.length-1)===0, {laengeVorher:body.length, laengeNachher:s3.v.length, umgebung:JSON.stringify(s3.v.slice(Math.max(0,s2.s-6),s2.s+8))});
  }
  { const T=await js(`document.getElementById('f-title').value`); await js(`(()=>{ const t=document.getElementById('f-title'); t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); return true; })()`); await sleep(150);
    await clipboard.selection.clear(); await ensureFocusM();
    const i0=T.indexOf('alpha'), i1=T.indexOf('gamma')+5; const a=await caretXYM('f-title',i0), z=await caretXYM('f-title',i1-1);
    mouse('mouseDown',a.x-3,a.y); for(let i=1;i<=8;i++){ mouse('mouseMove',a.x-3+(z.x+4-(a.x-3))*i/8,a.y,{mod:['leftButtonDown']}); await sleep(30); } mouse('mouseUp',z.x+4,z.y); await sleep(400);
    const s1=await fselM('f-title'); await sleep(900); const mid=await caretXYM('f-title',T.indexOf('beta')+2);
    mouse('mouseDown',mid.x,mid.y,{cc:1}); await sleep(60); mouse('mouseUp',mid.x,mid.y,{cc:1}); await sleep(400); const s2=await fselM('f-title');
    R('Titelfeld, Ziehen markiert, Klick hinein: Markierung aufgehoben', s1.s<s1.e&&s2.s===s2.e, {vorher:[s1.s,s1.e], nachher:[s2.s,s2.e,s2.akt]}); }
  // Detailansicht (Seitentext)
  { await fill('f-notes',body); const okS=(await click('#add-btn'), await until(`[...document.querySelectorAll('#entry-list .entry .t')].some(n=>n.textContent==='Titel-alpha-beta-gamma-delta')`,10000));
    if(okS&&await openDetailM('Titel-alpha-beta-gamma-delta')){
      const a=await txtPosM('#d-notes','beta'), z=await txtPosM('#d-notes','delta'); await clipboard.selection.clear(); await ensureFocusM();
      mouse('mouseDown',a.x-3,a.y); for(let i=1;i<=8;i++){ mouse('mouseMove',a.x-3+(z.x+30-(a.x-3))*i/8,a.y,{mod:['leftButtonDown']}); await sleep(30); } mouse('mouseUp',z.x+30,z.y); await sleep(400);
      const g1=await js(`String(getSelection())`); await sleep(900); const mid=await txtPosM('#d-notes','gamma');
      mouse('mouseDown',mid.x,mid.y,{cc:1}); await sleep(60); mouse('mouseUp',mid.x,mid.y,{cc:1}); await sleep(400);
      const g2=await js(`({c:getSelection().isCollapsed,t:String(getSelection()).length})`);
      R('Detailansicht, Ziehen markiert, Klick hinein: Markierung aufgehoben', g1.length>0&&g2.c, {vorher:g1.length, nachher:g2});
      await closeDetailM(); }
    else R('Detailansicht offen',false); }
  await clipboard.selection.clear();
}

// b2-2: Sperre bei GEHALTENER Maustaste nach dem Nachrollen — Strg+L, Zeitgeber (auch ohne Nachrollen), Minimieren bei „sofort“; Gegenprobe erst loslassen.
async function sperrziehen(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid, M='mk-b2-'+process.pid, REST=40;
  const cnt=t=>(t.match(new RegExp(G,'g'))||[]).length;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const lines=Array.from({length:150},(_,i)=>'Zeile '+i+' '+G+' text').join('\n');
  for(const wie of (process.env.AP_WIE||'strgL,timer,timerOhne,minimize,mouseup').split(',')){
    await formM('Lang-Feld',lines);
    const f=await js(`(()=>{ const t=document.getElementById('f-notes'); t.setSelectionRange(0,0); t.scrollIntoView({block:'center'}); t.scrollTop=t.scrollHeight-t.clientHeight-${REST}; const b=t.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height,top:t.scrollTop}; })()`);
    await clipboard.selection.writeText(M); await ensureFocusM();
    const a={x:f.x+30,y:f.y+Math.min(20,f.h/4)}, z={x:f.x+f.w/2,y:wie==='timerOhne'?f.y+f.h/2:f.y+f.h-1};
    if(wie==='minimize') await js(`App.setBgLock('0'); true`);
    mouse('mouseDown',a.x,a.y); for(let i=1;i<=14;i++){ mouse('mouseMove',a.x+(z.x-a.x)*i/14,a.y+(z.y-a.y)*i/14,{mod:['leftButtonDown']}); await sleep(30); }
    await sleep(120); const pDrag=await prim(); await sleep(2500); const sel=await js(`(()=>{ const t=document.getElementById('f-notes'); return t.value.substring(t.selectionStart,t.selectionEnd); })()`);
    const pHold=await prim();
    if(wie==='strgL') strgLM(wc);
    else if(wie==='timer'||wie==='timerOhne') await js(`setTimeout(()=>App.lock(),0); true`);
    else if(wie==='minimize'){ win.minimize(); await sleep(1500); win.restore(); await sleep(800); }
    else mouse('mouseUp',z.x,z.y);
    await sleep(1500);
    if(wie!=='mouseup') mouse('mouseUp',z.x,z.y,{});
    await sleep(800);
    const gesperrt=await js(visible('screen-lock'));
    if(wie==='mouseup'){ await js('App.lock(); true'); await sleep(1200); }
    const pEnd=await prim(); const weg=pEnd===''||pEnd===M;
    // Vorbedingung (run-13 a H-2): bei ruhender Maus steht Notiztext in PRIMARY — schrieb das Ziehen PRIMARY nicht (Fokus, Last), blieb der Marker stehen und
    // der Fall war still grün. pHold (nach 2,5 s), nicht pDrag: 200 ms nach dem Ziehen stand unter Last mehrfach noch der Marker.
    const vorb=cnt(pHold)>0;
    if(wie==='minimize') await js(`App.setBgLock('30'); true`).catch(()=>{});
    R(`${wie==='timerOhne'?'OHNE Nachrollen (Mitte), ':'Nachrollen, '}dann ${wie==='strgL'?'Strg+L bei ruhender Maus':wie==='timer'||wie==='timerOhne'?'Sperre per Zeitgeber bei ruhender Maus':wie==='minimize'?'Minimieren (Hintergrund „sofort“) bei ruhender Maus':'Loslassen, dann Sperre (Gegenprobe)'}: nach der Sperre kein Notiztext in PRIMARY`, vorb&&weg,
      {vorb, gesperrt, primNachZug:pDrag.length, selBeiRuhe:sel.length, selMarker:cnt(sel), primBeiRuhe:pHold.length, primMarkerBeiRuhe:cnt(pHold), primNachSperre:pEnd.length, markerNachSperre:cnt(pEnd)});
    await clipboard.selection.clear();
    await relockM();
    if(wie==='minimize') await js(`App.setBgLock('30'); true`).catch(()=>{});
  }
}

// b3-2 (Rückschritt-Probe für einen peek-Fix): eine FREMDE Auswahl, die Anfang/Ende/Wort/Zeichen der stehenden Markierung ist, bleibt nach Meldung + Löschen bzw. Strg+L stehen.
async function fremdanfang(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const lines=Array.from({length:12},(_,i)=>'Zeile '+i+' '+G+' text').join('\n');
  for(const v of (process.env.AP_V||'wort:frist,zeichen:frist,ende:frist,zeile:frist,wort:sperre,unbezogen:frist').split(',')){ const [art,wann]=v.split(':');
    if(!(await js(`${visible('tab-add')}&&document.getElementById('f-notes').value.length>0`))) await formM('Peek',lines);
    await js(`(()=>{ const t=document.getElementById('f-notes'); t.style.height='260px'; t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollTop=0; return true; })()`); await sleep(150);
    await clipboard.selection.clear(); await ensureFocusM();
    const i0=lines.indexOf('Zeile 1 '), i1=lines.indexOf('Zeile 3 ')+9;
    const a=await caretXYM('f-notes',i0), z=await caretXYM('f-notes',i1);
    mouse('mouseDown',a.x-2,a.y); for(let i=1;i<=8;i++){ mouse('mouseMove',a.x-2+(z.x-(a.x-2))*i/8,a.y+(z.y-a.y)*i/8,{mod:['leftButtonDown']}); await sleep(30); } mouse('mouseUp',z.x,z.y); await sleep(600);
    const s=await fselM('f-notes'); const S=s.v.slice(s.s,s.e); const pS=(await prim())===S;
    const F=art==='wort'?S.split(' ')[0]:art==='zeichen'?S[0]:art==='ende'?S.slice(-3):art==='zeile'?S.split('\n')[0]:'fremd-'+process.pid;
    await clipboard.selection.writeText(F); await sleep(200); const vorF=(await prim())===F;
    keyNCM(wc,'Shift'); await sleep(600);
    let gesperrt=false;
    if(wann==='frist'){ await js('AlienDesktop.clip.clear()'); await sleep(800); }
    else { strgLM(wc); await sleep(1500); gesperrt=await js(visible('screen-lock')); }
    const pEnd=await prim();
    R(`fremde Auswahl = ${art} der Markierung, dann ${wann==='frist'?'Löschen (wie Frist)':'Strg+L'}: fremde Auswahl bleibt stehen`, pEnd===F, {Flen:F.length, selLen:S.length, pS, vorF, gesperrt, primNachher:pEnd===F?'fremd':pEnd===''?'leer':'anders'});
    await clipboard.selection.clear();
    if(gesperrt) await relockM();
  }
}

// b3-1 / r4-1: hängender fremder PRIMARY-Besitzer (SIGSTOP) + gespiegelte Kopie (wie Klipper) — Frist, Strg+L und Beenden löschen sie trotzdem.
let fremdPidM=0; const fremdAlleM=[];
async function fremdStartM(F,buf,name){
  const dir=path.join(__dirname,'fremd-app'), cfg=path.join(process.env.XDG_CONFIG_HOME||__dirname,'fremd'+(name||'')); fs.mkdirSync(cfg,{recursive:true});
  const pr=spawnM(process.execPath,['--no-sandbox',dir],{env:{...process.env,XDG_CONFIG_HOME:cfg,FREMD_TEXT:F,FREMD_BUF:buf||'selection',AP_STEP:''},stdio:['ignore','pipe','ignore']});
  fremdAlleM.push(pr.pid); if(!name) fremdPidM=pr.pid; let own=false; pr.stdout.on('data',d=>{ if(String(d).includes('OWN')) own=true; });
  for(let i=0;i<100&&!own;i++) await sleep(100);
  return own; }
function fremdStopM(){ try{ process.kill(fremdPidM,'SIGSTOP'); return true; }catch(_){ return false; } }
function fremdEndeM(){ for(const p of fremdAlleM.splice(0)){ try{ process.kill(p,'SIGCONT'); }catch(_){} try{ process.kill(p,'SIGTERM'); }catch(_){} } fremdPidM=0; }
process.on('exit',fremdEndeM);
function liesM(G){ return new Promise(res=>{ const dir=path.join(__dirname,'fremd-app'), cfg=path.join(process.env.XDG_CONFIG_HOME||__dirname,'fremdR'); fs.mkdirSync(cfg,{recursive:true});
  const pr=spawnM(process.execPath,['--no-sandbox',dir],{env:{...process.env,XDG_CONFIG_HOME:cfg,FREMD_MODE:'read',FREMD_MARK:G,AP_STEP:''},stdio:['ignore','pipe','ignore']});
  let out=''; pr.stdout.on('data',d=>out+=d); const k=setTimeout(()=>{ try{ pr.kill('SIGKILL'); }catch(_){} },8000);
  pr.on('exit',()=>{ clearTimeout(k); const m=out.match(/READ (\{.*\})/); res(m?JSON.parse(m[1]):{fehler:true}); }); }); }
async function spiegel(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid, F='fremd-haengt-'+process.pid, N=Number(process.env.AP_N||3);
  if(!(await unlockM())){ R('entsperrt',false); fremdEndeM(); R('Schritt vollständig',true); app.exit(0); return; }
  const body=Array.from({length:10},(_,i)=>'Absatz '+i+' '+G+' text.').join('\n\n');
  const TS='Spiegel-'+process.pid; await saveM(TS,body); if(!(await openDetailM(TS))){ R('Detail offen',false); }
  await ensureFocusM();
  { const a=await txtPosM('#d-notes','Absatz 1 '), z=await txtPosM('#d-notes','Absatz 2 '); mouse('mouseDown',a.x-4,a.y); for(let i=1;i<=8;i++){ mouse('mouseMove',a.x-4+(z.x+60-(a.x-4))*i/8,a.y+(z.y-a.y)*i/8,{mod:['leftButtonDown']}); await sleep(30); } mouse('mouseUp',z.x+60,z.y); }
  await sleep(500); const S=await js(`String(getSelection())`); const pS=(await prim())===S;
  const own=await fremdStartM(F,'selection'); await sleep(300); const vorF=(await prim())===F; fremdStopM(); await sleep(200);
  if(process.env.AP_VOR==='clear'){ await Promise.race([js('AlienDesktop.clip.clear()'),sleep(3000)]); }
  else if(process.env.AP_VOR==='zitter'){ const m=await txtPosM('#d-notes','Absatz 1 '); mouse('mouseDown',m.x+20,m.y); await sleep(40); mouse('mouseMove',m.x+21,m.y,{mod:['leftButtonDown']}); await sleep(40); mouse('mouseUp',m.x+21,m.y); }
  else for(let i=0;i<N;i++){ keyNCM(wc,'Down'); await sleep(40); }
  await sleep(400);
  const selVorKopie=await js(`String(getSelection())`);
  const nachVor={len:selVorKopie.length,gleichS:selVorKopie===S,akt:await js(`document.activeElement&&document.activeElement.id`)};
  strgCM(wc);
  await sleep(600); const rc=()=>Promise.race([clipboard.readText(),sleep(3000).then(()=>'HAENGT')]); const kop0=await rc(); const kop=kop0===S;
  const okQ=await fremdStartM(S,'selection','Q'); await sleep(500);
  const r0=await liesM(G);
  const tc=Date.now(); await Promise.race([js('AlienDesktop.clip.clear()'),sleep(6000)]); const clearMs=Date.now()-tc; await sleep(2500);
  const r1=await liesM(G); const c1r=await rc(); const c1=c1r===S;
  strgLM(wc); await sleep(3000); const r2=await liesM(G); const gesperrt=await js(visible('screen-lock'));
  R('Vorbedingungen', own&&vorF&&pS&&kop&&okQ&&r0.mark>0, {own,vorF,pS,kop,kopHaengt:kop0==="HAENGT",okQ,spiegelVorher:r0,nachVor,kopLen:String(kop0).length,sLen:S.length});
  R('Kopie aus CLIPBOARD gelöscht (Frist)', !c1, {c1, eigenesClipboardLesenHaengt:c1r==='HAENGT'});
  R('gespiegelte Kopie in PRIMARY nach dem Löschen (Frist) weg', r1.mark===0, {r1,clearMs});
  R('gespiegelte Kopie in PRIMARY nach Strg+L weg', r2.mark===0, {r2,gesperrt});
  const t0=Date.now();
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0; (async()=>{ const r3=await liesM(G);
    R('gespiegelte Kopie in PRIMARY beim Prozessende weg', r3.mark===0, {r3,ms});
    fremdEndeM(); R('Schritt vollständig',true); app.exit(0); })(); });
  app.quit();
}

// v1.23, Release-Audit run-13 Prüfer a (Hinweis H-1 Testlücke, Fund a-1), übernommen aus run-13/a/proben-a.cjs: die heikelsten Pass-Stellen (Passwortfeld
// type=password — Chromium legt dessen Markierung im KLARTEXT in PRIMARY —, Suchfeld, Passphrase am Sperrbildschirm mit DEK null) und der Fokuswechsel
// zwischen Drücken und Loslassen. pwnachrollen/sperrhalten: gegen v1.22 rot; fokusklick/spiegelfeld/fremdknopf: gegen die erste v1.23-Fassung von selMoved
// (selKey verglich nach einem Fokuswechsel Feld mit Seiten-Range) rot. Jede Probe meldet rot, wenn ihre Geste die Lage nicht herstellt (vorb im Ergebnis).
// Innenkante eines Feldes (l/r ohne Polster und Rahmen), Außenkante R, Zeilenmitte y
const boxM=id=>js(`(()=>{ const t=document.getElementById(${JSON.stringify(id)}); const b=t.getBoundingClientRect(), cs=getComputedStyle(t);
  const l=b.left+parseFloat(cs.paddingLeft)+parseFloat(cs.borderLeftWidth), r=b.right-parseFloat(cs.paddingRight)-parseFloat(cs.borderRightWidth);
  const y=t.tagName==='TEXTAREA'?b.top+parseFloat(cs.borderTopWidth)+parseFloat(cs.paddingTop)+8:b.top+b.height/2;
  return {l,r,R:b.right,y,w:b.width,ih:innerHeight,iw:innerWidth,sicht:b.width>0&&b.top>=0&&b.bottom<=innerHeight}; })()`);
const posM=(sel,zeigen)=>js(`(()=>{ const n=document.querySelector(${JSON.stringify(sel)}); if(!n) return null; ${zeigen?"n.scrollIntoView({block:'center'});":''} const b=n.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
const lageM=feld=>js(`(()=>{ const g=getSelection(), t=document.getElementById(${JSON.stringify(feld)}); return {akt:document.activeElement&&(document.activeElement.id||document.activeElement.tagName), coll:g.rangeCount?g.getRangeAt(0).collapsed:null, f:[t.selectionStart,t.selectionEnd]}; })()`);
const ziehM=async(mouse,a,z,n,ms)=>{ mouse('mouseDown',a.x,a.y); for(let i=1;i<=n;i++){ mouse('mouseMove',a.x+(z.x-a.x)*i/n,a.y+(z.y-a.y)*i/n,{mod:['leftButtonDown']}); await sleep(ms); } };
// Klick mit 1 px Zittern (Drücken, 1 px Bewegung mit gehaltener Taste, Loslassen) bzw. ohne Bewegung
const klickM=async(mouse,k,zitter)=>{ mouse('mouseDown',k.x,k.y); await sleep(zitter?40:80); if(zitter){ mouse('mouseMove',k.x+1,k.y,{mod:['leftButtonDown']}); await sleep(40); } mouse('mouseUp',k.x+(zitter?1:0),k.y); };

// [2r] H-1: waagrechtes Nachrollen in einzeiligen Feldern (wie [2l] im Notizfeld): bis hinter den Feldrand ziehen, Maus ruht → Chromium rollt das Feld nach,
// die Markierung wächst ohne Eingabeereignis. PRIMARY = Endstand, nach dem Löschen leer. v1.22 (Prüfer a): f-pass 109 von 649 Zeichen, Suche 48, lock-pass 45 blieben stehen.
async function pwnachrollen(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='Q'+process.pid, M='mk-pw-'+process.pid;
  const cnt=t=>(t.match(new RegExp(G,'g'))||[]).length;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  // lang genug, dass das Feld in 3 s Ruhe nicht ans Ende rollt (sonst holt eine verspätet zugestellte Bewegung PRIMARY ein, die Lage wäre nicht hergestellt)
  const lang=Array.from({length:150},(_,i)=>G+'x'+i).join('-');
  const fall=async(feld,vor)=>{ await vor();
    const da=await js(`(()=>{ const t=document.getElementById('${feld}'); t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollLeft=0; return t.value===${JSON.stringify(lang)}&&t.scrollWidth>t.clientWidth+200; })()`); await sleep(250);
    await clipboard.selection.writeText(M); await ensureFocusM();
    const b=await boxM(feld), dx=Number(process.env.AP_PWDX||40); const a={x:b.l+3,y:b.y}, z={x:Math.min(b.R+dx,b.iw-12),y:b.y};
    // Ziehen an Zustände gebunden (gemessen 17.10.2026): nach einer Ruhephase stellt Chromium hier Mausbewegungen nur noch gebündelt im 1-Hz-Bildtakt zu —
    // kam die erste verarbeitete Bewegung erst hinter dem Feldrand an, rollte das Feld nicht nach (beobachtet: lock-pass, Suche je nach Lauf). Darum in Stufen IM Feld,
    // je bis die Markierung gewachsen ist, dann hinter den Rand, bis das Feld rollt, dann noch einige Pixel weiter (Prüfer a).
    const T=`document.getElementById('${feld}')`; let stufen=0;
    mouse('mouseDown',a.x,a.y); await sleep(40);
    for(let i=1;i<=6;i++){ const e0=await js(`${T}.selectionEnd`); mouse('mouseMove',a.x+(b.r-8-a.x)*i/6,a.y,{mod:['leftButtonDown']}); if(await until(`${T}.selectionEnd>${e0}`,2000)) stufen++; }
    mouse('mouseMove',z.x,a.y,{mod:['leftButtonDown']}); const rollt=await until(`${T}.scrollLeft>0`,3000);
    for(let i=1;i<=6;i++){ mouse('mouseMove',Math.min(z.x+i*2,b.iw-2),a.y+(i%2),{mod:['leftButtonDown']}); await sleep(40); }
    await sleep(120); const x0=await js(`document.getElementById('${feld}').scrollLeft`), p0=await prim(), s0=await fselM(feld); await sleep(3000);
    const x1=await js(`document.getElementById('${feld}').scrollLeft`), pR=await prim(), sR=await fselM(feld), selR=sR.v.slice(sR.s,sR.e);
    mouse('mouseUp',Math.min(z.x+12,b.iw-2),a.y); await sleep(700);
    const p=await prim(), s=await fselM(feld), sel=s.v.slice(s.s,s.e);
    // Lage hergestellt (b-1): Feld voll + fokussiert, das Ziehen schrieb PRIMARY, das Feld ist nachgerollt (x1>0) und PRIMARY hinkt bei ruhender Maus der
    // Markierung hinterher (Chromium schreibt beim Nachrollen ohne Eingabeereignis nicht neu) — genau der Stand, den v1.22 nach Frist und Sperre stehen ließ
    const vorb=da&&b.sicht&&p0!==M&&cnt(p0)>0&&x1>0&&pR!==selR&&cnt(selR)>cnt(pR);
    await js('AlienDesktop.clip.clear()'); const weg=await leerM();
    R(`Nachrollen waagrecht in #${feld}${feld==='f-pass'?' (type=password, Klartext)':feld==='lock-pass'?' (Sperrbildschirm, DEK null)':''}: PRIMARY = Endstand, nach dem Löschen leer`, vorb&&p===sel&&weg,
      {vorb,da,stufen,rollt,box:[Math.round(b.l),Math.round(b.R),b.iw],z:Math.round(z.x),x:[x0,x1],zug:[p0.length,s0.e-s0.s],ruhe:[pR.length,selR.length],primLen:p.length,selLen:sel.length,gleich:p===sel,weg,sel:[s.s,s.e,s.akt]});
    await clipboard.selection.clear(); };
  await fall('f-pass',async()=>{ await formM('PW-Lang',''); await fill('f-pass',lang); });
  await fall('search',async()=>{ await js(`App.tab('list'); true`); await sleep(300); await fill('search',lang); await sleep(200); });
  await fill('search','');
  await fall('lock-pass',async()=>{ await js('App.lock(); true'); await sleep(900); await fill('lock-pass',lang); });
  await relockM();
}

// [2s] H-1: Sperre bei gehaltener Maus (wie [2n]) an den Pass-Stellen, die sperrziehen nicht hat: Detailansicht (Seitentext), Passwortfeld, Suchfeld.
// v1.22: Detail per Zeitgeber 514, f-pass (Strg+L) 109, Suche (Zeitgeber) 57 Zeichen nach der Sperre in PRIMARY.
async function sperrhalten(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='H'+process.pid, M='mk-halt-'+process.pid, TD='Halt-'+process.pid;   // Titel je Prozess eindeutig (Lehre Spiegel-<pid>)
  const cnt=t=>(t.match(new RegExp(G,'g'))||[]).length;
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const lines=Array.from({length:150},(_,i)=>'Zeile '+i+' '+G+' text').join('\n'), lang=Array.from({length:60},(_,i)=>G+'x'+i).join('-');
  R('Eintrag mit langen Notizen gespeichert', await saveM(TD,lines));
  for(const v of (process.env.AP_HALT||'detail:strgL,detail:timer,fpass:strgL,search:timer').split(',')){ const [wo,wie]=v.split(':'); let a,z;
    if(wo==='detail'){ if(!(await openDetailM(TD))){ R('Detail offen',false); continue; }
      await js(`document.getElementById('detail-overlay').scrollTop=0; true`); const q=await txtPosM('#d-notes','Zeile 2 '); const ih=await js('innerHeight'); a={x:q.x-4,y:q.y}; z={x:q.x+120,y:ih-2}; }
    else { const feld=wo==='fpass'?'f-pass':'search';
      if(wo==='fpass'){ await formM('Halt-PW',''); await fill('f-pass',lang); } else { await js(`App.tab('list'); true`); await sleep(300); await fill('search',lang); }
      await js(`(()=>{ const t=document.getElementById('${feld}'); t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollLeft=0; return true; })()`); await sleep(250);
      const b=await boxM(feld); a={x:b.l+3,y:b.y}; z={x:Math.min(b.r+12,b.iw-3),y:b.y}; }
    await clipboard.selection.writeText(M); await ensureFocusM();
    await ziehM(mouse,a,z,14,30);
    await sleep(200); const pDrag=await prim(); await sleep(2500); const pHold=await prim();
    if(wie==='strgL') strgLM(wc); else await js(`setTimeout(()=>App.lock(),0); true`);
    await sleep(1500); mouse('mouseUp',z.x,z.y); await sleep(900);
    const gesperrt=await js(visible('screen-lock')), pEnd=await prim(), vorb=cnt(pHold)>0&&gesperrt;   // Vorbedingung: bei ruhender Maus Text in PRIMARY, dann wirklich gesperrt
    R(`Sperre (${wie==='strgL'?'Strg+L':'Zeitgeber'}) bei gehaltener Maus nach Ziehen in ${wo==='detail'?'der Detailansicht':wo==='fpass'?'#f-pass (type=password)':'#search'}: danach kein Markierungstext in PRIMARY`, vorb&&cnt(pEnd)===0,
      {vorb,pDragMarker:cnt(pDrag),pHoldMarker:cnt(pHold),pHoldLen:pHold.length,pEndLen:pEnd.length,pEndMarker:cnt(pEnd),gesperrt});
    await clipboard.selection.clear(); await relockM();
    if(wo==='search') await fill('search','');
  }
}

// [2t] a-1 (c): Feld per Ziehen markiert → Klick auf ein Kästchen (Fokus dort, die Feld-Markierung bleibt, Seiten-Range zusammengeklappt) → Frist löscht PRIMARY →
// Klick mit 1 px Zittern IN die alte Markierung. Die erste Fassung von selMoved verglich die Seiten-Range (Drücken) mit [feld,s,e] (Loslassen) → „geändert“ →
// reselect schrieb die schon gelöschte Markierung wieder nach PRIMARY (f-pass: 12 Zeichen Klartext), in f-pass, f-notes und f-title.
async function fokusklick(){
  const wc=win.webContents, mouse=mouseOfM(wc), PW='PWgeheim'+process.pid+'abcdefghijklmnopqrstuvwxyz0123456789', KN=process.env.AP_KNOPF||'#f-fav';
  if(!(await unlockM())){ R('entsperrt',false); return; }
  for(const feld of (process.env.AP_FELDER||'f-pass,f-notes,f-title').split(',')){
    await formM('Fokus-'+feld,''); await fill(feld,PW); await sleep(150);
    await js(`(()=>{ const t=document.getElementById('${feld}'); t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); return true; })()`); await sleep(200);
    await clipboard.selection.clear(); await ensureFocusM();
    let b=await boxM(feld); await ziehM(mouse,{x:b.l+2,y:b.y},{x:b.l+92,y:b.y},8,30); mouse('mouseUp',b.l+92,b.y); await sleep(500);
    const s1=await fselM(feld), T=s1.v.slice(s1.s,s1.e), p1=await prim();
    const k=await posM(KN,true); await sleep(150); mouse('mouseDown',k.x,k.y); mouse('mouseUp',k.x,k.y); await sleep(400);
    const nachKnopf=await lageM(feld);
    await js('AlienDesktop.clip.clear()'); const weg=await leerM(); await sleep(400);   // wie Fristablauf
    await js(`document.getElementById('${feld}').scrollIntoView({block:'center'}); true`); await sleep(150);
    b=await boxM(feld); const m={x:b.l+2+45,y:b.y};   // Mitte der alten Markierung (l+2 … l+92)
    const vorK=await lageM(feld);
    await klickM(mouse,m,true); await sleep(700);
    const p2=await prim(), s2=await fselM(feld);
    // Lage: Markierung stand in PRIMARY, Fokus auf dem Kästchen, das Feld behielt [s,e] (Punkte-Falle), PRIMARY nach der Frist leer, Markierung vor dem Zitter-Klick noch da
    const vorb=T.length>=8&&p1===T&&nachKnopf.akt===KN.slice(1)&&nachKnopf.f[0]===s1.s&&nachKnopf.f[1]===s1.e&&weg&&vorK.f[0]<vorK.f[1];
    R(`${feld}: markiert, Klick auf ${KN}, Frist, Klick mit 1 px Zittern IN die alte Markierung: die gelöschte Markierung kommt NICHT wieder nach PRIMARY`, vorb&&!p2.includes(T),
      {vorb,tLen:T.length,p1GleichT:p1===T,nachKnopf,weg,p2Len:p2.length,p2HatT:p2.includes(T),s2:[s2.s,s2.e,s2.akt]});
    { await js('App.lock(); true'); await sleep(1500); const pL=await prim();
      R(`  ${feld}: danach Sperre: PRIMARY leer`, pL==='', {nachLen:pL.length}); await relockM(); }
    await clipboard.selection.clear();
  }
}

// [2u] a-1 (a): wie [2p], aber Markierung im Notizfeld (Textfeld) und als Geste ein Klick mit 1 px Zittern auf ein Kästchen (Fokus wandert, die Feld-Markierung
// bleibt). Erste Fassung von selMoved: peek → die Hülle las PRIMARY am hängenden fremden Besitzer, die gespiegelte Kopie blieb nach Frist, Strg+L und Beenden.
// AP_FVOR=knopf (Vorgabe) | knopfstill | shift (Kontrollen)
async function spiegelfeld(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid, F='fremd-haengt-'+process.pid, KN=process.env.AP_KNOPF||'#f-fav', VOR=process.env.AP_FVOR||'knopf';
  if(!(await unlockM())){ R('entsperrt',false); fremdEndeM(); R('Schritt vollständig',true); app.exit(0); return; }
  const body=Array.from({length:10},(_,i)=>'Absatz '+i+' '+G+' text.').join('\n');
  await formM('SpiegelFeld',body);
  await js(`(()=>{ const t=document.getElementById('f-notes'); t.style.height='200px'; t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollTop=0; return true; })()`); await sleep(200);
  await clipboard.selection.clear(); await ensureFocusM();
  const i0=body.indexOf('Absatz 1 '), i1=body.indexOf('Absatz 2 ')+9; const a=await caretXYM('f-notes',i0), z=await caretXYM('f-notes',i1);
  await ziehM(mouse,{x:a.x-2,y:a.y},z,8,30); mouse('mouseUp',z.x,z.y); await sleep(600);
  const s=await fselM('f-notes'); const S=s.v.slice(s.s,s.e); const pS=(await prim())===S;
  const own=await fremdStartM(F,'selection'); await sleep(300); const vorF=(await prim())===F; fremdStopM(); await sleep(200);
  const k=await posM(KN,false);
  if(VOR==='knopf'||VOR==='knopfstill') await klickM(mouse,k,VOR==='knopf'); else keyNCM(wc,'Shift');
  await sleep(400);
  const nachVor=await lageM('f-notes');
  strgCM(wc);
  await sleep(600); const rc=()=>Promise.race([clipboard.readText(),sleep(3000).then(()=>'HAENGT')]); const kop0=await rc(); const kop=kop0===S;
  const okQ=await fremdStartM(S,'selection','Q'); await sleep(500);
  const r0=await liesM(G);
  const tc=Date.now(); await Promise.race([js('AlienDesktop.clip.clear()'),sleep(6000)]); const clearMs=Date.now()-tc; await sleep(2500);
  const r1=await liesM(G); const c1r=await rc(); const c1=c1r===S;
  strgLM(wc); await sleep(3000); const r2=await liesM(G); const gesperrt=await js(visible('screen-lock'));
  // Lage (a-1): Fokus nach der Geste auf dem Kästchen, die Feld-Markierung steht noch (bei shift bleibt der Fokus im Feld)
  const lage=VOR==='shift'?nachVor.akt==='f-notes':nachVor.akt===KN.slice(1)&&nachVor.f[0]===s.s&&nachVor.f[1]===s.e;
  R('Vorbedingungen ('+VOR+')', own&&vorF&&pS&&lage&&kop&&okQ&&r0.mark>0, {own,vorF,pS,lage,kop,kopHaengt:kop0==="HAENGT",okQ,spiegelVorher:r0,nachVor,kopLen:String(kop0).length,sLen:S.length});
  R('Kopie aus CLIPBOARD gelöscht (Frist)', !c1, {c1, eigenesClipboardLesenHaengt:c1r==='HAENGT'});
  R('gespiegelte Kopie in PRIMARY nach dem Löschen (Frist) weg', r1.mark===0, {r1,clearMs});
  R('gespiegelte Kopie in PRIMARY nach Strg+L weg', r2.mark===0, {r2,gesperrt});
  const t0=Date.now();
  app.on('will-quit',ev=>{ ev.preventDefault(); const ms=Date.now()-t0; (async()=>{ const r3=await liesM(G);
    R('gespiegelte Kopie in PRIMARY beim Prozessende weg', r3.mark===0, {r3,ms});
    fremdEndeM(); R('Schritt vollständig',true); app.exit(0); })(); });
  app.quit();
}

// [2v] a-1 (b): wie [2o] (fremde Auswahl = erstes Wort der Feld-Markierung), Geste = Klick auf ein Kästchen mit/ohne 1 px Zittern, dann Löschen (wie Frist).
// Erste Fassung von selMoved: peek beim Zitter-Klick → die Hülle merkte den Hash der fremden Auswahl und löschte sie. AP_KV=knopf,knopfstill,knopf (Vorgabe)
async function fremdknopf(){
  const wc=win.webContents, mouse=mouseOfM(wc), G='GEHEIM-'+process.pid, KN=process.env.AP_KNOPF||'#f-fav';
  if(!(await unlockM())){ R('entsperrt',false); return; }
  const lines=Array.from({length:12},(_,i)=>'Zeile '+i+' '+G+' text').join('\n');
  for(const v of (process.env.AP_KV||'knopf,knopfstill,knopf').split(',')){
    await formM('FremdKnopf',lines);
    await js(`(()=>{ const t=document.getElementById('f-notes'); t.style.height='200px'; t.scrollIntoView({block:'center'}); t.focus(); t.setSelectionRange(0,0); t.scrollTop=0; return true; })()`); await sleep(150);
    await clipboard.selection.clear(); await ensureFocusM();
    const i0=lines.indexOf('Zeile 1 '), i1=lines.indexOf('Zeile 3 ')+9; const a=await caretXYM('f-notes',i0), z=await caretXYM('f-notes',i1);
    await ziehM(mouse,{x:a.x-2,y:a.y},z,8,30); mouse('mouseUp',z.x,z.y); await sleep(600);
    const s=await fselM('f-notes'); const S=s.v.slice(s.s,s.e); const pS=(await prim())===S; const F=S.split(' ')[0];
    await clipboard.selection.writeText(F); await sleep(200); const vorF=(await prim())===F;
    const k=await posM(KN,false); await klickM(mouse,k,v==='knopf');
    await sleep(600); const nach=await lageM('f-notes');
    await js('AlienDesktop.clip.clear()'); await sleep(800); const pEnd=await prim();
    const vorb=pS&&vorF&&F.length>0&&nach.akt===KN.slice(1)&&nach.f[0]===s.s&&nach.f[1]===s.e;   // Lage: Fokus auf dem Kästchen, Feld-Markierung steht noch
    R(`fremde Auswahl = erstes Wort der Feld-Markierung, Klick auf ${KN} ${v==='knopf'?'mit 1 px Zittern':'ohne Bewegung'}, Löschen: fremde Auswahl bleibt stehen`, vorb&&pEnd===F,
      {vorb,pS,vorF,nach,Flen:F.length,primNachher:pEnd===F?'fremd':pEnd===''?'leer':'anders'});
    await clipboard.selection.clear();
  }
}

app.on('browser-window-created',(_e,w)=>{ if(win) return; win=w;
  w.webContents.once('did-finish-load',async()=>{
    try{
      await until(`document.readyState==='complete'&&typeof App!=='undefined'`,15000); await js('void (window.confirm=()=>true)');   // Rückfragen bestätigen (kein Dialog im Test)
      if(STEP==='fresh') await fresh(); else if(STEP==='restart') await restart(); else if(STEP==='unreadable') await unreadable();
      else if(STEP==='background') await background();
      else if(STEP==='markierung') await markierung();
      else if(STEP==='m122') await m122();
      else if(STEP==='nachrollen') await nachrollen();
      else if(STEP==='markklick') await markklick();
      else if(STEP==='sperrziehen') await sperrziehen();
      else if(STEP==='fremdanfang') await fremdanfang();
      else if(STEP==='spiegel'){ await spiegel(); return; }   // endet in will-quit (eigene Endmarke)
      else if(STEP==='pwnachrollen') await pwnachrollen();
      else if(STEP==='sperrhalten') await sperrhalten();
      else if(STEP==='fokusklick') await fokusklick();
      else if(STEP==='spiegelfeld'){ await spiegelfeld(); return; }   // endet in will-quit (eigene Endmarke)
      else if(STEP==='fremdknopf') await fremdknopf();
      else if(STEP==='sichern') await sichern();
      else if(STEP==='quit'||STEP==='quithang'){ await quitStep(STEP==='quithang'); return; }   // endet in will-quit (eigene Endmarke)
      else if(STEP==='quitslow'){ await quitSlow(); return; }
      else if(STEP==='quitreject'){ await quitReject(); return; }
      else if(STEP==='quitlate'){ await quitLate(); return; }
      else if(STEP==='hold'){ R('läuft',true); await sleep(Number(process.env.AP_HOLD||8000)); }
      else R('unbekannter Schritt '+STEP,false);   // vertippter Schrittname wäre sonst mit der Endmarke grün (C-9)
      if(STEP!=='hold') R('Schritt vollständig',true);   // verify-desktop verlangt die Endmarke (Querfund Notes v1.7 A-4)
    }catch(e){ R('Ausnahme im Prüfprogramm',false,String(e&&e.stack||e)); }
    app.exit(0);
  });
});
