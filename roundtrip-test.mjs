// Roundtrip-/Format-Test (Node, kein Browser). Evaluiert die Sentinel-Region aus app.js
// (=== VAULT-FORMAT BEGIN/END ===) DIREKT — keine Nachbildung, damit Lese- und Schreibpfad
// garantiert derselbe Code sind. Prüft Schlüsselhierarchie, AAD, Grenzen, Merge, Sanitizer, TOTP.
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.hashwasm = require('./vendor/hash-wasm/argon2.umd.min.js');
const words = readFileSync('vendor/eff/eff_large_wordlist.txt','utf8').trim().split('\n').map(l=>l.split('\t')[1].trim());
globalThis.EFF_WORDS = words;

const src = readFileSync('app.js','utf8');
// Versionsanzeige (Einstellungen) muss zur Datei VERSION passen — v1.3/v1.4 zeigten noch „1.2“
{ const vn=(readFileSync('VERSION','utf8').match(/^VERSION_NAME=(.+)$/m)||[])[1]?.trim();
  const av=(src.match(/^const APP_VERSION = '([^']*)';/m)||[])[1];
  if(!vn||av!==vn) throw new Error(`APP_VERSION (${av}) != VERSION_NAME (${vn})`);
  console.log('  ✓ APP_VERSION', av, '= VERSION_NAME'); }
const a = src.indexOf('/* === VAULT-FORMAT BEGIN ==='), z = src.indexOf('/* === VAULT-FORMAT END === */');
if(a<0||z<0) throw new Error('Sentinel nicht gefunden');
const region = src.slice(a, z);
const V = new Function(region + `
  return {bufToB64,b64ToBuf,base32Encode,base32Decode,rand,randInt,cryptoId,passBytes,aad,deriveKek,newDek,wrapDek,unwrapDek,
    encryptBody,decryptBody,serializeFile,parseFile,kdfOk,KDF_DEFAULT,KDF_BOUNDS,MAX_ENTRIES,emptyVault,sanitizeEntry,sanitizeEntries,sanitizeVault,
    normalizeTotp,otpauthUri,sanitizeBank,sanitizeExtra,EXTRA_MAX,CAPS,genCharsBits,mergeEntries,winner,canon,purgeTombstones,tombstone,totpCode,totpRemaining,genChars,genWords,passStrength,passCheck,MAX_TOMBSTONES,liveCount,
    tombFrom,isWiped,wipeTrash,shapeIncoming,bulkEdit,TRASH_DAYS,MAX_TRASH,TOMBSTONE_DAYS,ts,
    parseCsv,csvMap,csvRowToEntry,sanitizeCard,dupKey,entryType,protonItemToEntry,protonExportToEntries,zipEntries,zipRead,pgpDearmor,pgpPackets,pgpS2K,pgpDecryptSymmetric,protonProbe,protonLoad,crc24,concatBytes,aesExpand,aesEncryptBlock,pgpCfbDecrypt,inflate,line,MAX_SKESK,CAPS,bioKey,parseBioBlob,serializeBioBlob,bioWrapOk,wrapTag};`)();

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
  ok(!Object.prototype.hasOwnProperty.call(x,'constructor')&&Object.keys(x).length===18,'nur Whitelist-Felder (18 inkl. type/cat/email/card/bank/extra/nowarn)');
  const y=V.sanitizeEntry({id:'0123456789abcdef',title:'x',updated:'nope'},now); ok(y.updated==='1970-01-01T00:00:00.000Z','ungültiges updated → Epoche (gewinnt nie)');
  const t=V.sanitizeEntry({id:'0123456789abcdef',title:'geheim',pass:'geheim',deleted:'2026-02-01T00:00:00.000Z',updated:'2026-02-01T00:00:00.000Z'},now);
  ok(t.deleted&&t.title==='geheim'&&t.pass==='geheim'&&Object.keys(t).length===18,'Papierkorb (v1.5): Inhalt überlebt das Laden, 18 Felder');
  { const w=V.tombFrom(t); ok(w.title===''&&w.pass===''&&w.totp===null&&w.deleted===t.deleted&&V.isWiped(w),'tombFrom() ist inhaltsleer, behält die Zeitstempel und gilt als gewipt'); }
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
  const r8=V.genChars(8,{upper:true,lower:true,digits:true,symbols:true,noamb:false}); ok(r8.bits===50&&r8.pw.length===8,'8 Zeichen/4 Gruppen: 51 Bit minus ~1 Bit Gruppen-Pflicht = '+r8.bits);
  ok(V.genChars(20,{lower:true}).bits===Math.round(20*Math.log2(26))&&V.genCharsBits(20,[26])===94,'eine Gruppe: keine Verwerfung, volle Bits');
  { const b16=V.genCharsBits(16,[26,26,10,21]), naive=16*Math.log2(83); ok(b16<=Math.round(naive)&&b16>=Math.round(naive)-1&&V.genCharsBits(64,[26,26,10,21])===Math.round(64*Math.log2(83)),'16 Zeichen: Abzug < 1 Bit, 64 Zeichen: Abzug verschwindet — nie über dem naiven Wert'); }
  // Chi-Quadrat: randInt(10) über 100.000 Ziehungen
  const cnt=new Array(10).fill(0); for(let i=0;i<100000;i++) cnt[V.randInt(10)]++; const chi=cnt.reduce((s,c)=>s+Math.pow(c-10000,2)/10000,0); ok(chi<27.9,'randInt gleichverteilt (χ²='+chi.toFixed(1)+' < 27.9 bei 9 df, p=0.001)');
  ok(V.passStrength('kurz')===0&&V.passStrength('zwoelf-zeichen')>=1&&V.passStrength('korrekt-pferd-batterie-heftklammer')===3,'Passphrase-Meter Stufen');
  // v1.6: Mustererkennung — Länge allein reicht nicht mehr
  for(const [pw,why] of [['Sommer2024Sommer','common'],['passwort12345!','common'],['ichliebedich12345','common'],['aaaaaaaaaaaaaaaaaaaaaaaa','repeat'],
      ['qwertz123456','keyboard'],['123456789012','digits'],['P4ssw0rt2024!','common'],['abababababab','variety'],['0987654321abcd','seq']]){
    const c=V.passCheck(pw); ok(c.weak&&c.level===0&&c.why.includes(why),'vorhersagbar: '+pw+' → '+c.why.join(',')); }
  { const c=V.passCheck('Hund-Katze-Maus-2024'); ok(c.level===1&&!c.weak&&c.why.includes('year'),'Wörter-Bonus greift nicht bei billigen Wörtern: Stufe '+c.level); }
  ok(!V.passCheck('kurz123').weak&&V.passCheck('kurz123').level===0,'kurz ohne Muster: nicht „vorhersagbar“ (dafür gibt es „kurz“)');
  ok(V.passCheck('Xk9#mP2$vL7qR4!nT8wZ').level>=2&&!V.passCheck('Xk9#mP2$vL7qR4!nT8wZ').weak,'Zufallspasswort bleibt stark');
  ok(V.passCheck('a'.repeat(1000)).weak&&V.passCheck('Xk9#mP2$vL7qR4!n'.repeat(60)).level===3,'lange Eingaben: Analyse auf 64 Zeichen, Rest zählt voll');
  for(const g of ['t8pBj1+6Tqqq',']An&U_A$1927','8sDfg(N..M@l','MYe-bv7654,U']){ const c=V.passCheck(g); ok(!c.weak&&c.level===1,'12 Zeichen zufällig mit einem einzelnen Muster ('+g+'): nicht vorhersagbar, Stufe 1 statt „zu kurz“ (Review v1.6)'); }
  { let bad=0; for(let i=0;i<3000;i++){ const g=V.genChars(12,{upper:true,lower:true,digits:true,symbols:true,noamb:false}).pw, c=V.passCheck(g); if(c.weak||c.level<1) bad++; }
    ok(bad<=2,'Generator 12 Zeichen, 3000×: praktisch nie vorhersagbar ('+bad+'; gemessen 0,0005 %, vorher ~0,1 % — Review v1.6)'); }
  { let bad=0; for(let i=0;i<300;i++){ const g=V.genChars(16,{upper:true,lower:true,digits:true,symbols:true,noamb:false}).pw, w=V.genWords(6,'-',false,false).pw;
      if(V.passCheck(g).weak||V.passCheck(g).level<1||V.passCheck(w).weak||V.passCheck(w).level!==3) bad++; }
    ok(bad===0,'Generator (16 Zeichen / 6 Wörter, je 300×): nie vorhersagbar, Wörter immer sehr stark (ein zufälliges „444“ darf 16 Zeichen auf „okay“ drücken)'); }
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
  const ke=V.csvRowToEntry(km,kr[1],Date.now()); ok(ke.title==='Posteo'&&ke.notes==='n'&&ke.cat==='Mail'&&ke.totp.secret==='JBSWY3DPEHPK3PXP'&&ke.updated==='2025-03-01T10:00:00.000Z','KeePassXC gemappt (Gruppe → Kategorie, Datum)');
  const bw='folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n,1,login,GitHub,,,0,https://github.com,alien,ghp-secret,JBSWY3DPEHPK3PXP\n,,note,Nur Notiz,text,,0,,,,\n,,card,Karte,,,0,,,,\n';
  const br=V.parseCsv(bw,','); const bm=V.csvMap(br[0]); ok(bm.fmt==='bitwarden','Bitwarden erkannt');
  const be=V.csvRowToEntry(bm,br[1],Date.now()); ok(be.title==='GitHub'&&be.fav===true&&be.user==='alien'&&be.pass==='ghp-secret'&&be.url==='https://github.com','Bitwarden gemappt inkl. Favorit');
  ok(V.csvRowToEntry(bm,br[2],Date.now()).pass===''&&V.csvRowToEntry(bm,br[3],Date.now())===null,'Bitwarden: note ok, card übersprungen');
  const gen='Website;Login;Passwort\nfoo.de;ich;pw\n'; let gr=V.parseCsv(gen,','); if(gr[0].length<2) gr=V.parseCsv(gen,';'); const gm=V.csvMap(gr[0]); ok(gm&&gm.fmt==='generic'&&V.csvRowToEntry(gm,gr[1],Date.now()).title==='foo.de','generisches Semikolon-CSV (Website/Login/Passwort)');
  ok(V.csvMap(['a','b'])===null,'unbekannte Kopfzeile → null');
}

