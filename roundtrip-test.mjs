// Roundtrip-/Format-Test (Node, kein Browser). Evaluiert die Sentinel-Region aus app.js
// (=== VAULT-FORMAT BEGIN/END ===) DIREKT — keine Nachbildung, damit Lese- und Schreibpfad
// garantiert derselbe Code sind. Prüft Schlüsselhierarchie, AAD, Grenzen, Merge, Sanitizer, TOTP.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.hashwasm = require('./vendor/hash-wasm/argon2.umd.min.js');
const words = readFileSync('vendor/eff/eff_large_wordlist.txt','utf8').trim().split('\n').map(l=>l.split('\t')[1].trim());
globalThis.EFF_WORDS = words;

const src = readFileSync('app.js','utf8');
const a = src.indexOf('/* === VAULT-FORMAT BEGIN ==='), z = src.indexOf('/* === VAULT-FORMAT END === */');
if(a<0||z<0) throw new Error('Sentinel nicht gefunden');
const region = src.slice(a, z);
const V = new Function(region + `
  return {bufToB64,b64ToBuf,base32Encode,base32Decode,rand,randInt,cryptoId,passBytes,aad,deriveKek,newDek,wrapDek,unwrapDek,
    encryptBody,decryptBody,serializeFile,parseFile,kdfOk,KDF_DEFAULT,KDF_BOUNDS,MAX_ENTRIES,emptyVault,sanitizeEntry,sanitizeEntries,sanitizeVault,
    normalizeTotp,otpauthUri,mergeEntries,winner,canon,purgeTombstones,tombstone,totpCode,totpRemaining,genChars,genWords,passStrength,
    parseCsv,csvMap,csvRowToEntry};`)();

let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('  ✓',m);} else {fail++;console.log('  ✗ FEHLER:',m);} };
const throwsWith=async(fn,code,m)=>{ try{ await fn(); ok(false,m+' (kein Fehler)'); }catch(e){ ok(e&&e.message===code,m+' → '+(e&&e.message)); } };
const KDF_TEST={m:8192,t:1,p:1};   // klein für schnelle Tests; Format identisch

async function createVault(pass, vault, kdfP){
  const kdf=Object.assign({}, kdfP||KDF_TEST, {salt:V.rand(16)});
  const kek=await V.deriveKek(V.passBytes(pass), kdf);
  const dekX=await V.newDek(); const wrap=await V.wrapDek(dekX,kek,kdf); const dek=await V.unwrapDek(wrap,kek,kdf,false);
  const body=await V.encryptBody(vault,dek,kdf);
  return {raw:V.serializeFile(kdf,wrap,body), kdf, wrap, dek};
}
async function open(raw, pass){
  const f=V.parseFile(raw); const kek=await V.deriveKek(V.passBytes(pass), f.kdf);
  const dek=await V.unwrapDek(f.wrap,kek,f.kdf,false); const obj=await V.decryptBody(f.body,dek,f.kdf); return {f,dek,vault:V.sanitizeVault(obj)};
}
const E=(o)=>Object.assign({id:V.cryptoId(),title:'T',user:'u',pass:'p',url:'',notes:'',totp:null,fav:false,created:'2026-01-01T00:00:00.000Z',updated:'2026-01-02T00:00:00.000Z',deleted:null},o);

console.log('\n[1] Format-Roundtrip + Schlüsselhierarchie');
{
  const vault=V.emptyVault(); vault.entries.push(V.sanitizeEntry(E({title:'Proton',pass:'GeheimMarker77!'})));
  const c=await createVault('passphrase-eins-zwei', vault);
  const o=await open(c.raw,'passphrase-eins-zwei');
  ok(o.vault.entries.length===1&&o.vault.entries[0].pass==='GeheimMarker77!','Setup → Serialize → Parse → Unlock liefert Eintrag');
  ok(!c.raw.includes('GeheimMarker')&&!c.raw.includes('Proton'),'Klartext nicht in der Datei');
  let threw=false; try{ await open(c.raw,'falsche-passphrase-xx'); }catch(_){ threw=true; } ok(threw,'falsche Passphrase wirft');
  // Persist-Symmetrie: mit dem entpackten DEK neu verschlüsseln → wieder lesbar (gleiche kdf/wrap)
  const body2=await V.encryptBody(o.vault,o.dek,o.f.kdf); const raw2=V.serializeFile(o.f.kdf,o.f.wrap,body2);
  const o2=await open(raw2,'passphrase-eins-zwei'); ok(o2.vault.entries[0].pass==='GeheimMarker77!','Neu-Persist mit gelesenen Header-Werten bleibt lesbar (Lese/Schreib-Symmetrie)');
  // Nicht-Default-KDF-Parameter überleben
  const c3=await createVault('passphrase-eins-zwei', vault, {m:16384,t:2,p:2}); const o3=await open(c3.raw,'passphrase-eins-zwei');
  ok(o3.f.kdf.m===16384&&o3.f.kdf.t===2&&o3.f.kdf.p===2,'Nicht-Default m/t/p werden gelesen und zurückgeschrieben');
  // Salt in nicht-kanonischer Base64 (mit Whitespace? → abgelehnt) / gleiche Bytes andere Schreibweise ist bei Standard-Base64 nur via Padding möglich → 16 B = 24 Zeichen mit '==' fest.
  const f=JSON.parse(c.raw); const saltB=Buffer.from(f.kdf.salt,'base64'); ok(saltB.length===16&&Buffer.from(saltB).toString('base64')===f.kdf.salt,'Salt kanonisch (16 B, Standard-Base64)');
}

console.log('\n[2] AAD / Manipulation / Rollentrennung');
{
  const c=await createVault('passphrase-eins-zwei', V.emptyVault());
  const tamper=(fn)=>{ const f=JSON.parse(c.raw); fn(f); return JSON.stringify(f); };
  for(const [name,fn] of [['kdf.t',f=>f.kdf.t=2],['kdf.m',f=>f.kdf.m=16384],['kdf.p',f=>f.kdf.p=2],['salt',f=>{const b=Buffer.from(f.kdf.salt,'base64');b[0]^=1;f.kdf.salt=b.toString('base64');}]]){
    let threw=false; try{ await open(tamper(fn),'passphrase-eins-zwei'); }catch(_){ threw=true; } ok(threw,'manipuliertes '+name+' scheitert an AAD');
  }
  // wrap.ct in body.ct tauschen → muss scheitern (Rollentrennung); body.ct in wrap.ct (Längenprüfung)
  let threw=false; try{ await open(tamper(f=>{ f.body.ct=f.wrap.ct; f.body.iv=f.wrap.iv; }),'passphrase-eins-zwei'); }catch(_){ threw=true; } ok(threw,'wrap-Ciphertext als body abgelehnt (AAD-Rolle)');
  threw=false; try{ await open(tamper(f=>{ const b=Buffer.from(f.body.ct,'base64'); b[3]^=0xff; f.body.ct=b.toString('base64'); }),'passphrase-eins-zwei'); }catch(_){ threw=true; } ok(threw,'gekipptes Ciphertext-Byte scheitert');
  threw=false; try{ await open(tamper(f=>{ f.ver=2; }),'passphrase-eins-zwei'); }catch(e){ threw=e.message==='newer'; } ok(threw,'ver=2 → "newer" (vor KDF)');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.kdf.m=1e9; }))),'kdfbounds','m=1e9 abgelehnt VOR KDF-Arbeit');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.kdf.m=262144; f.kdf.t=16; }))),'kdfbounds','Budget m·t überschritten abgelehnt');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.kdf.t=0; }))),'kdfbounds','t=0 abgelehnt');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.magic='AISV1'; }))),'format','falsches magic abgelehnt');
  await throwsWith(()=>Promise.resolve(V.parseFile('x'.repeat(21*1024*1024))),'toolarge','Übergröße vor JSON.parse abgelehnt');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.wrap.ct=f.wrap.ct.slice(0,10); }))),'format','wrap.ct falsche Länge abgelehnt');
  await throwsWith(()=>Promise.resolve(V.parseFile(tamper(f=>{ f.kdf.salt='!!!'; }))),'format','Salt kein Base64 abgelehnt');
  // IV-Eindeutigkeit
  const ivs=new Set(); for(let i=0;i<10000;i++) ivs.add(Buffer.from(V.rand(12)).toString('hex')); ok(ivs.size===10000,'10.000 IVs eindeutig');
}