console.log('\n[9] Audit-Fixes: Tombstone-Cap, Live-Cap, canon() verschachtelt');
{
  const now=Date.now(); const T=(i,ageDays)=>({id:(1e15+i).toString(16).padStart(16,'0').slice(-16),title:'',user:'',pass:'',url:'',notes:'',totp:null,fav:false,created:new Date(now-ageDays*86400000).toISOString(),updated:new Date(now-ageDays*86400000).toISOString(),deleted:new Date(now-ageDays*86400000).toISOString()});
  const L=(i)=>E({id:(2e15+i).toString(16).padStart(16,'0').slice(-16),title:'L'+i});
  // 9.990 frische Tombstones + 10 live → sanitizeEntries wirft NICHT mehr, Tombstones auf MAX_TOMBSTONES gekappt (neueste bleiben)
  const flood=[...Array.from({length:9990},(_,i)=>T(i,i%300)), ...Array.from({length:10},(_,i)=>L(i))];
  let d=null, threw=false; try{ d=V.sanitizeEntries(flood,now); }catch(e){ threw=true; }
  ok(!threw&&d&&V.liveCount(d)===10,'Tombstone-Flut: Unlock wirft nicht, 10 Live-Einträge bleiben');
  ok(d.filter(e=>e.deleted).length===V.MAX_TOMBSTONES,'Tombstones auf MAX_TOMBSTONES ('+V.MAX_TOMBSTONES+') gekappt');
  const keptAges=d.filter(e=>e.deleted).map(e=>Math.round((now-Date.parse(e.deleted))/86400000)); ok(Math.max(...keptAges)<=Math.min(...flood.filter(e=>e.deleted).map(e=>Math.round((now-Date.parse(e.deleted))/86400000)).sort((a,b)=>b-a).slice(0,9990-V.MAX_TOMBSTONES)),'älteste Tombstones weichen zuerst');
  // 10.000 live + 500 Tombstones öffnet; 10.001 live wirft
  d=V.sanitizeEntries([...Array.from({length:10000},(_,i)=>L(i)),...Array.from({length:500},(_,i)=>T(i,1))],now); ok(V.liveCount(d)===10000,'10.000 live + 500 Tombstones: ok');
  threw=false; try{ V.sanitizeEntries(Array.from({length:10001},(_,i)=>L(i)),now); }catch(e){ threw=e.message==='toomany'; } ok(threw,'10.001 live → toomany');
  // Merge-Zähler nennt Löschmarken
  const m=V.mergeEntries([L(1)],[T(5,0),T(6,0)]); ok(m.tombstonesIn===2&&m.added===0,'mergeEntries meldet tombstonesIn=2');
  // canon() verschachtelt: nur-TOTP-Unterschied bei gleichem updated ist kommutativ
  const A=E({id:'abababababababab',updated:'2026-06-01T00:00:00.000Z',totp:V.normalizeTotp('JBSWY3DPEHPK3PXP')}), B=E({id:'abababababababab',updated:'2026-06-01T00:00:00.000Z',totp:V.normalizeTotp('GEZDGNBVGY3TQOJQ')});
  ok(V.canon(A)!==V.canon(B),'canon() unterscheidet verschachtelte totp-Objekte');
  ok(V.mergeEntries([A],[B]).entries[0].totp.secret===V.mergeEntries([B],[A]).entries[0].totp.secret,'Merge bei nur-TOTP-Unterschied kommutativ');
  ok(V.canon({b:1,a:{d:[1,{z:1,y:2}],c:null}})==='{"a":{"c":null,"d":[1,{"y":2,"z":1}]},"b":1}','canon() sortiert rekursiv, Arrays in Reihenfolge');
}


console.log('\n[10] v1.1: Eintragstypen, Kategorien, Karten, nowarn');
{
  const n=V.sanitizeEntry(E({type:'note',cat:'  Privat ',user:'u',pass:'p',url:'x',totp:'JBSWY3DPEHPK3PXP',nowarn:true,notes:'Geheimnotiz'}));
  ok(n.type==='note'&&n.cat==='Privat'&&n.user===''&&n.pass===''&&n.url===''&&n.totp===null&&n.nowarn===false&&n.notes==='Geheimnotiz','Notiz: nur Titel/Kategorie/Notizen tragen, Rest geleert');
  const c=V.sanitizeEntry(E({type:'card',card:{holder:' Max ',number:'4111 1111 1111 1111x',expiry:'08/29',cvv:'123',pin:'9876',extra:'nein'},pass:'p'}));
  ok(c.type==='card'&&c.pass===''&&c.card.number==='4111 1111 1111 1111'&&c.card.holder==='Max'&&c.card.cvv==='123'&&!('extra' in c.card),'Karte: Kartenobjekt normalisiert (nur Ziffern/Leerzeichen), Passwort geleert');
  ok(V.sanitizeEntry(E({type:'card',card:{}})).card===null&&V.sanitizeEntry(E({type:'card',card:'x'})).card===null,'leere/kaputte Karte → null');
  const l=V.sanitizeEntry(E({type:'bogus',cat:'a'.repeat(100),nowarn:'yes',card:{number:'1'}}));
  ok(l.type==='login'&&l.cat.length===40&&l.nowarn===false&&l.card===null,'unbekannter Typ → login; cat gekappt; nowarn nur boolean true; card nur bei Typ card');
  ok(V.sanitizeEntry(E({nowarn:true})).nowarn===true,'nowarn=true bleibt bei login');
  const t=V.sanitizeEntry(E({type:'card',deleted:'2026-01-03T00:00:00.000Z'}));
  ok(t.type==='card'&&t.title==='T'&&Object.keys(t).length===18&&!V.isWiped(t),'gelöschter Karteneintrag behält Typ und Inhalt (Papierkorb), 18 Felder');
  { const tb=V.tombstone(t,'2026-01-05T00:00:00.000Z'); ok(tb.type==='login'&&tb.cat===''&&tb.card===null&&Array.isArray(tb.extra)&&tb.extra.length===0&&Object.keys(tb).length===18&&V.isWiped(tb),'tombstone() normalisiert auf die leere Gestalt mit identischer Feldmenge'); }
  { const ex=E({title:'x'}); ok(V.canon(V.tombstone(ex,'2026-01-05T00:00:00.000Z'))===V.canon(V.sanitizeEntry(V.tombstone(ex,'2026-01-05T00:00:00.000Z'))),'tombstone() ist sanitizer-stabil (Merge-Gleichstand deterministisch)'); }
  const a=V.sanitizeEntry(E({type:'card',card:{number:'1'},updated:'2026-01-02T00:00:00.000Z'})), b=Object.assign({},a,{card:{number:'2',holder:'',expiry:'',cvv:'',pin:''}});
  ok(V.winner(a,b)===V.winner(b,a),'winner() deterministisch bei Karten-Gleichstand (canon rekursiv)');
  ok(V.dupKey(n)!==V.dupKey(Object.assign({},n,{notes:'andere'}))&&V.dupKey(a)!==V.dupKey(b),'dupKey unterscheidet Notiztext bzw. Kartennummer');
  const v=V.sanitizeVault({entries:[],totp:'JBSWY3DPEHPK3PXP'}); ok(v.totp&&v.totp.secret==='JBSWY3DPEHPK3PXP'&&V.sanitizeVault({entries:[],totp:'kaputt!'}).totp===null&&V.emptyVault().totp===null,'Vault-TOTP (Aegis-Hürde) normalisiert, kaputt → null');
  // Altbestand v1.0 (ohne type/cat) bleibt unverändert lesbar
  const old=V.sanitizeEntry({id:V.cryptoId(),title:'Alt',user:'u',pass:'p',url:'',notes:'',totp:null,fav:false,created:'2026-01-01T00:00:00.000Z',updated:'2026-01-01T00:00:00.000Z',deleted:null});
  ok(old.type==='login'&&old.cat===''&&old.pass==='p','v1.0-Eintrag ohne type/cat → login, Daten erhalten');
}

console.log('\n[11] v1.1: CSV → Kategorie / Notiz-Typ');
{
  const pr=V.parseCsv('type,name,url,email,username,password,note,totp,vault\nlogin,Shop,https://s.de,a@b.de,,pw,,,"Privat"\nnote,Memo,,,,,Text hier,,Arbeit\ncreditCard,Visa,,,,,,,Privat\n',',');
  const pm=V.csvMap(pr[0]); const e1=V.csvRowToEntry(pm,pr[1],Date.now()), e2=V.csvRowToEntry(pm,pr[2],Date.now()), e3=V.csvRowToEntry(pm,pr[3],Date.now());
  ok(e1.cat==='Privat'&&e1.type==='login'&&e1.user==='a@b.de','Proton-CSV: vault → Kategorie');
  ok(e2.type==='note'&&e2.cat==='Arbeit'&&e2.notes==='Text hier'&&e2.pass==='','Proton-CSV: note → Notiz-Typ');
  ok(e3===null,'Proton-CSV: creditCard weiterhin übersprungen (nur im JSON-Export enthalten)');
  const br=V.parseCsv('folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\nBank,1,login,Konto,,,0,https://b.de,ich,pw,\n,0,note,Merker,Notiztext,,0,,,,\n',',');
  const bm=V.csvMap(br[0]); const b1=V.csvRowToEntry(bm,br[1],Date.now()), b2=V.csvRowToEntry(bm,br[2],Date.now());
  ok(b1.cat==='Bank'&&b1.fav===true&&b2.type==='note'&&b2.cat===''&&b2.notes==='Notiztext','Bitwarden-CSV: folder → Kategorie, note → Notiz');
  const kr=V.parseCsv('"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"\n"Root","A","u","p","","","","0","",""\n"Root/Bank/Sub","B","u","p","","","","0","",""\n',',');
  const km=V.csvMap(kr[0]); ok(V.csvRowToEntry(km,kr[1],Date.now()).cat===''&&V.csvRowToEntry(km,kr[2],Date.now()).cat==='Sub','KeePassXC: Root → keine Kategorie, Pfad → letztes Segment');
}