console.log('\n[3] Passphrase-Wechsel mit DEK-Rotation');
{
  const vault=V.emptyVault(); vault.entries.push(V.sanitizeEntry(E({title:'A'})));
  const c=await createVault('alte-passphrase-123', vault);
  const o=await open(c.raw,'alte-passphrase-123');
  // Wechsel wie in App.changePass: alte prüfen (unwrap), neuer Salt, neuer KEK, neuer DEK, Body neu
  const kdf={m:o.f.kdf.m,t:o.f.kdf.t,p:o.f.kdf.p,salt:V.rand(16)}; const kNew=await V.deriveKek(V.passBytes('neue-passphrase-456'),kdf);
  const dekX=await V.newDek(); const wrap=await V.wrapDek(dekX,kNew,kdf); const dek=await V.unwrapDek(wrap,kNew,kdf,false);
  const raw2=V.serializeFile(kdf,wrap,await V.encryptBody(o.vault,dek,kdf));
  const o2=await open(raw2,'neue-passphrase-456'); ok(o2.vault.entries[0].title==='A','neue Passphrase öffnet');
  let threw=false; try{ await open(raw2,'alte-passphrase-123'); }catch(_){ threw=true; } ok(threw,'alte Passphrase öffnet NICHT mehr');
  ok(JSON.parse(raw2).wrap.ct!==JSON.parse(c.raw).wrap.ct&&JSON.parse(raw2).kdf.salt!==JSON.parse(c.raw).kdf.salt,'wrap + salt erneuert');
  // alter DEK entschlüsselt neuen Body nicht (Rotation)
  threw=false; try{ await V.decryptBody(V.parseFile(raw2).body,o.dek,kdf); }catch(_){ threw=true; } ok(threw,'alter DEK passt nicht mehr (Rotation)');
}

console.log('\n[4] Sanitizer');
{
  const now=Date.parse('2026-09-11T12:00:00.000Z');
  ok(V.sanitizeEntry({id:'fx01'},now)===null,'ungültige ID (kurz) → verworfen');
  ok(V.sanitizeEntry({id:'GHIJKLMNGHIJKLMN'},now)===null,'ungültige ID (kein hex) → verworfen');
  ok(V.sanitizeEntry({id:'0123456789ABCDEF'},now).id==='0123456789abcdef','ID wird lowercased');
  const x=V.sanitizeEntry({id:'0123456789abcdef',title:'<img src=x onerror=alert(1)>',user:{},pass:123,url:'javascript:alert(1)',notes:'a'.repeat(20000),fav:'yes',created:'kaputt',updated:'2030-01-01T00:00:00.000Z',__proto__:{x:1},constructor:'y'},now);
  ok(x.title==='<img src=x onerror=alert(1)>'&&x.user===''&&x.pass===''&&x.url==='javascript:alert(1)','Typen erzwungen (Strings bleiben Strings, Rest leer) — Escaping macht der Renderer');
  ok(x.notes.length===10000,'notes auf 10.000 gekürzt');
  ok(x.fav===false,'fav nur echtes true');
  ok(Date.parse(x.updated)<=now+120000,'Zukunfts-updated auf now+2min geklemmt: '+x.updated);
  ok(x.created===x.updated,'created ungültig → = updated');
  ok(!Object.prototype.hasOwnProperty.call(x,'constructor')&&Object.keys(x).length===11,'nur Whitelist-Felder');
  const y=V.sanitizeEntry({id:'0123456789abcdef',title:'x',updated:'nope'},now); ok(y.updated==='1970-01-01T00:00:00.000Z','ungültiges updated → Epoche (gewinnt nie)');
  const t=V.sanitizeEntry({id:'0123456789abcdef',title:'geheim',pass:'geheim',deleted:'2026-02-01T00:00:00.000Z',updated:'2026-02-01T00:00:00.000Z'},now);
  ok(t.deleted&&t.title===''&&t.pass===''&&t.totp===null,'Tombstone inhaltsleer');
  const t2=V.sanitizeEntry({id:'0123456789abcdef',title:'x',deleted:true,updated:'2026-02-01T00:00:00.000Z'},now); ok(t2.deleted==='2026-02-01T00:00:00.000Z','deleted=true ohne Datum → updated');
  // TOTP
  ok(V.normalizeTotp('JBSWY3DPEHPK3PXP').secret==='JBSWY3DPEHPK3PXP','Base32 normalisiert');
  ok(V.normalizeTotp('jbsw y3dp ehpk 3pxp').secret==='JBSWY3DPEHPK3PXP','Base32 mit Leerzeichen/klein');
  const u=V.normalizeTotp('otpauth://totp/Proton:alien%40proton.me?secret=JBSWY3DPEHPK3PXP&issuer=Proton&algorithm=SHA256&digits=8&period=60');
  ok(u&&u.algorithm==='SHA256'&&u.digits===8&&u.period===60&&u.issuer==='Proton'&&u.label==='Proton:alien@proton.me','otpauth-URI geparst');
  ok(V.normalizeTotp('otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&digits=9')===null,'digits=9 abgelehnt');
  ok(V.normalizeTotp('otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&period=0')===null,'period=0 abgelehnt');
  ok(V.normalizeTotp('otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP')===null,'hotp abgelehnt');
  ok(V.normalizeTotp('nicht-base32-!!')===null,'kaputt → null');
  ok(V.normalizeTotp({secret:'JBSWY3DPEHPK3PXP',algorithm:'sha-512',digits:'7',period:'45'}).algorithm==='SHA512','Objektform + Normalisierung');
  ok(V.normalizeTotp(V.otpauthUri(u)).period===60,'otpauthUri round-trip');
  // sanitizeVault
  const sv=V.sanitizeVault({version:9,entries:[E({id:'0123456789abcdef'}),E({id:'0123456789abcdef',updated:'2026-05-05T00:00:00.000Z'}),{id:'bad'}],settings:{autolock:99,bgLock:30,clipClear:'60'},meta:{lastBackup:'x'}},now);
  ok(sv.entries.length===1&&sv.entries[0].updated==='2026-05-05T00:00:00.000Z','Dubletten im Vault dedupliziert (neuere gewinnt), ungültige verworfen');
  ok(sv.settings.autolock===2&&sv.settings.bgLock===30&&sv.settings.clipClear===60,'Settings validiert (99→Default, "60"→60)');
  ok(sv.meta.lastBackup===null&&sv.version===1,'meta/version bereinigt');
  let threw=false; try{ V.sanitizeEntries(Array.from({length:10001},()=>E({})),now); }catch(e){ threw=e.message==='toomany'; } ok(threw,'>10.000 Einträge → toomany');
}

console.log('\n[5] Merge (LWW, Tombstones, Kommutativität, Idempotenz)');
{
  const id1='1111111111111111', id2='2222222222222222', id3='3333333333333333', id4='4444444444444444';
  const A=[E({id:id1,title:'lokal-alt',updated:'2026-01-01T00:00:00.000Z'}), E({id:id2,title:'lokal-neu',updated:'2026-03-01T00:00:00.000Z'}), E({id:id3,title:'nur-lokal'})];
  const B=[E({id:id1,title:'fremd-neu',updated:'2026-02-01T00:00:00.000Z'}), E({id:id2,title:'fremd-alt',updated:'2026-02-01T00:00:00.000Z'}), E({id:id4,title:'nur-fremd'})];
  const m=V.mergeEntries(A,B); const by=id=>m.entries.find(e=>e.id===id);
  ok(by(id1).title==='fremd-neu','neuere fremde Änderung gewinnt');
  ok(by(id2).title==='lokal-neu','neuere lokale Änderung bleibt');
  ok(by(id3)&&by(id4)&&m.entries.length===4,'nur-lokal + nur-fremd beide da');
  ok(m.added===1&&m.updated===1&&m.deleted===0,'Zähler: 1 neu, 1 aktualisiert, 0 gelöscht');
  const mBA=V.mergeEntries(B,A); ok(JSON.stringify(m.entries.map(V.canon).sort())===JSON.stringify(mBA.entries.map(V.canon).sort()),'A⊕B == B⊕A');
  const m2=V.mergeEntries(m.entries,B); ok(m2.added===0&&m2.updated===0&&m2.deleted===0&&m2.entries.length===4,'Re-Import idempotent');
  // Tombstone gewinnt gegen ältere Änderung, verliert gegen neuere
  const tsN=V.tombstone(A[0],'2026-04-01T00:00:00.000Z'); const m3=V.mergeEntries([E({id:id1,title:'edit',updated:'2026-03-15T00:00:00.000Z'})],[tsN]);
  ok(m3.entries[0].deleted&&m3.deleted===1,'neuerer Tombstone schlägt ältere Änderung');
  const m4=V.mergeEntries([E({id:id1,title:'edit',updated:'2026-05-01T00:00:00.000Z'})],[tsN]); ok(!m4.entries[0].deleted&&m4.entries[0].title==='edit','neuere Änderung schlägt älteren Tombstone');
  // Gleichstand: deterministisch
  const p1=E({id:id1,title:'aaa',updated:'2026-06-01T00:00:00.000Z'}), p2=E({id:id1,title:'bbb',updated:'2026-06-01T00:00:00.000Z'});
  ok(V.mergeEntries([p1],[p2]).entries[0].title===V.mergeEntries([p2],[p1]).entries[0].title,'Gleichstand: beide Seiten gleiches Ergebnis');
  const tsE=V.tombstone(p1,'2026-06-01T00:00:00.000Z'); ok(V.mergeEntries([p2],[tsE]).entries[0].deleted&&V.mergeEntries([tsE],[p2]).entries[0].deleted,'Gleichstand: Tombstone gewinnt beidseitig');
  // ungültiges updated (Epoche) gewinnt nie
  const m5=V.mergeEntries([E({id:id1,title:'gut',updated:'2026-01-01T00:00:00.000Z'})],[V.sanitizeEntry(E({id:id1,title:'böse',updated:'kaputt'}))]); ok(m5.entries[0].title==='gut','Eintrag ohne gültiges updated gewinnt nie');
  // Dubletten in Importdatei
  const m6=V.mergeEntries([],[E({id:id1,title:'v1',updated:'2026-01-01T00:00:00.000Z'}),E({id:id1,title:'v2',updated:'2026-02-01T00:00:00.000Z'})]); ok(m6.entries.length===1&&m6.entries[0].title==='v2'&&m6.added===1,'Dubletten innerhalb der Importdatei dedupliziert');
  // Purge
  const old=V.tombstone(A[0],'2024-01-01T00:00:00.000Z'), fresh=V.tombstone(A[1],new Date().toISOString());
  const pg=V.purgeTombstones([old,fresh,A[2]]); ok(pg.length===2&&!pg.find(e=>e.id===id1),'Tombstone >365 Tage gepurgt, frischer bleibt');
}