const FIX=new URL('./test-fixtures/proton/', import.meta.url).pathname;
const fixture=(n)=>{ try{ return new Uint8Array(readFileSync(FIX+n)); }catch(_){ return null; } };
console.log('\n[12] v1.1: Proton-JSON-Export → Einträge');
{
  const obj=JSON.parse(readFileSync(FIX+'data.json','utf8')); const r=V.protonExportToEntries(obj, Date.now());
  ok(r.vaults===2&&r.entries.length===7&&r.skipped===1,'2 Tresore, 7 Einträge, 1 übersprungen (Papierkorb): '+r.entries.length+'/'+r.skipped);
  const by=t=>r.entries.find(e=>e.title===t);
  const pm=by('Proton Mail'); ok(pm&&pm.type==='login'&&pm.cat==='Privat'&&pm.user==='alien'&&pm.pass==='MarkerPass1!'&&pm.url==='https://mail.proton.me'&&pm.fav===true,'Login: Felder, Tresor → Kategorie, pinned → Favorit');
  ok(pm.totp&&pm.totp.secret==='JBSWY3DPEHPK3PXP'&&pm.totp.issuer==='Proton','Login: totpUri → TOTP-Objekt');
  ok(pm.notes.includes('Hauptkonto')&&pm.email==='alien@proton.me'&&!pm.notes.includes('E-Mail:')&&pm.notes.includes('URL: https://account.proton.me')&&!pm.notes.includes('4711')&&pm.extra.length===1&&pm.extra[0].name==='PIN'&&pm.extra[0].value==='4711'&&pm.notes.includes('Backup-Code: abc-def'),'Login: Notiz, Zweit-E-Mail im E-Mail-Feld (nicht in Notizen), weitere URLs, Hidden-Feld → Zusatzfeld (nicht in Notizen), Text-Feld → Notizzeile und Extra-Felder in Notizen');
  ok(pm.created==='2023-11-14T22:13:20.000Z'&&pm.updated==='2025-06-15T15:06:40.000Z','Zeitstempel (Unix-Sekunden) übernommen');
  const kv=by('Karte Visa'); ok(kv&&kv.type==='card'&&kv.card.number==='4111111111111111'&&kv.card.holder==='Max Muster'&&kv.card.expiry==='2029-08'&&kv.card.cvv==='123'&&kv.card.pin==='9876'&&kv.pass==='','creditCard → Karte');
  const no=by('WLAN Zuhause'); ok(no&&no.type==='note'&&no.notes==='Router im Flur','note → Notiz');
  const al=by('Alias Shop'); ok(al&&al.type==='login'&&al.user==='shop.x@passmail.net'&&al.pass==='','alias → Login mit Alias-Adresse ohne Passwort');
  const ssh=by('Git Server'); ok(ssh&&ssh.type==='note'&&ssh.cat==='Arbeit'&&ssh.notes.includes('Private key:\n-----BEGIN OPENSSH'),'sshKey → Notiz mit Schlüsseln');
  const wl=by('Büro WLAN'); ok(wl&&wl.type==='login'&&wl.user==='Firma'&&wl.pass==='wifi-secret','wifi → Login (SSID/Passwort)');
  const id=by('Ausweis'); ok(id&&id.type==='note'&&id.notes.includes('passportNumber: C01X00T47')&&!id.notes.includes('gender'),'identity → Notiz nur mit gefüllten Feldern');
  ok(!by('Papierkorb'),'Papierkorb-Eintrag (state 2) nicht importiert');
  await throwsWith(()=>V.protonExportToEntries({foo:1}),'format','kein Proton-Export');
  await throwsWith(()=>V.protonExportToEntries({vaults:{}}),'format','leere vaults');
  const big={vaults:{a:{name:'x',items:new Array(V.MAX_ENTRIES+1).fill({})}}}; await throwsWith(()=>V.protonExportToEntries(big),'toomany','Cap vor der Verarbeitung');
  ok(V.protonItemToEntry({state:1,data:{type:'login',metadata:{name:'<img src=x onerror=1>'},content:{password:{a:1},urls:'nein',itemEmail:5}}},'V',Date.now()).pass===''&&V.protonItemToEntry({state:1,data:{type:'login',metadata:{name:'x'},content:{}}},'V',Date.now()).url==='','Nicht-Strings werden verworfen');
}

console.log('\n[13] v1.1: ZIP-Leser');
{
  for(const [n,label] of [['data.zip','stored'],['data-deflate.zip','deflate']]){ const z=fixture(n); if(!z){ ok(false,'Fixture '+n+' fehlt'); continue; }
    const ents=V.zipEntries(z); const e=ents.find(x=>x.name.endsWith('data.json')); const data=await V.zipRead(z,e);
    ok(e&&JSON.parse(new TextDecoder().decode(data)).version==='1.32.0','ZIP ('+label+'): Proton Pass/data.json gelesen, '+data.length+' B'); }
  const pz=fixture('data-pgp.zip'); const pr=await V.protonProbe(pz); ok(pr.kind==='pgp'&&pr.payload[0]===0x2d,'protonProbe: ZIP mit data.pgp → pgp (armiert)');
  const jr=await V.protonProbe(fixture('data.zip')); ok(jr.kind==='json','protonProbe: ZIP mit data.json → json');
  ok((await V.protonProbe(new TextEncoder().encode('﻿{"vaults":{}}'))).kind==='json','protonProbe: BOM-JSON → json');
  await throwsWith(()=>V.protonProbe(new Uint8Array([0x50,0x4b,3,4,0,0,0,0])),'zip','kaputtes ZIP');
  await throwsWith(async()=>{ const z=new Uint8Array(fixture('data.zip')); const s=new TextDecoder('latin1').decode(z).replaceAll('data.json','other.txt'); return V.protonProbe(new Uint8Array(Array.from(s,c=>c.charCodeAt(0)))); },'format','ZIP ohne data.json/data.pgp');
}