console.log('\n[6] TOTP RFC-6238-Testvektoren');
{
  const seed=(n)=>{ let s=''; while(s.length<n) s+='12345678901234567890'; return s.slice(0,n); };
  const vec=[[59,'94287082','SHA1',20],[1111111109,'07081804','SHA1',20],[1234567890,'89005924','SHA1',20],[2000000000,'69279037','SHA1',20],[20000000000,'65353130','SHA1',20],
             [59,'46119246','SHA256',32],[1111111109,'68084774','SHA256',32],[20000000000,'77737706','SHA256',32],
             [59,'90693936','SHA512',64],[1111111109,'25091201','SHA512',64],[20000000000,'47863826','SHA512',64]];
  for(const [t,exp,alg,len] of vec){ const totp={secret:V.base32Encode(new TextEncoder().encode(seed(len))),algorithm:alg,digits:8,period:30}; const got=await V.totpCode(totp,t*1000); ok(got===exp,`T=${t} ${alg} → ${got}`); }
  const six=await V.totpCode({secret:V.base32Encode(new TextEncoder().encode(seed(20))),algorithm:'SHA1',digits:6,period:30},59000); ok(six==='287082','6 Stellen = letzte 6 der 8');
  ok(V.totpRemaining({period:30},59000)===1,'Restlaufzeit bei T=59 → 1 s');
}

console.log('\n[7] Generator');
{
  const r=V.genChars(20,{upper:true,lower:true,digits:true,symbols:true,noamb:false}); ok(r.pw.length===20&&r.bits>0,'20 Zeichen, Bits='+r.bits);
  const r2=V.genChars(12,{upper:true,lower:false,digits:false,symbols:false,noamb:true}); ok(/^[A-HJ-NP-Z]{12}$/.test(r2.pw),'nur A–Z ohne I/O: '+r2.pw);
  ok(V.genChars(20,{}).pw===''&&V.genChars(20,{}).bits===0,'kein Zeichensatz → leer');
  const w=V.genWords(6,'-',false,false); ok(w.pw.split('-').length===6&&w.pw.split('-').every(x=>words.includes(x))&&w.bits===78,'6 EFF-Wörter, 78 Bit: '+w.pw);
  const w2=V.genWords(4,' ',true,true); ok(w2.pw.split(' ').length===4&&/[A-Z]/.test(w2.pw)&&/\d/.test(w2.pw),'Großschreibung + Ziffer: '+w2.pw);
  // Chi-Quadrat: randInt(10) über 100.000 Ziehungen
  const cnt=new Array(10).fill(0); for(let i=0;i<100000;i++) cnt[V.randInt(10)]++; const chi=cnt.reduce((s,c)=>s+Math.pow(c-10000,2)/10000,0); ok(chi<27.9,'randInt gleichverteilt (χ²='+chi.toFixed(1)+' < 27.9 bei 9 df, p=0.001)');
  ok(V.passStrength('kurz')===0&&V.passStrength('zwoelf-zeichen')>=1&&V.passStrength('korrekt-pferd-batterie-heftklammer')===3,'Passphrase-Meter Stufen');
}

console.log('\n[8] CSV-Parser + Import-Mapping');
{
  const proton='﻿type,name,url,email,username,password,note,totp,createTime,modifyTime,vault\r\nlogin,Proton Mail,https://mail.proton.me,alien@proton.me,,Pa"ss,"Zeile 1\nZeile 2, mit Komma",otpauth://totp/Proton%20Mail:alien%40proton.me?issuer=Proton&secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30,1717171717,1727272727,Personal\r\nnote,Notiz,,,,,"=HYPERLINK(""x"")",,1717171717,1717171717,Personal\r\ncreditCard,Karte,,,,1234,,,,,Personal\r\n';
  const rows=V.parseCsv(proton,','); ok(rows.length===4&&rows[1].length===11,'Proton: BOM, CRLF, Quotes, eingebetteter Zeilenumbruch geparst');
  const m=V.csvMap(rows[0]); ok(m.fmt==='proton','Proton erkannt');
  const e1=V.csvRowToEntry(m,rows[1],Date.now()); ok(e1.title==='Proton Mail'&&e1.user==='alien@proton.me'&&e1.pass==='Pa"ss'&&e1.notes==='Zeile 1\nZeile 2, mit Komma'&&e1.totp&&e1.totp.issuer==='Proton','Proton-Login gemappt (E-Mail als Nutzer, TOTP-URI)');
  ok(e1.created==='2024-05-31T16:08:37.000Z','createTime (Unix-Sekunden) übernommen');
  const e2=V.csvRowToEntry(m,rows[2],Date.now()); ok(e2&&e2.pass===''&&e2.notes==='=HYPERLINK("x")','Proton-Notiz ohne Passwort');
  ok(V.csvRowToEntry(m,rows[3],Date.now())===null,'creditCard übersprungen');
  const kp='"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"\n"Root/Mail","Posteo","ich@posteo.de","abc","https://posteo.de","n","JBSWY3DPEHPK3PXP","0","2025-03-01T10:00:00Z","2024-01-01T09:00:00Z"\n';
  const kr=V.parseCsv(kp,','); const km=V.csvMap(kr[0]); ok(km.fmt==='keepassxc','KeePassXC erkannt');
  const ke=V.csvRowToEntry(km,kr[1],Date.now()); ok(ke.title==='Posteo'&&ke.notes==='n\nGruppe: Root/Mail'&&ke.totp.secret==='JBSWY3DPEHPK3PXP'&&ke.updated==='2025-03-01T10:00:00.000Z','KeePassXC gemappt (Gruppe in Notizen, Datum)');
  const bw='folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n,1,login,GitHub,,,0,https://github.com,alien,ghp-secret,JBSWY3DPEHPK3PXP\n,,note,Nur Notiz,text,,0,,,,\n,,card,Karte,,,0,,,,\n';
  const br=V.parseCsv(bw,','); const bm=V.csvMap(br[0]); ok(bm.fmt==='bitwarden','Bitwarden erkannt');
  const be=V.csvRowToEntry(bm,br[1],Date.now()); ok(be.title==='GitHub'&&be.fav===true&&be.user==='alien'&&be.pass==='ghp-secret'&&be.url==='https://github.com','Bitwarden gemappt inkl. Favorit');
  ok(V.csvRowToEntry(bm,br[2],Date.now()).pass===''&&V.csvRowToEntry(bm,br[3],Date.now())===null,'Bitwarden: note ok, card übersprungen');
  const gen='Website;Login;Passwort\nfoo.de;ich;pw\n'; let gr=V.parseCsv(gen,','); if(gr[0].length<2) gr=V.parseCsv(gen,';'); const gm=V.csvMap(gr[0]); ok(gm&&gm.fmt==='generic'&&V.csvRowToEntry(gm,gr[1],Date.now()).title==='foo.de','generisches Semikolon-CSV (Website/Login/Passwort)');
  ok(V.csvMap(['a','b'])===null,'unbekannte Kopfzeile → null');
}

console.log(`\n${pass} ok, ${fail} Fehler`); process.exit(fail?1:0);