console.log('\n[14] v1.1: OpenPGP symmetrisch (gpg-Fixtures: alte Köpfe, Partial-Längen, ZIP-Kompression)');
{
  for(const [n,label] of [['data.pgp','komprimiert, partial'],['data-nocomp.pgp','unkomprimiert, definite']]){
    const f=fixture(n); if(!f){ ok(false,'Fixture '+n+' fehlt'); continue; }
    const t0=Date.now(); const out=await V.pgpDecryptSymmetric(f,'test-passphrase-alien'); const obj=JSON.parse(new TextDecoder().decode(out));
    ok(obj.version==='1.32.0'&&obj.vaults.share1.items.length===5,'entschlüsselt ('+label+') in '+(Date.now()-t0)+' ms');
    await throwsWith(()=>V.pgpDecryptSymmetric(f,'falsche-passphrase'),'pgpPass','falsche Passphrase ('+label+')');
  }
  const f=fixture('data-nocomp.pgp'); const bin=V.pgpDearmor(new TextDecoder().decode(f));
  ok((await V.pgpDecryptSymmetric(bin,'test-passphrase-alien')).length>0,'binär (dearmored) ebenfalls lesbar');
  const bad=new Uint8Array(bin); bad[bad.length-5]^=1; await throwsWith(()=>V.pgpDecryptSymmetric(bad,'test-passphrase-alien'),'pgpMdc','MDC erkennt manipulierte Daten (seit run-3 als Manipulation gemeldet)');
  const badCrc=new TextDecoder().decode(f).replace(/\n=([A-Za-z0-9+/]{4})/,(m,g)=>'\n='+(g[0]==='A'?'B':'A')+g.slice(1)); await throwsWith(()=>V.pgpDecryptSymmetric(new TextEncoder().encode(badCrc),'x'),'pgp','Armor-CRC24 geprüft');
  const pk=V.pgpPackets(bin); ok(pk.length===2&&pk[0].tag===3&&pk[1].tag===18,'Pakete: SKESK + SEIPD');
  // Proton-Variante nachgebaut: neue Köpfe + verschlüsselter Sitzungsschlüssel (ESK) im SKESK
  {
    const pass='proton-style-pass'; const salt=V.rand(8); const spec={type:3,hash:8,salt,count:65011712};
    const kek=await V.pgpS2K(V.passBytes(pass),spec,32); const sk=V.rand(32);
    const kk=await crypto.subtle.importKey('raw',kek,{name:'AES-CTR'},false,['encrypt']);
    const cfbEnc=async(key,pt)=>{ const out=new Uint8Array(pt.length); let prev=new Uint8Array(16); for(let i=0;i<pt.length;i+=16){ const ks=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CTR',counter:prev,length:128},key,new Uint8Array(16))); const blk=pt.subarray(i,i+16); const c=new Uint8Array(16); for(let j=0;j<blk.length;j++){ c[j]=blk[j]^ks[j]; out[i+j]=c[j]; } prev=blk.length===16?c:prev; } return out; };
    const esk=await cfbEnc(kk, V.concatBytes([new Uint8Array([9]),sk]));
    const skesk=V.concatBytes([new Uint8Array([4,9,3,8]),salt,new Uint8Array([255]),esk]);
    const lit=new TextEncoder().encode('{"vaults":{"v":{"name":"N","items":[]}}}'); const litPkt=V.concatBytes([new Uint8Array([0xcb,6+lit.length,0x62,0,0,0,0,0]),lit]);
    const prefix=V.rand(16); const body=V.concatBytes([prefix,prefix.subarray(14,16),litPkt,new Uint8Array([0xd3,0x14])]);
    const mdc=new Uint8Array(await crypto.subtle.digest('SHA-1',body)); const plain=V.concatBytes([body,mdc]);
    const sess=await crypto.subtle.importKey('raw',sk,{name:'AES-CTR'},false,['encrypt']); const ct=await cfbEnc(sess,plain);
    const enc2=(tag,b)=>{ const len=b.length; const l=len<192?[len]:len<8384?[((len-192)>>8)+192,(len-192)&255]:[255,len>>>24,(len>>16)&255,(len>>8)&255,len&255]; return V.concatBytes([new Uint8Array([0xc0|tag,...l]),b]); };
    const msg=V.concatBytes([enc2(3,skesk),enc2(18,V.concatBytes([new Uint8Array([1]),ct]))]);
    const out=await V.pgpDecryptSymmetric(msg,pass); ok(JSON.parse(new TextDecoder().decode(out)).vaults.v.name==='N','Proton-Variante (v4-SKESK mit ESK, SEIPD v1, neue Köpfe, unkomprimiert) entschlüsselt');
    ok(V.protonExportToEntries(await V.protonLoad({kind:'pgp',payload:msg},pass)).vaults===1,'protonLoad: pgp → JSON-Objekt');
    const v6=V.concatBytes([enc2(3,V.concatBytes([new Uint8Array([6]),skesk.subarray(1)])),enc2(18,V.concatBytes([new Uint8Array([2]),ct]))]);
    await throwsWith(()=>V.pgpDecryptSymmetric(v6,pass),'pgpAlgo','v6/AEAD-Variante wird klar abgewiesen');
    const argon=V.concatBytes([enc2(3,V.concatBytes([new Uint8Array([4,9,4,8]),salt,new Uint8Array([255]),esk])),enc2(18,V.concatBytes([new Uint8Array([1]),ct]))]);
    await throwsWith(()=>V.pgpDecryptSymmetric(argon,pass),'pgpAlgo','Argon2-S2K wird klar abgewiesen');
  }
}

console.log('\n[15] Audit run-2: AES-Blockchiffre, CFB, SKESK-Deckel, Inflate-Bombe');
{
  const hex=h=>Uint8Array.from(h.match(/../g),x=>parseInt(x,16)), toHex=u=>Array.from(u,b=>b.toString(16).padStart(2,'0')).join('');
  const pt=hex('00112233445566778899aabbccddeeff'), out=new Uint8Array(16);
  for(const [k,want] of [['000102030405060708090a0b0c0d0e0f','69c4e0d86a7b0430d8cdb78070b4c55a'],['000102030405060708090a0b0c0d0e0f1011121314151617','dda97ca4864cdfe06eaf70a0ec0d7191'],['000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f','8ea2b7ca516745bfeafc49904b496089']]){
    V.aesEncryptBlock(V.aesExpand(hex(k)), pt,0, out,0); ok(toHex(out)===want,'FIPS-197 AES-'+(k.length*4)+' Testvektor'); }
  let mism=0; for(let i=0;i<60;i++){ const kl=[16,24,32][i%3]; const key=V.rand(kl), blk=V.rand(16);
    const ck=await crypto.subtle.importKey('raw',key,{name:'AES-CTR'},false,['encrypt']); const ref=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CTR',counter:blk,length:128},ck,new Uint8Array(16)));
    V.aesEncryptBlock(V.aesExpand(key), blk,0, out,0); if(toHex(out)!==toHex(ref)) mism++; }
  ok(mism===0,'60 Zufallsbloecke (AES-128/192/256) identisch mit WebCrypto');
  const f=fixture('data-nocomp.pgp'); const t0=Date.now(); const dec=await V.pgpDecryptSymmetric(f,'test-passphrase-alien'); ok(JSON.parse(new TextDecoder().decode(dec)).version==='1.32.0','Fixture nach AES-Umbau weiterhin entschluesselbar ('+(Date.now()-t0)+' ms)');
  const big=new Uint8Array(20*1024*1024); const m0=process.memoryUsage().rss; const t1=Date.now(); const r=V.pgpCfbDecrypt(V.rand(32), big); const dt=Date.now()-t1; const dm=(process.memoryUsage().rss-m0)/1048576;
  ok(r.length===big.length&&dt<15000&&dm<200,'20 MiB CFB: '+dt+' ms, +'+dm.toFixed(0)+' MB RSS (Ziel: < 15 s, < 200 MB)');
  const enc2=(tag,b)=>{ const len=b.length; const l=len<192?[len]:len<8384?[((len-192)>>8)+192,(len-192)&255]:[255,len>>>24,(len>>16)&255,(len>>8)&255,len&255]; return V.concatBytes([new Uint8Array([0xc0|tag,...l]),b]); };
  const skesk=V.concatBytes([new Uint8Array([4,9,3,8]),V.rand(8),new Uint8Array([255])]); const many=V.concatBytes([...Array(V.MAX_SKESK+1).fill(0).map(()=>enc2(3,skesk)),enc2(18,V.concatBytes([new Uint8Array([1]),V.rand(64)]))]);
  const t2=Date.now(); await throwsWith(()=>V.pgpDecryptSymmetric(many,'x'),'pgp','mehr als MAX_SKESK='+V.MAX_SKESK+' SKESK-Pakete abgewiesen'); ok(Date.now()-t2<500,'...und zwar sofort ('+(Date.now()-t2)+' ms, keine S2K-Arbeit)');
  const t3=Date.now(); await throwsWith(()=>V.pgpDecryptSymmetric(f,'falsch'),'pgpPass','falsche Passphrase'); ok(true,'Ablehnung nach '+(Date.now()-t3)+' ms (nur Quick-Check)');
  const bomb=new Uint8Array(deflateRawSync(Buffer.alloc(64*1024*1024))); const m1=process.memoryUsage().rss; const t4=Date.now();
  await throwsWith(()=>V.inflate(bomb,'deflate-raw'),'toolarge','Deflate-Bombe ('+bomb.length+' B -> 64 MiB) streamend abgebrochen');
  const dm2=(process.memoryUsage().rss-m1)/1048576; ok(dm2<40,'...mit +'+dm2.toFixed(0)+' MB RSS in '+(Date.now()-t4)+' ms');
  const small=new TextEncoder().encode('{"ok":true}'); ok(new TextDecoder().decode(await V.inflate(new Uint8Array(deflateRawSync(Buffer.from(small))),'deflate-raw'))==='{"ok":true}','normales Deflate weiterhin korrekt');
}

console.log('\n[16] Audit run-2: Dubletten-Schluessel, Kuerzungszaehler, Textsaeuberung, Merge-Kommutativitaet');
{
  const NUL=String.fromCharCode(0), ZW=String.fromCharCode(0x200b), RLO=String.fromCharCode(0x202e);
  const base={id:'0123456789abcdef',type:'login',title:'GitHub',user:'alien',pass:'pw',url:'',notes:'',totp:null,card:null,nowarn:false,fav:false,created:'2026-01-01T00:00:00.000Z',updated:'2026-01-02T00:00:00.000Z',deleted:null};
  const a=V.sanitizeEntry(base), b=V.sanitizeEntry(Object.assign({},base,{id:'fedcba9876543210',totp:'JBSWY3DPEHPK3PXP',updated:'2026-03-01T00:00:00.000Z',fav:true,cat:'Arbeit'}));
  ok(V.dupKey(a)!==V.dupKey(b),'Login mit TOTP ist keine Dublette des Logins ohne TOTP');
  ok(V.dupKey(a)===V.dupKey(V.sanitizeEntry(Object.assign({},base,{id:'fedcba9876543210',fav:true,cat:'Anders',updated:'2026-05-01T00:00:00.000Z'}))),'gleicher Inhalt, andere id/Kategorie/fav/Zeit -> Dublette (CSV-Re-Import bleibt erkannt)');
  ok(V.dupKey(a)!==V.dupKey(V.sanitizeEntry(Object.assign({},base,{url:'https://x'})))&&V.dupKey(a)!==V.dupKey(V.sanitizeEntry(Object.assign({},base,{notes:'n'}))),'URL bzw. Notizen unterscheiden');
  const c1=V.sanitizeEntry(Object.assign({},base,{type:'card',card:{number:'4111',pin:'1'}})), c2=V.sanitizeEntry(Object.assign({},base,{type:'card',card:{number:'4111',pin:'2'}}));
  ok(V.dupKey(c1)!==V.dupKey(c2),'Karten mit gleicher Nummer, anderer PIN sind keine Dubletten');
  const obj=JSON.parse(readFileSync(FIX+'data.json','utf8')); obj.vaults.share1.items[0].data.metadata.note='N'.repeat(9990);
  const r=V.protonExportToEntries(obj, Date.now()); const pm=r.entries.find(e=>e.title==='Proton Mail');
  ok(r.truncated===1&&pm.notes.length===V.CAPS.notes&&pm.extra[0].value==='4711'&&pm.email==='alien@proton.me','Proton: Kuerzung gezaehlt, Geheimnisse vor dem Freitext erhalten (Hidden-PIN im Zusatzfeld, E-Mail im Feld)');
  ok(V.protonExportToEntries(JSON.parse(readFileSync(FIX+'data.json','utf8')), Date.now()).truncated===0,'ohne Ueberlaenge: truncated=0');
  const st={truncated:0}; const rows=V.parseCsv('title,username,password,notes\nA,u,p,"'+'x'.repeat(10001)+'"\n',','); V.csvRowToEntry(V.csvMap(rows[0]),rows[1],Date.now(),st); ok(st.truncated===1,'CSV: Kuerzung gezaehlt');
  const cleaned=V.line('  '+NUL+'Bank'+ZW+' '+RLO+'X\n\nY  ',40); ok(cleaned==='Bank X Y','line(): Steuer-/Nullbreiten-/Bidi-Zeichen raus, Whitespace kollabiert: '+JSON.stringify(cleaned));
  const t=V.sanitizeEntry(Object.assign({},base,{title:'Harmlos\n\nOK = Abbrechen',cat:NUL})); ok(t.title==='Harmlos OK = Abbrechen'&&t.cat==='','Titel ohne Zeilenumbrueche, NUL-Kategorie wird leer');
  const L1=V.sanitizeEntry(Object.assign({},base,{title:'ALT',updated:'2026-01-02T00:00:00.000Z'})), L2=V.sanitizeEntry(Object.assign({},base,{title:'NEU',updated:'2026-02-02T00:00:00.000Z'})), I=V.sanitizeEntry(Object.assign({},base,{title:'MITTE',updated:'2026-01-15T00:00:00.000Z'}));
  const m1=V.mergeEntries([L1,L2],[I]).entries[0].title, m2=V.mergeEntries([L2,L1],[I]).entries[0].title; ok(m1==='NEU'&&m2==='NEU','mergeEntries dedupliziert local per winner() (Reihenfolge egal)');
}

console.log('\n[17] v1.2: Fingerabdruck-Slot (Rolle bio, Blob-Format, Schluessel-Laenge)');
{
  const kdf=Object.assign({},KDF_TEST,{salt:V.rand(16)});
  const kek=await V.deriveKek(V.passBytes('pp-bio-test-passphrase'),kdf);
  const dekX=await V.newDek(); const wrap=await V.wrapDek(dekX,kek,kdf);
  const secret=V.rand(32); const bk=await V.bioKey(secret);
  const blob=await V.wrapDek(dekX,bk,kdf,'bio');
  ok(blob.ct.length===48&&blob.iv.length===12,'bio-Wrap hat dieselbe Groesse wie der Passphrase-Wrap');
  const raw=V.serializeBioBlob(blob, wrap.ct); const back=V.parseBioBlob(raw);
  ok(back&&back.w===V.bufToB64(wrap.ct),'Blob trägt den Passphrase-Wrap (w) — Bindung an den Slot der Datei (run-3 #3)');
  ok(V.parseBioBlob(JSON.stringify({iv:V.bufToB64(blob.iv),ct:V.bufToB64(blob.ct)}))===null,'Blob ohne w → null');
  let badW=false; try{ V.serializeBioBlob(blob, V.rand(47)); badW=true; }catch(e){ ok(e.message==='bioblob','serializeBioBlob verlangt 48-Byte-Wrap'); } ok(!badW,'falsche Wrap-Länge wirft');
  ok(back&&V.bufToB64(back.ct)===V.bufToB64(blob.ct)&&V.bufToB64(back.iv)===V.bufToB64(blob.iv),'serializeBioBlob/parseBioBlob Roundtrip');
  ok(raw.length<512&&!raw.includes(V.bufToB64(secret)),'Blob enthaelt den Zufallsschluessel nicht');
  const dek=await V.unwrapDek(back,bk,kdf,false,'bio'); const body=await V.encryptBody(V.emptyVault(),dek,kdf);
  const dek2=await V.unwrapDek(wrap,kek,kdf,false); const v=await V.decryptBody(body,dek2,kdf); ok(v&&v.version===1,'per bio ausgepackter DEK == Passphrase-DEK (Body wechselseitig lesbar)');
  let crossed=false; try{ await V.unwrapDek(back,bk,kdf,false,'wrap'); crossed=true; }catch(_){ } ok(!crossed,'Rolle bio ist nicht als Passphrase-Slot nutzbar (AAD trennt)');
  let crossed2=false; try{ await V.unwrapDek(wrap,bk,kdf,false,'bio'); crossed2=true; }catch(_){ } ok(!crossed2,'Passphrase-Wrap ist mit dem bio-Schluessel nicht auspackbar');
  const kdf2=Object.assign({},kdf,{salt:V.rand(16)}); let other=false; try{ await V.unwrapDek(back,bk,kdf2,false,'bio'); other=true; }catch(_){ } ok(!other,'bio-Blob ist an den Datei-Header (Salt) gebunden — fremder/neuer Tresor scheitert');
  ok(V.parseBioBlob('{"iv":"AAAA","ct":"AAAA"}')===null&&V.parseBioBlob('nope')===null&&V.parseBioBlob(null)===null&&V.parseBioBlob(JSON.stringify({iv:V.bufToB64(blob.iv),ct:V.bufToB64(blob.ct),w:V.bufToB64(wrap.ct),x:1}))!==null,'parseBioBlob: falsche Laengen/Formate → null, Fremdfelder ignoriert');
  ok(V.parseBioBlob('{'+'"a":1,'.repeat(200)+'}')===null,'parseBioBlob: Uebergroesse → null');
  let bad=false; try{ await V.bioKey(V.rand(16)); bad=true; }catch(e){ ok(e.message==='biokey','bioKey verlangt genau 32 Byte'); } ok(!bad,'bioKey(16 Byte) wirft');
  // Audit run-8 #1: Bindung an IV + Ciphertext (+ Header für die PIN); alte Blobs ohne wi bleiben gültig
  const raw2=V.serializeBioBlob(blob, wrap.ct, wrap.iv); const back2=V.parseBioBlob(raw2);
  ok(back2&&back2.wi===V.bufToB64(wrap.iv)&&back2.w===V.bufToB64(wrap.ct),'Blob v1.8 trägt auch die Wrap-IV (wi)');
  ok(back&&back.wi===null&&V.bioWrapOk(back,wrap),'Blob ohne wi (≤ v1.7) gilt weiter: bioWrapOk prüft nur den Ciphertext');
  ok(V.bioWrapOk(back2,wrap),'bioWrapOk: unveränderter Wrap passt');
  { const iv2=new Uint8Array(wrap.iv); iv2[0]^=1; ok(!V.bioWrapOk(back2,{iv:iv2,ct:wrap.ct}),'bioWrapOk: gekippte IV → Mismatch (vorher unbemerkt)'); ok(V.bioWrapOk(back,{iv:iv2,ct:wrap.ct}),'alter Blob ohne wi kann die IV nicht prüfen (dokumentierter Übergang)'); }
  { const ct2=new Uint8Array(wrap.ct); ct2[5]^=1; ok(!V.bioWrapOk(back2,{iv:wrap.iv,ct:ct2})&&!V.bioWrapOk(back,{iv:wrap.iv,ct:ct2}),'bioWrapOk: gekippter Ciphertext → Mismatch, alt und neu'); }
  ok(V.parseBioBlob(JSON.stringify({iv:V.bufToB64(blob.iv),ct:V.bufToB64(blob.ct),w:V.bufToB64(wrap.ct),wi:'AAAA'}))===null,'parseBioBlob: wi mit falscher Länge → null');
  let badWi=false; try{ V.serializeBioBlob(blob, wrap.ct, V.rand(11)); badWi=true; }catch(e){ ok(e.message==='bioblob','serializeBioBlob verlangt 12-Byte-IV'); } ok(!badWi,'falsche IV-Länge wirft');
  const tag=V.wrapTag(kdf,wrap);
  ok(typeof tag==='string'&&tag.includes(V.bufToB64(wrap.iv))&&tag.includes(V.bufToB64(wrap.ct))&&tag.includes(V.bufToB64(kdf.salt))&&tag.includes('|'+kdf.m+'|'+kdf.t+'|'+kdf.p+'|'),'wrapTag bindet Salz, m/t/p, IV und Ciphertext');
  { const iv2=new Uint8Array(wrap.iv); iv2[11]^=1; ok(V.wrapTag(kdf,{iv:iv2,ct:wrap.ct})!==tag,'wrapTag: IV verändert → anderes Tag'); }
  ok(V.wrapTag(Object.assign({},kdf,{t:kdf.t+1}),wrap)!==tag,'wrapTag: Header (t) verändert → anderes Tag (Audit run-8 #10)');
  ok(V.wrapTag(Object.assign({},kdf,{salt:V.rand(16)}),wrap)!==tag,'wrapTag: Salz verändert → anderes Tag');
  ok(V.wrapTag(kdf,{iv:new Uint8Array(wrap.iv),ct:new Uint8Array(wrap.ct)})===tag,'wrapTag: gleiche Bytes → gleiches Tag (deterministisch)');
  const bk2=await V.bioKey(V.rand(32)); ok(bk2.extractable===false&&bk2.usages.join()==='wrapKey,unwrapKey','bio-Schluessel nicht extrahierbar, nur wrap/unwrap');
  const dekW=await V.unwrapDek(wrap,kek,kdf,false); let noWrap=false; try{ await V.wrapDek(dekW,bk,kdf,'bio'); noWrap=true; }catch(_){ } ok(!noWrap,'nicht extrahierbarer Sitzungs-DEK laesst sich NICHT erneut verpacken (Aktivieren braucht die Passphrase)');
}

console.log('\n[18] Audit run-3: Partial-Body-Bombe, AES-Schluessellaenge, MDC-Fehler als Manipulation');
{
  const bomb=new Uint8Array(1+2*3+1); bomb[0]=0xD2; for(let i=0;i<3;i++){ bomb[1+2*i]=0xE0; bomb[2+2*i]=0x41; } bomb[7]=0x00;   // Partial-Laenge 1 Byte
  let e1=null; try{ V.pgpPackets(bomb); }catch(e){ e1=e.message; } ok(e1==='pgp','erste Partial-Laenge < 512 → pgp (statt Millionen 1-Byte-Ansichten)');
  const okp=new Uint8Array(1+1+512+1); okp[0]=0xD2; okp[1]=0xE9; okp[514]=0x00; const pk=V.pgpPackets(okp); ok(pk.length===1&&pk[0].tag===18&&pk[0].body.length===512,'erste Partial-Laenge 512 + Endstueck 0 → ein Paket');
  const many=new Uint8Array(1+1+512+4100*2+1); many[0]=0xD2; many[1]=0xE9; let q=514; for(let i=0;i<4100;i++){ many[q++]=0xE0; many[q++]=0x41; } many[q]=0x00;
  let e2=null; try{ V.pgpPackets(many); }catch(e){ e2=e.message; } ok(e2==='pgp','mehr als 4096 Teilstuecke → pgp');
  for(const n of [0,15,17,20,31,33,48]){ let e3=null; try{ V.aesExpand(new Uint8Array(n)); }catch(e){ e3=e.message; } ok(e3==='pgp',`aesExpand(${n} Byte) wirft`); }
  const fx=V.pgpDearmor(new TextDecoder().decode(readFileSync(FIX+'data-nocomp.pgp'))); const tam=fx.slice(); tam[tam.length-1]^=1;   // binär, letztes Byte (MDC-Hash) gekippt
  let e4=null; try{ await V.pgpDecryptSymmetric(tam,'test-passphrase-alien'); }catch(e){ e4=e.message; } ok(e4==='pgpMdc','manipulierte Datei (MDC) → pgpMdc, nicht „falsche Passphrase“');
  let e5=null; try{ await V.pgpDecryptSymmetric(fx,'falsch-falsch-falsch'); }catch(e){ e5=e.message; } ok(e5==='pgpPass','falsche Passphrase → pgpPass');
  const good=await V.pgpDecryptSymmetric(fx,'test-passphrase-alien'); ok(good&&good.length>0,'unveraenderte Datei entschluesselt weiterhin');
}

console.log('\n[19] v1.3: Bankkonto-Typ (Whitelist, Normalisierung, Tombstone, dupKey, Merge)');
{
  const k=V.sanitizeEntry(E({type:'bank',bank:{holder:'  Max\u200b Muster ',iban:'de89 3704 0044 0532 0130 00x',bic:'cobadeffxxx!',bank:'Commerz\tbank',pin:' 1234 ',extra:1},pass:'p',user:'u',card:{number:'1'}}));
  ok(k.type==='bank'&&k.pass===''&&k.user===''&&k.card===null&&k.totp===null,'bank: Login-/Kartenfelder geleert');
  ok(k.bank.iban==='DE89 3704 0044 0532 0130 00X'&&k.bank.bic==='COBADEFFXXX'&&k.bank.holder==='Max Muster'&&k.bank.bank==='Commerz bank'&&k.bank.pin==='1234'&&!('extra' in k.bank),'bank: IBAN groß/nur alnum+Leerzeichen, BIC nur alnum, Inhaber/Bank line(), PIN getrimmt, Fremdfeld weg: '+JSON.stringify(k.bank));
  ok(Object.keys(k).length===18&&Object.keys(k.bank).length===5,'18 Felder, Kontoobjekt genau 5');
  ok(V.sanitizeEntry(E({type:'bank',bank:{}})).bank===null&&V.sanitizeEntry(E({type:'bank',bank:'x'})).bank===null&&V.sanitizeEntry(E({type:'bank'})).bank===null,'leeres/kaputtes/fehlendes Konto → null');
  ok(V.sanitizeEntry(E({type:'card',bank:{iban:'DE1'},card:{number:'1'}})).bank===null&&V.sanitizeEntry(E({type:'login',bank:{iban:'DE1'}})).bank===null,'bank-Objekt nur bei Typ bank');
  ok(V.sanitizeBank({iban:'a'.repeat(100)}).iban.length===42&&V.sanitizeBank({bic:'B'.repeat(20)}).bic.length===11,'Caps: IBAN 42, BIC 11');
  const tb=V.tombstone(k,'2026-02-01T00:00:00.000Z'); ok(tb.bank===null&&Object.keys(tb).length===18&&V.canon(tb)===V.canon(V.sanitizeEntry(tb)),'Tombstone eines Kontos: bank null, sanitizer-stabil');
  const k2=Object.assign({},k,{bank:Object.assign({},k.bank,{pin:'9999'})});
  ok(V.dupKey(k)!==V.dupKey(k2)&&V.dupKey(k)===V.dupKey(Object.assign({},k,{id:'ffffffffffffffff',fav:true,cat:'x'})),'dupKey: PIN-Unterschied trennt, id/fav/cat egal');
  ok(V.winner(k,k2)===V.winner(k2,k),'winner() deterministisch bei Konto-Gleichstand');
  const m=V.mergeEntries([k],[k2]); ok(m.entries.length===1&&m.entries[0].bank.pin===V.winner(k,k2).bank.pin,'Merge: ein Eintrag, Gewinner-PIN');
  // Roundtrip durch die Datei
  const dek=await V.newDek(); const kdf={m:8192,t:1,p:1,salt:V.rand(16)}; const body=await V.encryptBody({entries:[k],settings:{},version:1},dek,kdf);
  const back=await V.decryptBody(body,dek,kdf); ok(back.entries[0].bank.iban===k.bank.iban,'Konto überlebt encryptBody/decryptBody');
}

console.log('\n[20] v1.4: Zusatzfelder (sanitizeExtra, Whitelist bei jedem Typ, Tombstone, dupKey, Merge, Roundtrip)');
{
  const raw=[{name:' App​-PIN ',value:'1234'},{name:'ohne Wert',value:''},{name:'',value:'ohne Name'},'x',null,{name:'Tel\tKennwort',value:' geheim \n'},{name:'x'.repeat(100),value:'y'.repeat(2000)}];
  const x=V.sanitizeExtra(raw);
  ok(x.length===3&&x[0].name==='App-PIN'&&x[0].value==='1234'&&x[1].name==='Tel Kennwort'&&x[1].value===' geheim \n','nur Paare mit Name UND Wert, Name über line(), Wert roh (Whitespace bleibt)');
  ok(x[2].name.length===V.CAPS.xname&&x[2].value.length===V.CAPS.xvalue&&Object.keys(x[2]).length===2,'Caps: Name 40, Wert 1000, genau zwei Felder je Paar');
  ok(V.sanitizeExtra(null).length===0&&V.sanitizeExtra('a').length===0&&V.sanitizeExtra({}).length===0&&V.sanitizeExtra([{name:'a',value:'b',extra:1}])[0].extra===undefined,'kaputt → [], Fremdfelder im Paar verworfen');
  const many=Array.from({length:20},(_,i)=>({name:'F'+i,value:'v'+i})); const capped=V.sanitizeExtra(many);
  ok(capped.length===V.EXTRA_MAX&&capped[0].name==='F0'&&capped[V.EXTRA_MAX-1].name==='F'+(V.EXTRA_MAX-1),'höchstens EXTRA_MAX='+V.EXTRA_MAX+', Reihenfolge erhalten');
  for(const type of ['login','note','card','bank']){ const e=V.sanitizeEntry(E({type,extra:[{name:'N',value:'V'}],card:{number:'1'},bank:{iban:'DE1'}}));
    ok(e.extra.length===1&&e.extra[0].name==='N'&&Object.keys(e).length===18,'Typ '+type+': Zusatzfeld getragen, 18 Felder'); }
  ok(V.sanitizeEntry(E({})).extra.length===0&&Array.isArray(V.sanitizeEntry(E({extra:'x'})).extra),'ohne/kaputtes extra → [] (v1.3-Daten bleiben gültig)');
  const a=V.sanitizeEntry(E({extra:[{name:'PIN',value:'1'}]})); const b=Object.assign({},a,{extra:[{name:'PIN',value:'2'}]}); const c=Object.assign({},a,{extra:[]});
  ok(V.dupKey(a)!==V.dupKey(b)&&V.dupKey(a)!==V.dupKey(c)&&V.dupKey(a)===V.dupKey(Object.assign({},a,{id:'ffffffffffffffff',fav:true,cat:'z'})),'dupKey: anderer Wert / fehlendes Feld trennt, id/fav/cat egal');
  const tb=V.tombstone(a,'2026-02-01T00:00:00.000Z'); ok(tb.extra.length===0&&Object.keys(tb).length===18&&V.canon(tb)===V.canon(V.sanitizeEntry(tb)),'Tombstone: extra leer, sanitizer-stabil');
  ok(V.winner(a,b)===V.winner(b,a)&&V.canon(V.mergeEntries([a],[b]).entries)===V.canon(V.mergeEntries([b],[a]).entries),'Merge kommutativ bei Gleichstand nur in extra');
  const newer=Object.assign({},b,{updated:'2026-01-03T00:00:00.000Z'}); const m=V.mergeEntries([a],[newer]);
  ok(m.entries.length===1&&m.entries[0].extra[0].value==='2'&&m.updated===1,'Merge: neueres extra gewinnt');
  const dek=await V.newDek(); const kdf={m:8192,t:1,p:1,salt:V.rand(16)}; const body=await V.encryptBody({entries:[a],settings:{},version:1},dek,kdf);
  const back=await V.decryptBody(body,dek,kdf); ok(back.entries[0].extra[0].value==='1'&&V.sanitizeVault(back).entries[0].extra[0].name==='PIN','Zusatzfeld überlebt encryptBody/decryptBody + sanitizeVault');
  // Proton: nur „hidden“ wird Zusatzfeld, Deckel EXTRA_MAX, Rest in die Notizen; Text-Felder bleiben Notizzeilen
  const ef=Array.from({length:V.EXTRA_MAX+2},(_,i)=>({fieldName:'H'+i,type:'hidden',data:{content:'s'+i}})); ef.push({fieldName:'T',type:'text',data:{content:'sichtbar'}}); ef.push({fieldName:'leer',type:'hidden',data:{content:''}});
  const pe=V.protonItemToEntry({data:{type:'login',metadata:{name:'X'},content:{itemUsername:'u',password:'p'},extraFields:ef}},'',Date.now());
  ok(pe.extra.length===V.EXTRA_MAX&&pe.extra[0].name==='H0'&&pe.extra[0].value==='s0'&&pe.notes.includes('H'+V.EXTRA_MAX+': s'+V.EXTRA_MAX)&&pe.notes.includes('T: sichtbar')&&!pe.notes.includes('H0: s0')&&!pe.extra.some(x=>x.name==='leer')&&pe.notes.includes('leer: '),'Proton: '+V.EXTRA_MAX+' Hidden → Zusatzfelder, Überzählige + Text → Notizen, leeres Hidden kein Zusatzfeld (bleibt wie bisher Notizzeile)');
  const st={truncated:0,hiddenOver:0}; V.protonItemToEntry({data:{type:'login',metadata:{name:'X'},content:{},extraFields:ef}},'',Date.now(),st);
  ok(st.hiddenOver===2&&st.truncated===0,'Proton: Hidden-Felder über dem Deckel werden gezählt (2), Text-Feld nicht');
  const pr=V.protonExportToEntries({version:'1',vaults:{s:{name:'V',items:[{data:{type:'login',metadata:{name:'X'},content:{},extraFields:ef}}]}}},Date.now());
  ok(pr.hiddenOver===2&&pr.entries.length===1,'protonExportToEntries meldet hiddenOver');
  const pn=V.protonItemToEntry({data:{type:'note',metadata:{name:'N',note:'n'},content:{},extraFields:[{fieldName:'Safe-Code',type:'hidden',data:{content:'77'}}]}},'',Date.now());
  ok(pn.type==='note'&&pn.extra.length===1&&pn.extra[0].name==='Safe-Code'&&pn.notes==='n','Proton-Notiz mit Hidden-Feld → Zusatzfeld auch bei Typ note');
}

console.log('\n[21] v1.4: E-Mail-Feld (nur login, line(), Cap 200, Tombstone, dupKey, Proton JSON + CSV)');
{
  const a=V.sanitizeEntry(E({email:'  max@​example.org\n '})); ok(a.email==='max@example.org'&&Object.keys(a).length===18,'login: email über line() (Nullbreite raus, getrimmt), 18 Felder');
  ok(V.sanitizeEntry(E({email:'x'.repeat(300)})).email.length===V.CAPS.email&&V.sanitizeEntry(E({})).email===''&&V.sanitizeEntry(E({email:5})).email==='','Cap 200, fehlend/kaputt → \"\"');
  for(const type of ['note','card','bank']) ok(V.sanitizeEntry(E({type,email:'a@b.de'})).email==='','Typ '+type+': email geleert');
  const tb=V.tombstone(a,'2026-02-01T00:00:00.000Z'); ok(tb.email===''&&Object.keys(tb).length===18&&V.canon(tb)===V.canon(V.sanitizeEntry(tb)),'Tombstone: email leer, sanitizer-stabil');
  const b2=Object.assign({},a,{email:'other@example.org'}); ok(V.dupKey(a)!==V.dupKey(b2)&&V.dupKey(a)===V.dupKey(Object.assign({},a,{id:'ffffffffffffffff',fav:true})),'dupKey: andere E-Mail trennt, id/fav egal');
  const pj=(u,em)=>V.protonItemToEntry({data:{type:'login',metadata:{name:'X'},content:{itemUsername:u,itemEmail:em,password:'p'}}},'',Date.now());
  ok(pj('max','max@ex.org').user==='max'&&pj('max','max@ex.org').email==='max@ex.org'&&pj('max','max@ex.org').notes==='','Proton JSON: Nutzer + E-Mail → beide Felder, Notizen leer');
  ok(pj('','only@ex.org').user==='only@ex.org'&&pj('','only@ex.org').email===''&&pj('same@ex.org','same@ex.org').email==='','Proton JSON: nur E-Mail → Nutzername; identisch → kein Doppel');
  const m=V.csvMap(V.parseCsv('type,name,url,email,username,password,note\nlogin,Shop,https://s.de,a@b.de,maxi,pw,Hallo\nlogin,Shop2,,a@b.de,,pw,\n')[0]);
  const rows=V.parseCsv('type,name,url,email,username,password,note\nlogin,Shop,https://s.de,a@b.de,maxi,pw,Hallo\nlogin,Shop2,,a@b.de,,pw,\n');
  const c1=V.csvRowToEntry(m,rows[1],Date.now()), c2=V.csvRowToEntry(m,rows[2],Date.now());
  ok(c1.user==='maxi'&&c1.email==='a@b.de'&&c1.notes==='Hallo'&&c2.user==='a@b.de'&&c2.email==='','Proton CSV: Nutzer+E-Mail → Felder (Notizen unverändert); nur E-Mail → Nutzername');
  const dek=await V.newDek(); const kdf={m:8192,t:1,p:1,salt:V.rand(16)}; const body=await V.encryptBody({entries:[a],settings:{},version:1},dek,kdf);
  ok((await V.decryptBody(body,dek,kdf)).entries[0].email==='max@example.org','E-Mail überlebt encryptBody/decryptBody');
}


console.log('\n[22] v1.5: Papierkorb (sanitizeEntry behält Inhalt, tombFrom/isWiped, wipeTrash, winner, Konvergenz)');
{
  const DAY=86400000, now=Date.now();
  const iso=d=>new Date(now-d*DAY).toISOString(), tsOf=v=>Date.parse(v)||0;
  const del=(o,d)=>V.sanitizeEntry(E(Object.assign({deleted:iso(d), updated:iso(d)},o)), now);

  // --- Sanitizer: gelöschte Einträge laufen durch dieselbe Whitelist wie lebende ---
  const t1=del({type:'login', title:'Proton', pass:'geheim', email:'a@b.de', cat:'Arbeit', extra:[{name:'App-PIN',value:'1234'}]},1);
  ok(t1.deleted&&t1.title==='Proton'&&t1.pass==='geheim'&&t1.email==='a@b.de'&&t1.cat==='Arbeit'&&t1.extra.length===1&&Object.keys(t1).length===18,
     'gelöschter Login behält Titel/Passwort/E-Mail/Kategorie/Zusatzfeld, 18 Felder');
  const t1b=del({type:'bank', bank:{holder:'Max', iban:'de89 3704 0044 0532 0130 00', bic:'cobadeff', bank:'Bank', pin:'1234'}},1);
  ok(t1b.type==='bank'&&t1b.bank&&t1b.bank.iban==='DE89 3704 0044 0532 0130 00'&&t1b.bank.bic==='COBADEFF','gelöschtes Konto behält Typ und normalisiertes Kontoobjekt');
  const t1c=del({type:'card', card:{number:'4111-1111 1111-1111', cvv:'123'}},1);
  ok(t1c.type==='card'&&t1c.card&&t1c.card.number==='41111111 11111111'&&t1c.card.cvv==='123','gelöschte Karte behält Typ und normalisiertes Kartenobjekt');
  const fut=V.sanitizeEntry(E({deleted:new Date(now+400*DAY).toISOString(), updated:'2026-01-02T00:00:00.000Z'}), now);
  ok(Date.parse(fut.deleted)<=now+120000,'Zukunfts-deleted auf now+2min geklemmt (fremde Datei kann die Frist nicht verschieben): '+fut.deleted);
  const t1d=V.sanitizeEntry(Object.assign(E({deleted:iso(1)}),{fremdfeld:'weg', __proto__:{polluted:1}}), now);
  ok(!Object.prototype.hasOwnProperty.call(t1d,'fremdfeld')&&Object.keys(t1d).length===18,'Fremdfeld auch am gelöschten Eintrag verworfen, 18 Felder');
  ok(del({notes:'n'.repeat(20000)},1).notes.length===V.CAPS.notes,'Caps greifen auch am gelöschten Eintrag (notes gekürzt)');

  // --- tombFrom / isWiped / tombstone ---
  const w1=V.tombFrom(t1);
  ok(w1.created===t1.created&&w1.updated===t1.updated&&w1.deleted===t1.deleted&&w1.title===''&&w1.pass===''&&w1.extra.length===0&&Object.keys(w1).length===18,
     'tombFrom() übernimmt created/updated/deleted, leert den Rest, 18 Felder');
  ok(V.isWiped(w1)&&!V.isWiped(t1)&&!V.isWiped(V.sanitizeEntry(E({title:'',user:'',pass:''}))),
     'isWiped: gewipt ja, Papierkorb nein, lebender Leer-Eintrag nein (deleted fehlt)');
  // tombFrom() normalisiert auf type:'login' — die vier Durchläufe pruefen sonst dieselbe Gestalt (Audit run-5, vakuante Assertion).
  // Deshalb: EINE Stabilitaetspruefung, und getrennt davon, dass jeder Typ WIRKLICH auf die login-Gestalt normalisiert wird.
  { const wx=V.tombFrom(del({type:'card', card:{number:'1'}},1));
    ok(V.canon(wx)===V.canon(V.sanitizeEntry(wx, now))&&V.isWiped(wx),'tombFrom() ist sanitizer-stabil und gilt als gewipt'); }
  for(const type of ['login','note','card','bank']){
    const x=del({type, card:{number:'1'}, bank:{iban:'DE1'}, notes:'n', extra:[{name:'a',value:'b'}]},1), wx=V.tombFrom(x);
    const leer=Object.assign({}, wx, {type:'login'});   // Referenzgestalt mit denselben Zeitstempeln
    ok(wx.type==='login'&&wx.card===null&&wx.bank===null&&wx.notes===''&&wx.extra.length===0&&V.canon(wx)===V.canon(leer),
       'tombFrom() normalisiert Typ '+type+' restlos auf die leere login-Gestalt'); }
  const tb=V.tombstone(t1,'2026-03-01T00:00:00.000Z');
  ok(tb.created===t1.created&&tb.updated==='2026-03-01T00:00:00.000Z'&&tb.deleted==='2026-03-01T00:00:00.000Z'&&V.isWiped(tb)&&Object.keys(tb).length===18,
     'tombstone(): created erhalten, updated=deleted=jetzt, gewipt, 18 Felder');
  // Der Fall, der die Abkürzung "bei Gleichstand gewinnt der KLEINERE canon()" verbietet:
  const empt=V.sanitizeEntry({id:'0123456789abcdef', type:'card', title:'', deleted:iso(1), updated:iso(1)}, now);
  ok(!V.isWiped(empt)&&V.canon(V.tombFrom(empt))>V.canon(empt)&&V.winner(V.tombFrom(empt),empt).type==='login',
     'inhaltsloser Karten-Eintrag: gewipte Gestalt hat den GRÖSSEREN canon() — winner() braucht isWiped, nicht den Stringvergleich');

  // --- wipeTrash ---
  const fresh=del({title:'frisch'},V.TRASH_DAYS-1), old=del({title:'alt'},V.TRASH_DAYS+1), alive=V.sanitizeEntry(E({title:'lebt'}));
  const inp=[fresh,old,alive], out=V.wipeTrash(inp, now);
  ok(out.find(e=>e.id===fresh.id)===fresh,'frischer Papierkorb-Eintrag überlebt IDENTISCH (kein neues Objekt)');
  const oldOut=out.find(e=>e.id===old.id);
  ok(V.isWiped(oldOut)&&oldOut.updated===old.updated&&oldOut.deleted===old.deleted,'abgelaufener Eintrag wird gewipt, updated und deleted bleiben unverändert');
  ok(out.find(e=>e.id===alive.id)===alive,'lebender Eintrag bleibt unangetastet');
  ok(inp[1]===old&&old.title==='alt','wipeTrash mutiert das Eingabe-Array nicht');
  ok(V.canon(V.wipeTrash(out,now))===V.canon(out)&&V.wipeTrash(V.wipeTrash(inp,now),now).length===3,'wipeTrash ist idempotent');
  { const onlyLive=[alive]; ok(V.wipeTrash(onlyLive,now)===onlyLive,"ohne Papierkorb gibt wipeTrash dasselbe Array zurück"); }
  ok(V.TRASH_DAYS<V.TOMBSTONE_DAYS,`TRASH_DAYS (${V.TRASH_DAYS}) < TOMBSTONE_DAYS (${V.TOMBSTONE_DAYS}) — sonst droppt purgeTombstones Inhalt`);
  { const many=[]; for(let i=0;i<V.MAX_TRASH+50;i++) many.push(del({title:'T'+i}, 1+i/1000));
    const capped=V.wipeTrash(many, now), kept=capped.filter(e=>!V.isWiped(e));
    ok(kept.length===V.MAX_TRASH&&capped.length===many.length,`MAX_TRASH: genau ${V.MAX_TRASH} behalten Inhalt, keiner entfernt (${kept.length}/${capped.length})`);
    ok(kept.every(e=>tsOf(e.deleted)>=Math.max(...capped.filter(x=>V.isWiped(x)).map(x=>tsOf(x.deleted)))),'über dem Deckel weichen die ÄLTESTEN Löschungen'); }

  // --- winner / Merge ---
  const A=del({title:'Konto'},5), B=V.tombFrom(A);
  ok(V.winner(A,B)===B&&V.winner(B,A)===B,'Gleichstand, beide gelöscht: die gewipte Gestalt gewinnt beidseitig');
  const restored=Object.assign({},A,{deleted:null, updated:new Date(now).toISOString()});
  ok(V.mergeEntries([B],[restored]).entries[0].deleted===null&&V.mergeEntries([restored],[B]).entries[0].deleted===null,'Wiederherstellen (neueres updated) schlägt die Löschmarke beidseitig');
  const mi=V.mergeEntries([B],[A]);
  ok(V.isWiped(mi.entries[0])&&mi.added===0&&mi.updated===0&&mi.deleted===0,'Re-Import eines inhaltsvollen Stands über eine gewipte Löschmarke ist idempotent (0/0/0)');
  { const setA=[alive,fresh,old,V.tombstone(del({},2),iso(2))], setB=[V.tombFrom(fresh),alive,old];
    const ab=V.sanitizeEntries(V.mergeEntries(setA,setB).entries, now), ba=V.sanitizeEntries(V.mergeEntries(setB,setA).entries, now);
    ok(JSON.stringify(ab.map(V.canon).sort())===JSON.stringify(ba.map(V.canon).sort()),'Pipeline kommutativ über live / Papierkorb / abgelaufen / Löschmarke');
    const abc=V.sanitizeEntries(V.mergeEntries(V.mergeEntries(setA,setB).entries,[alive]).entries, now);
    const a_bc=V.sanitizeEntries(V.mergeEntries(setA,V.mergeEntries(setB,[alive]).entries).entries, now);
    ok(JSON.stringify(abc.map(V.canon).sort())===JSON.stringify(a_bc.map(V.canon).sort()),'Pipeline assoziativ'); }
  { // Zwei Geräte: A hat gewipt, B noch nicht — beide Richtungen enden gewipt, zweite Runde ändert nichts.
    // NICHT abgelaufen waehlen (TRASH_DAYS-1): sonst wipet wipeTrash ohnehin und die Assertion haelt auch mit
    // invertierter winner()-Regel — genau die vakuante Fassung, die Audit run-5 gefunden hat.
    const bDev=del({title:'Sparkasse'},V.TRASH_DAYS-1), aDev=V.tombFrom(bDev);
    const r1=V.sanitizeEntries(V.mergeEntries([aDev],[bDev]).entries, now), r2=V.sanitizeEntries(V.mergeEntries([bDev],[aDev]).entries, now);
    ok(V.isWiped(r1[0])&&V.isWiped(r2[0])&&V.canon(r1[0])===V.canon(r2[0]),'Zwei-Geräte-Konvergenz: beide Richtungen enden gewipt');
    ok(V.canon(V.sanitizeEntries(V.mergeEntries(r1,r2).entries, now)[0])===V.canon(r1[0]),'zweite Sync-Runde ändert nichts mehr'); }

  // --- Pipeline, Grenzen, Roundtrip ---
  { const mix=[]; for(let i=0;i<150;i++) mix.push(del({title:'P'+i},1)); for(let i=0;i<10;i++) mix.push(V.sanitizeEntry(E({title:'L'+i})));
    const s=V.sanitizeEntries(mix, now);
    ok(V.liveCount(s)===10&&s.filter(e=>!V.isWiped(e)&&e.deleted).length===150,'Papierkorb zählt nicht gegen MAX_ENTRIES (10 live, 150 im Papierkorb)'); }
  { const gone=del({title:'uralt'},V.TOMBSTONE_DAYS+1);
    ok(V.isWiped(V.wipeTrash([gone],now)[0]),'über TOMBSTONE_DAYS: wipeTrash leert ihn ZUERST (die Hälfte, die [32] bisher nicht prüfte)');
    const s=V.sanitizeEntries([gone,alive], now);
    ok(!s.find(e=>e.id===gone.id),'… und purgeTombstones dropt ihn danach — nie inhaltsvoll gedroppt'); }
  { const dek=await V.newDek(); const kdf={m:8192,t:1,p:1,salt:V.rand(16)};
    const body=await V.encryptBody({version:1,entries:[t1],settings:{},totp:null,meta:{}},dek,kdf);
    const back=V.sanitizeVault(await V.decryptBody(body,dek,kdf), now).entries[0];
    ok(back.title==='Proton'&&back.pass==='geheim'&&back.deleted===t1.deleted,'Papierkorb-Eintrag überlebt encryptBody/decryptBody/sanitizeVault mit Inhalt'); }
}


console.log('\n[23] Audit run-5: Verdrängung durch fremde Dateien (shapeIncoming, purgeTombstones-Anzahlzweig)');
{
  const DAY=86400000, now=Date.now();
  const iso=d=>new Date(now-d*DAY).toISOString();
  const hid=(p,i)=>(p+i.toString(16).padStart(10,'0')).padEnd(16,'0').slice(0,16);
  const mk=(o)=>V.sanitizeEntry(Object.assign({type:'login',title:'T',user:'u',pass:'p',created:iso(100),updated:iso(3)},o), now);
  const pipe=l=>V.purgeTombstones(V.wipeTrash(l, now), now);

  // --- Die Lücke, durch die der M13-Mutant schlüpfte: wipeTrash IN sanitizeEntries ---
  { const abgelaufen=mk({id:hid('a',1), title:'Alt', pass:'GEHEIM', deleted:iso(V.TRASH_DAYS+1), updated:iso(V.TRASH_DAYS+1)});
    const out=V.sanitizeEntries([abgelaufen], now);
    ok(out.length===1&&V.isWiped(out[0]),'sanitizeEntries leert einen abgelaufenen Papierkorb-Eintrag SELBST (Entsperr-Pfad, ohne nachfolgenden persist)'); }
  { const viele=[]; for(let i=0;i<V.MAX_TRASH+50;i++) viele.push(mk({id:hid('b',i), title:'P'+i, pass:'x', deleted:iso(1+i/1000), updated:iso(1+i/1000)}));
    const out=V.sanitizeEntries(viele, now);
    ok(out.filter(e=>!V.isWiped(e)).length===V.MAX_TRASH,'sanitizeEntries kappt den Papierkorb SELBST auf MAX_TRASH'); }

  // --- Angriff 1: 200 fremde Papierkorb-Einträge sollen den eigenen Papierkorb verdrängen ---
  { const eigen=[]; for(let i=0;i<5;i++) eigen.push(mk({id:hid('c',i), title:'Eigen'+i, pass:'GEHEIM'+i, deleted:iso(3), updated:iso(3)}));
    const fremd=[]; for(let i=0;i<V.MAX_TRASH;i++) fremd.push({id:hid('f',i), type:'note', title:'', notes:'', created:iso(1), updated:new Date(now+400*DAY).toISOString(), deleted:new Date(now+400*DAY).toISOString()});
    const inc=V.shapeIncoming(eigen, V.sanitizeEntries(fremd, now));
    ok(inc.every(e=>V.isWiped(e)),'shapeIncoming: eingehende Papierkorb-Einträge kommen nur als Löschmarke an (Inhalt ist gerätelokal)');
    const res=pipe(V.mergeEntries(eigen, inc).entries);
    ok(res.filter(e=>e.deleted&&!V.isWiped(e)).length===5,'Angriff 1 abgewehrt: alle 5 eigenen Papierkorb-Einträge behalten ihren Inhalt'); }

  // --- Angriff 2: 2000 fremde Löschmarken sollen die eigenen verdrängen (⇒ Wiederauferstehung) ---
  { const eigen=[mk({id:hid('d',1), title:'Live'})];
    for(let i=0;i<3;i++) eigen.push(V.tombstone({id:hid('e',i), created:iso(100)}, iso(5)));
    const fremd=[]; for(let i=0;i<V.MAX_TOMBSTONES;i++) fremd.push({id:hid('f',i), type:'login', title:'', created:iso(1), updated:new Date(now+400*DAY).toISOString(), deleted:new Date(now+400*DAY).toISOString()});
    const nachAngriff=pipe(V.mergeEntries(eigen, V.shapeIncoming(eigen, V.sanitizeEntries(fremd, now))).entries);
    ok(nachAngriff.filter(e=>e.id.startsWith('e')).length===3,'Angriff 2 abgewehrt: alle 3 eigenen Löschmarken überleben den Import');
    const backup=[]; for(let i=0;i<3;i++) backup.push(mk({id:hid('e',i), title:'Endgueltig'+i, pass:'SEED'+i, updated:iso(20)}));
    const final=pipe(V.mergeEntries(nachAngriff, V.shapeIncoming(nachAngriff, V.sanitizeEntries(backup, now))).entries);
    ok(final.filter(e=>!e.deleted&&e.id.startsWith('e')).length===0,'… und das eigene ältere Backup belebt danach NICHTS wieder'); }

  // --- Die Falle: der eigene Papierkorb muss den Rückweg vom Zweitgerät überleben ---
  { const A=[mk({id:hid('d',7), title:'Sparkasse', pass:'GEHEIM', deleted:iso(2), updated:iso(2)})];
    const aufB=V.shapeIncoming([], V.sanitizeEntries(A, now));
    ok(aufB.length===1&&V.isWiped(aufB[0]),'Zweitgerät bekommt nur die Löschmarke, nie den Inhalt');
    const zurueck=pipe(V.mergeEntries(A, V.shapeIncoming(A, V.sanitizeEntries(aufB, now))).entries);
    const behalten=zurueck.filter(e=>e.deleted&&!V.isWiped(e));
    ok(behalten.length===1&&behalten[0].pass==='GEHEIM','die zurückkehrende Marke verdrängt den EIGENEN Papierkorb-Eintrag nicht'); }

  // --- Die Löschung muss weiterhin propagieren ---
  { const A=[V.tombstone({id:hid('d',9), created:iso(50)}, iso(1))];
    const B=[mk({id:hid('d',9), title:'Alt', pass:'alt', updated:iso(30)})];
    const res=pipe(V.mergeEntries(B, V.shapeIncoming(B, V.sanitizeEntries(A, now))).entries);
    ok(!!res[0].deleted,'eine Löschung propagiert weiterhin vollständig (nur der Inhalt bleibt lokal)'); }
  { const A=[mk({id:hid('d',11), title:'Neu', pass:'neu', updated:iso(1)})];
    const B=[V.tombstone({id:hid('d',11), created:iso(50)}, iso(20))];
    const res=pipe(V.mergeEntries(B, V.shapeIncoming(B, V.sanitizeEntries(A, now))).entries);
    ok(!res[0].deleted&&res[0].pass==='neu','eine neuere Änderung schlägt weiterhin eine ältere Löschmarke');
    ok(V.mergeEntries(B, V.shapeIncoming(B, V.sanitizeEntries(A, now))).added===1,'… und wird als „neu“ gezählt'); }

  // --- purgeTombstones: Anzahlzweig darf keinen Inhalt mehr verwerfen ---
  { const l=[mk({id:hid('c',9), title:'Papierkorb', pass:'GEHEIM', deleted:iso(1), updated:iso(1)})];
    for(let i=0;i<V.MAX_TOMBSTONES+50;i++) l.push(V.tombstone({id:hid('f',i), created:iso(2)}, iso(0.5)));
    const out=V.purgeTombstones(l, now);
    const drin=out.find(e=>e.id===hid('c',9));
    ok(drin&&!V.isWiped(drin)&&drin.pass==='GEHEIM','purgeTombstones verwirft im Anzahlzweig keinen Papierkorb-Eintrag mit Inhalt');
    ok(out.filter(e=>e.deleted&&V.isWiped(e)).length===V.MAX_TOMBSTONES,'… und kappt die gewipten Marken weiterhin auf MAX_TOMBSTONES'); }

  // --- Merge-Zähler melden jetzt auch gelöscht → gelöscht ---
  { const loc=[mk({id:hid('c',11), title:'X', pass:'GEHEIM', deleted:iso(1), updated:iso(1)})];
    const inc=[V.tombFrom(loc[0])];
    const m=V.mergeEntries(loc, inc);
    ok(m.wiped===1&&m.added===0&&m.updated===0&&m.deleted===0,'Merge meldet eine gelöscht→gelöscht-Ersetzung als wiped (Audit run-5 #4)'); }

  // --- shapeIncoming ist rein und lässt lebende Einträge unangetastet ---
  { const live=[mk({id:hid('d',13), title:'Lebt'})], inc0=V.sanitizeEntries(live, now);
    const out=V.shapeIncoming([], inc0);
    ok(out.length===1&&out[0]===inc0[0],'shapeIncoming reicht lebende Einträge unverändert durch (identisch)'); }
}

console.log('\n[24] v1.9 Mehrfachauswahl: bulkEdit (rein, neues Array, nie gewipte Marken)');
{
  const DAY=86400000, now=Date.now(), NOW=new Date(now).toISOString();
  const iso=d=>new Date(now-d*DAY).toISOString();
  const hid=(p,i)=>(p+i.toString(16).padStart(10,'0')).padEnd(16,'0').slice(0,16);
  const mk=(o)=>V.sanitizeEntry(Object.assign({type:'login',title:'T',user:'u',pass:'p',created:iso(100),updated:iso(3)},o), now);
  const a=mk({id:hid('a',1),title:'A',cat:'Alt'}), b=mk({id:hid('b',2),title:'B',fav:true}), c=mk({id:hid('c',3),title:'C',deleted:iso(1),updated:iso(1)});
  const w=V.tombFrom(mk({id:hid('d',4),title:'',deleted:iso(2),updated:iso(2)}));   // gewipte Marke
  const list=[a,b,c,w];
  { const r=V.bulkEdit(list,[a.id,b.id,c.id,w.id],{deleted:true},NOW);
    ok(r.n===2&&r.entries!==list&&list.length===4&&list[0]===a,'Papierkorb: nur lebende zählen (2), neues Array, Eingabe unverändert');
    ok(r.entries[0].deleted===NOW&&r.entries[0].updated===NOW&&r.entries[0].pass==='p'&&r.entries[0].id===a.id,'gelöschter Eintrag behält Inhalt, deleted=updated=jetzt');
    ok(r.entries[2]===c&&r.entries[3]===w,'schon gelöschte und gewipte Objekte identisch durchgereicht');
    ok(V.isWiped(r.entries[3])&&!V.isWiped(r.entries[0]),'Marke bleibt Marke, Papierkorb-Eintrag ist keine'); }
  { const r=V.bulkEdit(list,new Set([a.id,c.id,w.id]),{deleted:null},NOW);
    ok(r.n===1&&r.entries[2].deleted===null&&r.entries[2].updated===NOW&&r.entries[2].title==='C','Rückgängig: nur Papierkorb-Einträge (1) werden lebend, updated=jetzt');
    ok(r.entries[0]===a&&r.entries[3]===w,'lebende und gewipte Objekte bleiben identisch'); }
  { const r=V.bulkEdit(list,[a.id,b.id,c.id],{cat:'  Neu'+String.fromCharCode(0)+'e  Kat  '},NOW);
    ok(r.n===2&&r.entries[0].cat==='Neue Kat'&&r.entries[1].cat==='Neue Kat'&&r.entries[2]===c,'Kategorie: nur lebende (2), line()-Bereinigung (Steuerzeichen, Leerraum), Papierkorb unberührt');
    ok(r.entries[0].updated===NOW&&r.entries[0].fav===false&&r.entries[1].fav===true,'Kategorie-Patch lässt fav unverändert, updated=jetzt');
    const long=V.bulkEdit(list,[a.id],{cat:'x'.repeat(200)},NOW); ok(long.entries[0].cat.length===V.CAPS.cat,'Kategorie auf CAPS.cat gekappt'); }
  { const r=V.bulkEdit(list,[a.id,b.id],{fav:true},NOW); ok(r.n===2&&r.entries[0].fav===true&&r.entries[1].fav===true&&r.entries[0].cat==='Alt','Favorit setzen: beide, Kategorie unverändert');
    const r2=V.bulkEdit(list,[a.id,b.id],{fav:'ja'},NOW); ok(r2.entries[0].fav===false&&r2.entries[1].fav===false,'fav nur bei echtem true, sonst false');
    const r3=V.bulkEdit(list,[hid('z',9)],{fav:true},NOW); ok(r3.n===0&&r3.entries===list,'unbekannte ID: n=0, Eingabe-Array identisch zurück'); }
  { const r=V.bulkEdit(list,[a.id],{deleted:true},NOW); const s=V.sanitizeEntries(r.entries, now);
    ok(s.length===4&&s.find(e=>e.id===a.id).pass==='p'&&V.isWiped(s.find(e=>e.id===w.id)),'Ergebnis übersteht sanitizeEntries (Papierkorb behält Inhalt, gewipte Marke bleibt Marke)'); }
}

console.log(`\n${pass} ok, ${fail} Fehler`); process.exit(fail?1:0);
