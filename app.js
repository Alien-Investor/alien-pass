"use strict";
/* Theme-Init vor dem ersten Render (app.js lädt synchron im <head>) */
(function(){var t=localStorage.getItem('alien-theme');if(t==='soft')document.documentElement.setAttribute('data-theme','soft');})();

/* ============================================================
   Alien Pass — Offline-Passwort-Manager. Alles client-side,
   kein Netz, kein Tracking. Schwester des Sachwert-Tresors.
   ============================================================ */
const LS_KEY = 'ai-pass-vault';
const LANG_KEY = 'ai-pass-lang';
const APP_VERSION = '1.0';

/* ============================ i18n ============================
   Deutsch = Original im HTML (data-i18n / -html / -ph). Englisch aus I18N.
   Dynamische JS-Strings aus T (beide Sprachen) via tr(). */
const I18N = {
  "tagline":"Passwords · local & encrypted · offline",
  "setup.title":"Set up vault",
  "setup.intro":"Choose a strong passphrase. It encrypts all passwords right on this device (Argon2id + AES-256-GCM). <strong>There is no backdoor and no reset</strong> — forget the passphrase and the data is gone.",
  "lbl.passphrase":"Passphrase",
  "setup.ph1":"min. 12 characters, better a word sequence",
  "setup.repeat":"Repeat passphrase",
  "setup.showpass":"Show passphrase (to double-check)",
  "setup.suggest":"Suggest passphrase (6 dice words)",
  "setup.kdf":"Key derivation (Argon2id)",
  "setup.kdfLight":"Light — 32 MiB (older devices)",
  "setup.kdfStd":"Standard — 64 MiB",
  "setup.kdfStrong":"Strong — 128 MiB",
  "setup.create":"Create vault",
  "lock.title":"Unlock vault",
  "lock.showpass":"Show passphrase",
  "lock.unlock":"Unlock",
  "tab.list":"Entries","tab.add":"New","tab.gen":"Generator","tab.backup":"Backup","tab.settings":"Settings",
  "list.search":"Search (title, user, URL)…",
  "add.titleNew":"New entry",
  "f.title":"Title *","f.titlePh":"e.g. Proton Mail","f.user":"Username / e-mail","f.pass":"Password","f.gen":"Generate",
  "f.showpass":"Show password","f.url":"URL / app","f.totp":"TOTP secret (optional)","f.totpPh":"Base32 secret or otpauth:// link",
  "f.notes":"Notes","f.fav":"Favourite (top of the list)","add.save":"Save","btn.cancel":"Cancel",
  "gen.title":"Password generator","gen.modeChars":"Characters","gen.modeWords":"Dice words",
  "gen.new":"Generate new","gen.copy":"Copy","gen.use":"Use in form","gen.len":"Length","gen.noamb":"no l/1/I/O/0",
  "gen.words":"Words","gen.sep":"Separator","gen.cap":"Capitalise","gen.num":"+ digit",
  "gen.effNote":"Word list: EFF Large Wordlist (7,776 words, ~12.9 bits per word). Six words ≈ 77 bits.",
  "bk.title":"Encrypted backup",
  "bk.intro":"The <code>.vault</code> file holds the whole vault <strong>encrypted</strong> (Argon2id + AES-256-GCM) — it only opens with the passphrase. Sync it between devices e.g. via Syncthing; nothing is ever exported in plaintext.",
  "bk.export":"Create backup (.vault)",
  "bk.importTitle":"Import backup (merge)",
  "bk.importIntro":"Merges a <code>.vault</code> file into this vault: per entry the <strong>newer change</strong> wins, deletions are applied. The file may use a different passphrase — your local one stays unchanged.",
  "bk.pick":"Choose .vault file","bk.filePass":"Passphrase of the file","bk.doImport":"Merge",
  "csv.title":"Migrate: import from another password manager",
  "csv.intro":"Detects CSV exports from <strong>Proton Pass</strong>, <strong>KeePassXC</strong> and <strong>Bitwarden</strong> automatically (other formats via matching column names). Entries with identical title, user and password are skipped.",
  "csv.pick":"Choose CSV file",
  "csv.warn":"⚠ The export file sits <strong>unencrypted</strong> on the device. Delete it right after importing (Downloads folder) — and don't leave the export lying around in the source manager either.",
  "set.secTitle":"Security","set.autolock":"Lock after inactivity","set.off":"Off",
  "set.al1":"1 minute","set.al2":"2 minutes","set.al5":"5 minutes","set.al15":"15 minutes",
  "set.bgLock":"Lock in background after","set.bg0":"immediately","set.bg30":"30 seconds","set.bg60":"1 minute","set.bg300":"5 minutes",
  "set.clip":"Clear clipboard after","set.c15":"15 seconds","set.c30":"30 seconds","set.c60":"1 minute","set.cOff":"only on lock (not recommended)",
  "set.clipNote":"Note: Android shows a system preview of the clipboard when copying and clears it by itself after one hour at the latest. The app additionally clears it after the chosen time, when you return to the app (once the time is up) and when it locks — while in the background it cannot access the clipboard.",
  "set.lockNow":"Lock now",
  "set.cpTitle":"Change passphrase","set.cpCur":"Current passphrase","set.cpNew":"New passphrase","set.cpRepeat":"Repeat","set.cpShow":"Show passphrases","set.cpBtn":"Change",
  "set.cpNote":"Changing the passphrase also rotates the internal data key. Backups exported earlier keep their old passphrase.",
  "set.themeTitle":"Appearance","set.themeDark":"Black (Neon)","set.themeSoft":"Soft (Navy)",
  "set.dangerTitle":"Danger zone","set.wipe":"Delete vault on this device",
  "set.wipeNote":"Removes the encrypted vault on <em>this</em> device only. Exported <code>.vault</code> files remain. No secure wiping of storage — the encryption takes care of that.",
  "foot.line1":"Alien Investor · Alien Pass · 100 % local · no cloud · no telemetry",
  "foot.line2":"Encryption: Argon2id · AES-256-GCM · WebCrypto · TOTP RFC 6238",
  "foot.donate":"Recharge energy · Donate",
  "help.closeX":"Close ✕","help.close":"Close","d.edit":"Edit","d.delete":"Delete",
  "help.title":"Manual",
  "help.h1":"What is Alien Pass?",
  "help.p1":"A <strong>local, encrypted password manager</strong>. Runs fully <strong>offline</strong> — no cloud, no server, no telemetry, no account. The Android app does not even have an internet permission. Your passwords never leave the device in plaintext.",
  "help.warn":"⚠ There is no reset and no backdoor. Forget your passphrase and the data is gone for good. Make regular backups and keep the passphrase safe.",
  "help.h2":"First steps",
  "help.l2":"<li><strong>Choose a passphrase</strong> — at least 12 characters, better six dice words (the suggest button builds them from the EFF list). Write it down and store it safely.</li><li>The <strong>key derivation</strong> (Argon2id) benchmarks itself during setup; “Standard” suits current phones.</li><li>Create entries: title, username, password (or generate one), URL, notes, optional TOTP.</li><li>Tap an entry → detail view with copy buttons. Passwords are only revealed on request.</li>",
  "help.h3":"Clipboard",
  "help.l3":"<li>Copied passwords are cleared by the app after the chosen time (default 30 s), when you return to the app and when it locks.</li><li>While the app is in the background it cannot touch the clipboard. Android clears it by itself after one hour at the latest.</li><li>Android briefly shows a system preview of the copied content. Suppressing it needs native code — planned for a later version.</li>",
  "help.h4":"Generator",
  "help.l4":"<li><strong>Characters:</strong> 8–64 characters from selectable sets; “no l/1/I/O/0” avoids mix-ups when typing.</li><li><strong>Dice words</strong> (Diceware): words from the EFF Large Wordlist, ~12.9 bits per word. Six words ≈ 77 bits — memorable and strong.</li><li>All randomness comes from the system generator without modulo bias; entropy is shown in bits.</li>",
  "help.h5":"TOTP (2FA codes)",
  "help.l5":"<li>Each entry can hold a TOTP secret (Base32 or <code>otpauth://</code> link). The detail view shows the current code with remaining time.</li><li>Supports SHA-1/SHA-256/SHA-512, 6–8 digits, any period.</li><li><strong>Keep in mind:</strong> password and 2FA in the same vault weaken factor separation. For critical accounts (e-mail, exchange) keep the second factor in Aegis.</li>",
  "help.h6":"Password health",
  "help.p6":"The list flags <strong>reused</strong> passwords, <strong>short</strong> ones (under 12 characters) and entries <strong>unchanged for over two years</strong> (any edit resets that clock). Everything is computed locally — there is no lookup in breach databases, because the app has no network.",
  "help.h7":"Backup & sync",
  "help.l7":"<li><strong>Create backup</strong> writes a <code>.vault</code> file (encrypted with your passphrase). It can safely go into Syncthing, onto a stick or into a backup.</li><li><strong>Import</strong> merges: per entry the newer change wins, deletions are carried over (for one year). The file may use a different passphrase — your local one stays.</li><li>With two devices: export on both regularly and import the other's backup. Both sides end up at the same state.</li><li>After a <strong>passphrase change</strong> older backups still open with their old passphrase.</li>",
  "help.h8":"Migrating from Proton Pass, KeePassXC, Bitwarden",
  "help.l8":"<li><strong>Proton Pass:</strong> Settings → Export → format CSV (unencrypted). Move the file to the phone, pick it in Alien Pass under Backup → CSV.</li><li><strong>KeePassXC:</strong> Database → Export → CSV file.</li><li><strong>Bitwarden:</strong> Tools → Export vault → format .csv.</li><li>Login entries come over with title, user, password, URL, notes and TOTP. Plain notes arrive without a password.</li><li><strong>Delete the CSV afterwards</strong> — it contains all passwords in plaintext.</li>",
  "help.h9":"Security in detail",
  "help.l9":"<li><strong>Key derivation:</strong> Argon2id (default 64 MiB, 3 passes) from your passphrase — memory-hard, so expensive for GPU attacks on a stolen file.</li><li><strong>Encryption:</strong> AES-256-GCM (WebCrypto). A random data key encrypts the vault; the passphrase only wraps that key. The file header is authenticated too — tampering is detected.</li><li><strong>Device:</strong> the Android app requests no Android permission at all (no internet, no storage, no sensors — the APK only carries the AndroidX-generated signature permission DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, which grants nothing), forbids screenshots and recents preview (FLAG_SECURE) and excludes itself from cloud, adb and device-to-device backups (backup rules).</li><li><strong>Locking:</strong> after inactivity, in the background after a chosen time (or immediately), and manually. Locking removes keys and all rendered data from memory.</li><li><strong>Third-party code:</strong> only the Argon2 library hash-wasm (MIT) and the EFF word list, both bundled and hash-checked in the build. No CDN, no tracker.</li><li><strong>Limits:</strong> no autofill, no biometrics (v1), no breach check. A passphrase cannot be recovered.</li>"
};
const T = {
  "err.setupShort":{de:"Mindestens 12 Zeichen.",en:"At least 12 characters."},
  "err.setupMismatch":{de:"Die Passphrasen stimmen nicht überein.",en:"Passphrases do not match."},
  "err.setupFailed":{de:"Einrichten fehlgeschlagen (WebCrypto/WASM nicht verfügbar?).",en:"Setup failed (WebCrypto/WASM unavailable?)."},
  "err.wrongPass":{de:"Falsche Passphrase oder beschädigter Tresor.",en:"Wrong passphrase or damaged vault."},
  "err.wait":{de:"Zu viele Fehlversuche — bitte {s} s warten.",en:"Too many failed attempts — wait {s} s."},
  "err.fileFormat":{de:"Keine gültige Alien-Pass-.vault-Datei.",en:"Not a valid Alien Pass .vault file."},
  "err.fileNewer":{de:"Die Datei stammt aus einer neueren App-Version. Bitte App aktualisieren.",en:"The file comes from a newer app version. Please update the app."},
  "err.fileBounds":{de:"Die Datei verlangt unzulässige Argon2-Parameter — Import abgelehnt.",en:"The file demands out-of-bounds Argon2 parameters — import refused."},
  "err.fileLarge":{de:"Datei zu groß.",en:"File too large."},
  "err.tooMany":{de:"Zu viele Einträge (max. 10.000).",en:"Too many entries (max. 10,000)."},
  "err.saveFailed":{de:"⚠ Speichern fehlgeschlagen — Änderung verworfen (Speicher voll?).",en:"⚠ Save failed — change discarded (storage full?)."},
  "err.titleReq":{de:"Bitte einen Titel angeben.",en:"Please enter a title."},
  "err.totpBad":{de:"TOTP-Schlüssel ungültig (Base32 oder otpauth://-Link erwartet).",en:"Invalid TOTP secret (expected Base32 or otpauth:// link)."},
  "err.cpShort":{de:"Neue Passphrase: mindestens 12 Zeichen.",en:"New passphrase: at least 12 characters."},
  "err.cpMismatch":{de:"Die neuen Passphrasen stimmen nicht überein.",en:"New passphrases do not match."},
  "err.cpWrong":{de:"Aktuelle Passphrase falsch.",en:"Current passphrase is wrong."},
  "busy.decrypting":{de:"Entschlüssele…",en:"Decrypting…"},
  "busy.creating":{de:"Erzeuge Schlüssel…",en:"Deriving key…"},
  "busy.changing":{de:"Ändere…",en:"Changing…"},
  "bench.run":{de:"Messe Argon2-Dauer auf diesem Gerät…",en:"Benchmarking Argon2 on this device…"},
  "bench.done":{de:"Standard (64 MiB) braucht hier ~{ms} ms je Entsperren.",en:"Standard (64 MiB) takes ~{ms} ms per unlock here."},
  "bench.light":{de:"Standard (64 MiB) braucht hier ~{ms} ms — „Leicht“ vorgewählt.",en:"Standard (64 MiB) takes ~{ms} ms here — “Light” preselected."},
  "bench.strong":{de:"Standard (64 MiB) braucht hier nur ~{ms} ms — „Stark“ vorgewählt.",en:"Standard (64 MiB) takes only ~{ms} ms here — “Strong” preselected."},
  "toast.vaultCreated":{de:"Tresor erstellt — Passphrase sicher aufbewahren!",en:"Vault created — keep the passphrase safe!"},
  "toast.autolocked":{de:"Automatisch gesperrt",en:"Locked automatically"},
  "toast.saved":{de:"Gespeichert",en:"Saved"},
  "toast.deleted":{de:"Eintrag gelöscht",en:"Entry deleted"},
  "toast.passChanged":{de:"Passphrase geändert, Datenschlüssel erneuert",en:"Passphrase changed, data key rotated"},
  "toast.suggest":{de:"Vorschlag eingetragen — jetzt aufschreiben!",en:"Suggestion filled in — write it down now!"},
  "toast.wordsMissing":{de:"Wortliste fehlt — Würfelwörter nicht verfügbar",en:"Word list missing — dice words unavailable"},
  "toast.noEntry":{de:"Kein Eintrag gewählt",en:"No entry selected"},
  "copy.done":{de:"{what} kopiert · wird in {s} s geleert",en:"{what} copied · cleared in {s} s"},
  "copy.doneNoClear":{de:"{what} kopiert",en:"{what} copied"},
  "copy.manual":{de:"Kopieren nicht möglich — bitte manuell markieren",en:"Copy not possible — please select manually"},
  "copy.empty":{de:"Nichts zu kopieren",en:"Nothing to copy"},
  "what.user":{de:"Nutzername",en:"Username"},"what.pass":{de:"Passwort",en:"Password"},"what.url":{de:"URL",en:"URL"},
  "what.totp":{de:"Code",en:"Code"},"what.gen":{de:"Passwort",en:"Password"},"what.notes":{de:"Notizen",en:"Notes"},
  "add.titleNew":{de:"Neuer Eintrag",en:"New entry"},
  "add.titleEdit":{de:"Eintrag bearbeiten",en:"Edit entry"},
  "list.empty":{de:"Noch keine Einträge.\nTippe auf + oder importiere unter „Sicherung“ aus Proton Pass, KeePassXC oder Bitwarden.",en:"No entries yet.\nTap + or import under “Backup” from Proton Pass, KeePassXC or Bitwarden."},
  "list.noMatch":{de:"Keine Treffer.",en:"No matches."},
  "health.ok":{de:"✓ Passwort-Gesundheit: keine Auffälligkeiten",en:"✓ Password health: nothing to report"},
  "health.bad":{de:"⚠ {r} wiederverwendet · {w} kurz · {o} lange unverändert",en:"⚠ {r} reused · {w} short · {o} long unchanged"},
  "badge.reused":{de:"doppelt",en:"reused"},"badge.weak":{de:"kurz",en:"short"},"badge.old":{de:"unverändert >2 J.",en:"unchanged >2 y"},
  "d.user":{de:"Nutzername / E-Mail",en:"Username / e-mail"},"d.pass":{de:"Passwort",en:"Password"},"d.url":{de:"URL / App",en:"URL / app"},
  "d.totp":{de:"TOTP-Code",en:"TOTP code"},"d.notes":{de:"Notizen",en:"Notes"},
  "d.show":{de:"Anzeigen",en:"Show"},"d.hide":{de:"Verbergen",en:"Hide"},"d.copy":{de:"Kopieren",en:"Copy"},
  "d.meta":{de:"Angelegt {c} · Geändert {u}",en:"Created {c} · Updated {u}"},
  "d.fav":{de:"★ Favorit",en:"★ Favourite"},"d.unfav":{de:"☆ Kein Favorit",en:"☆ Not a favourite"},
  "confirm.delete":{de:"Eintrag „{t}“ wirklich löschen? (Wird beim Sync auf andere Geräte übernommen.)",en:"Really delete “{t}”? (Deletion syncs to other devices.)"},
  "confirm.wipe":{de:"Den Tresor auf diesem Gerät wirklich löschen? Ohne Backup sind alle Passwörter weg.",en:"Really delete the vault on this device? Without a backup all passwords are gone."},
  "confirm.bigKdf":{de:"Die Datei verlangt {m} MiB Arbeitsspeicher für Argon2 — das kann auf dem Handy abstürzen. Trotzdem versuchen?",en:"The file demands {m} MiB of memory for Argon2 — this may crash on a phone. Try anyway?"},
  "gen.bits":{de:"≈ {b} Bit Entropie",en:"≈ {b} bits of entropy"},
  "gen.noset":{de:"Mindestens einen Zeichensatz wählen.",en:"Select at least one character set."},
  "bk.done":{de:"Backup gespeichert: {n}",en:"Backup saved: {n}"},
  "bk.doneNative":{de:"Backup geschrieben nach Dokumente: {n}",en:"Backup written to Documents: {n}"},
  "bk.failed":{de:"Backup fehlgeschlagen: {e}",en:"Backup failed: {e}"},
  "bk.none":{de:"⚠ Noch kein Backup. Sicherung → Backup erstellen.",en:"⚠ No backup yet. Backup → Create backup."},
  "bk.stale":{de:"⚠ Letztes Backup vor {d} Tagen — seitdem {n} Änderung(en).",en:"⚠ Last backup {d} days ago — {n} change(s) since."},
  "bk.readErr":{de:"Datei konnte nicht gelesen werden.",en:"Could not read the file."},
  "bk.merged":{de:"Zusammengeführt: {a} neu, {u} aktualisiert, {d} gelöscht ({t} Löschmarken in der Datei).",en:"Merged: {a} new, {u} updated, {d} deleted ({t} deletion markers in the file)."},
  "bk.mergeFail":{de:"Falsche Passphrase oder beschädigte Datei.",en:"Wrong passphrase or damaged file."},
  "csv.unknown":{de:"Format nicht erkannt — Kopfzeile braucht mindestens Titel/Name und Passwort.",en:"Format not recognised — header needs at least title/name and password."},
  "csv.done":{de:"{n} Einträge importiert ({f}), {s} Dubletten übersprungen, {b} Zeilen unbrauchbar. Jetzt die CSV-Datei löschen!",en:"{n} entries imported ({f}), {s} duplicates skipped, {b} rows unusable. Delete the CSV file now!"},
  "csv.empty":{de:"Keine Datenzeilen gefunden.",en:"No data rows found."},
  "fmt.proton":{de:"Proton Pass",en:"Proton Pass"},"fmt.keepassxc":{de:"KeePassXC",en:"KeePassXC"},"fmt.bitwarden":{de:"Bitwarden",en:"Bitwarden"},"fmt.generic":{de:"generisches CSV",en:"generic CSV"},
  "about":{de:"Alien Pass v{v} · Argon2id m={m} MiB t={t} p={p} · AES-256-GCM",en:"Alien Pass v{v} · Argon2id m={m} MiB t={t} p={p} · AES-256-GCM"},
  "pass.s0":{de:"zu kurz (mind. 12 Zeichen)",en:"too short (min. 12 characters)"},
  "pass.s1":{de:"okay — länger ist besser",en:"okay — longer is better"},
  "pass.s2":{de:"stark",en:"strong"},
  "pass.s3":{de:"sehr stark",en:"very strong"},
  "nocrypto":{de:"Dieser Browser unterstützt kein WebCrypto/WebAssembly oder läuft nicht im sicheren Kontext. Bitte die App verwenden oder die Seite über https:// bzw. localhost öffnen.",en:"This browser lacks WebCrypto/WebAssembly or is not a secure context. Please use the app or open the page via https:// or localhost."}
};
const _qsLang = new URLSearchParams(window.location.search).get('lang');
let LANG = (_qsLang==='de'||_qsLang==='en') ? _qsLang
  : (['de','en'].includes(localStorage.getItem(LANG_KEY)) ? localStorage.getItem(LANG_KEY) : ((navigator.language||'de').toLowerCase().indexOf('de')===0?'de':'en'));
const _i18nCache = new WeakMap();
function tr(key, params){ const e=T[key]; let s=e?(e[LANG]!==undefined?e[LANG]:e.de):key; if(params) for(const k in params) s=s.split('{'+k+'}').join(String(params[k])); return s; }
function applyI18n(){
  document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-ph]').forEach(el=>{
    let c=_i18nCache.get(el); if(!c){ c={}; _i18nCache.set(el,c); }
    [['data-i18n','textContent'],['data-i18n-html','innerHTML'],['data-i18n-ph','placeholder']].forEach(([attr,prop])=>{
      const key=el.getAttribute(attr); if(!key) return;
      if(c[prop]===undefined) c[prop]=el[prop];
      const en=I18N[key];
      el[prop]=(LANG==='en'&&en!==undefined)?en:c[prop];
    });
  });
  document.documentElement.setAttribute('lang',LANG);
  const lb=document.getElementById('lang-btn'); if(lb) lb.textContent=(LANG==='de'?'DE':'EN');
}
function setLang(l){ LANG=l; try{localStorage.setItem(LANG_KEY,l);}catch(_){ } applyI18n(); if(typeof App!=='undefined'&&App.relabel) App.relabel(); }

/* === VAULT-FORMAT BEGIN ===
   Reine Funktionen ohne DOM: Bytes/Base64/Base32, Zufall, Argon2id-Schlüsselhierarchie,
   Dateiformat AIPV1, Sanitizer, Merge, TOTP, Generator, CSV-Parser + Import-Mapping.
   roundtrip-test.mjs evaluiert GENAU diesen Textabschnitt in Node (keine Nachbildung). */
const enc = new TextEncoder(), dec = new TextDecoder();
function bufToB64(buf){let b='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i++)b+=String.fromCharCode(u[i]);return btoa(b);}
function b64ToBuf(b64){const s=atob(b64);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;}
function b64Bytes(s){ if(typeof s!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null; try{ return new Uint8Array(b64ToBuf(s)); }catch(_){ return null; } }
const B32A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes){let bits=0,val=0,out='';for(const b of bytes){val=(val<<8)|b;bits+=8;while(bits>=5){out+=B32A[(val>>>(bits-5))&31];bits-=5;}}if(bits>0)out+=B32A[(val<<(5-bits))&31];return out;}
function base32Decode(str){str=str.toUpperCase().replace(/=+$/,'').replace(/\s/g,'');let bits=0,val=0;const out=[];for(const c of str){const idx=B32A.indexOf(c);if(idx<0)continue;val=(val<<5)|idx;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&0xff);bits-=8;}}return new Uint8Array(out);}
function rand(n){ return crypto.getRandomValues(new Uint8Array(n)); }
// Gleichverteilt in [0,n) ohne Modulo-Bias (Rejection-Sampling über 32-Bit-Werte)
function randInt(n){ if(!Number.isInteger(n)||n<=0||n>0x100000000) throw new Error('range'); const limit=Math.floor(0x100000000/n)*n; const buf=new Uint32Array(1); for(;;){ crypto.getRandomValues(buf); if(buf[0]<limit) return buf[0]%n; } }
function cryptoId(){ return Array.from(rand(8),b=>b.toString(16).padStart(2,'0')).join(''); }
function passBytes(p){ return enc.encode(String(p).normalize('NFKC')); }

/* ---------- Dateiformat AIPV1 + Schlüsselhierarchie ----------
   KEK = Argon2id(Passphrase) verpackt den zufälligen DEK (AES-KW-frei: AES-GCM wrapKey mit AAD).
   AAD bindet magic/ver/KDF-Parameter/Salt + Rolle (wrap|body) — aus DEKODIERTEN Werten kanonisch
   erzeugt, auf Lese- UND Schreibpfad identisch. */
const MAGIC='AIPV1', FILE_VER=1;
const KDF_DEFAULT={m:65536,t:3,p:1};
const KDF_BOUNDS={mMin:8192,mMax:262144,tMin:1,tMax:16,pMin:1,pMax:4,budget:786432};
const KDF_CONFIRM_M=131072;
const MAX_FILE_BYTES=20*1024*1024, MAX_ENTRIES=10000;
function kdfOk(k){ const B=KDF_BOUNDS; return !!k && Number.isInteger(k.m)&&Number.isInteger(k.t)&&Number.isInteger(k.p)
  && k.m>=B.mMin&&k.m<=B.mMax && k.t>=B.tMin&&k.t<=B.tMax && k.p>=B.pMin&&k.p<=B.pMax && k.m*k.t<=B.budget; }
function aad(kdf, role){ return enc.encode(`${MAGIC}|${FILE_VER}|argon2id|${kdf.m}|${kdf.t}|${kdf.p}|${bufToB64(kdf.salt)}|${role}`); }
async function argon2Raw(pass, kdf){
  if(!kdfOk(kdf)) throw new Error('kdfbounds');
  const raw=await globalThis.hashwasm.argon2id({password:pass, salt:kdf.salt, parallelism:kdf.p, iterations:kdf.t, memorySize:kdf.m, hashLength:32, outputType:'binary'});
  if(pass instanceof Uint8Array) pass.fill(0);
  return raw;
}
async function deriveKek(pass, kdf){
  const raw=await argon2Raw(pass, kdf);
  const key=await crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['wrapKey','unwrapKey']);
  raw.fill(0); return key;
}
function newDek(){ return crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt','decrypt']); }
async function wrapDek(dek, kek, kdf){ const iv=rand(12); const ct=new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, {name:'AES-GCM', iv, additionalData:aad(kdf,'wrap')})); return {iv, ct}; }
function unwrapDek(wrap, kek, kdf, extractable){ return crypto.subtle.unwrapKey('raw', wrap.ct, kek, {name:'AES-GCM', iv:wrap.iv, additionalData:aad(kdf,'wrap')}, {name:'AES-GCM',length:256}, !!extractable, ['encrypt','decrypt']); }
async function encryptBody(obj, dek, kdf){ const iv=rand(12); const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(kdf,'body')}, dek, enc.encode(JSON.stringify(obj)))); return {iv,ct}; }
async function decryptBody(body, dek, kdf){ const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:body.iv,additionalData:aad(kdf,'body')}, dek, body.ct); return JSON.parse(dec.decode(pt)); }
function serializeFile(kdf, wrap, body){
  return JSON.stringify({magic:MAGIC, ver:FILE_VER,
    kdf:{name:'argon2id', m:kdf.m, t:kdf.t, p:kdf.p, salt:bufToB64(kdf.salt)},
    wrap:{iv:bufToB64(wrap.iv), ct:bufToB64(wrap.ct)},
    body:{iv:bufToB64(body.iv), ct:bufToB64(body.ct)}});
}
// Prüft Struktur + Grenzen VOR jeder KDF-Arbeit. Wirft Error('format'|'newer'|'kdfbounds'|'toolarge').
function parseFile(raw){
  if(typeof raw!=='string') throw new Error('format');
  if(raw.length>MAX_FILE_BYTES) throw new Error('toolarge');
  let f; try{ f=JSON.parse(raw); }catch(_){ throw new Error('format'); }
  if(!f||typeof f!=='object'||f.magic!==MAGIC) throw new Error('format');
  if(f.ver!==FILE_VER) throw new Error((Number.isInteger(f.ver)&&f.ver>FILE_VER)?'newer':'format');
  const k=f.kdf; if(!k||typeof k!=='object'||k.name!=='argon2id') throw new Error('format');
  const kdf={m:k.m, t:k.t, p:k.p, salt:b64Bytes(k.salt)};
  if(!kdf.salt||kdf.salt.length!==16) throw new Error('format');
  if(!kdfOk(kdf)) throw new Error('kdfbounds');
  const wrap={iv:b64Bytes(f.wrap&&f.wrap.iv), ct:b64Bytes(f.wrap&&f.wrap.ct)};
  const body={iv:b64Bytes(f.body&&f.body.iv), ct:b64Bytes(f.body&&f.body.ct)};
  if(!wrap.iv||wrap.iv.length!==12||!wrap.ct||wrap.ct.length!==48) throw new Error('format');
  if(!body.iv||body.iv.length!==12||!body.ct||body.ct.length<16) throw new Error('format');
  return {kdf, wrap, body};
}

/* ---------- Vault-Objekt, Sanitizer, Merge ---------- */
const VAULT_VERSION=1;
const SETTINGS_ALLOWED={autolock:[0,1,2,5,15], bgLock:[0,30,60,300], clipClear:[0,15,30,60]};
const SETTINGS_DEFAULT={autolock:2, bgLock:30, clipClear:30};
const TOMBSTONE_DAYS=365, MAX_TOMBSTONES=2000;   // Löschmarken zählen NICHT zum Eintrags-Cap, sind aber separat begrenzt
function emptyVault(){ return {version:VAULT_VERSION, entries:[], settings:Object.assign({},SETTINGS_DEFAULT), meta:{lastBackup:null, lastBackupCount:0}}; }
const ID_RE=/^[0-9a-f]{16}$/;
const CAPS={title:200,user:200,pass:1000,url:2000,notes:10000,issuer:100,label:200};
function str(v,cap){ return typeof v==='string' ? v.slice(0,cap) : ''; }
function isoOrNull(v){ if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)) return null; const t=Date.parse(v); return Number.isFinite(t)?new Date(t).toISOString():null; }
function parseOtpauth(uri){
  let u; try{ u=new URL(uri); }catch(_){ return null; }
  if(u.protocol!=='otpauth:'||u.host.toLowerCase()!=='totp') return null;
  let label=''; try{ label=decodeURIComponent(u.pathname.replace(/^\/+/,'')); }catch(_){ label=u.pathname.replace(/^\/+/,''); }
  const q=u.searchParams; let issuer=q.get('issuer')||''; if(!issuer&&label.includes(':')) issuer=label.split(':')[0];
  return {secret:q.get('secret')||'', algorithm:q.get('algorithm')||'SHA1', digits:q.get('digits')||6, period:q.get('period')||30, issuer, label};
}
// Normalisiert String (Base32 oder otpauth://) oder Objekt → {secret,algorithm,digits,period,issuer,label} | null
function normalizeTotp(v){
  let o=null;
  if(typeof v==='string'){ const s=v.trim(); if(!s) return null; o=/^otpauth:\/\//i.test(s)?parseOtpauth(s):{secret:s}; }
  else if(v&&typeof v==='object'&&!Array.isArray(v)) o={secret:v.secret, algorithm:v.algorithm, digits:v.digits, period:v.period, issuer:v.issuer, label:v.label};
  if(!o||typeof o.secret!=='string') return null;
  const secret=o.secret.toUpperCase().replace(/[\s=-]/g,'');
  if(!/^[A-Z2-7]{8,256}$/.test(secret)) return null;
  const alg=String(o.algorithm==null?'SHA1':o.algorithm).toUpperCase().replace('-','');
  if(!['SHA1','SHA256','SHA512'].includes(alg)) return null;
  const digits=o.digits==null||o.digits===''?6:Number(o.digits); if(![6,7,8].includes(digits)) return null;
  const period=o.period==null||o.period===''?30:Number(o.period); if(!Number.isInteger(period)||period<15||period>300) return null;
  return {secret, algorithm:alg, digits, period, issuer:str(o.issuer,CAPS.issuer), label:str(o.label,CAPS.label)};
}
function otpauthUri(t){ const lbl=encodeURIComponent(t.label||t.issuer||'Alien Pass'); let s=`otpauth://totp/${lbl}?secret=${t.secret}`; if(t.issuer) s+=`&issuer=${encodeURIComponent(t.issuer)}`; if(t.algorithm!=='SHA1') s+=`&algorithm=${t.algorithm}`; if(t.digits!==6) s+=`&digits=${t.digits}`; if(t.period!==30) s+=`&period=${t.period}`; return s; }
// Whitelist: baut ein frisches Objekt; ungültige ID → null (Aufrufer verwirft). Tombstones sind inhaltsleer.
function sanitizeEntry(e, now){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const id=typeof e.id==='string'?e.id.toLowerCase():''; if(!ID_RE.test(id)) return null;
  now=now||Date.now(); const maxT=now+120000, EPOCH='1970-01-01T00:00:00.000Z';
  let created=isoOrNull(e.created), updated=isoOrNull(e.updated), deleted=e.deleted==null||e.deleted===false?null:isoOrNull(e.deleted);
  if(!updated) updated=EPOCH;
  if(!created) created=updated;
  const tc=Math.min(Date.parse(created),maxT); let tu=Math.min(Date.parse(updated),maxT); if(tu<tc) tu=tc;
  created=new Date(tc).toISOString(); updated=new Date(tu).toISOString();
  if(e.deleted&&!deleted) deleted=updated;                       // "gelöscht" ohne brauchbares Datum → Änderungsdatum
  if(deleted){ deleted=new Date(Math.min(Date.parse(deleted),maxT)).toISOString();
    return {id, title:'', user:'', pass:'', url:'', notes:'', totp:null, fav:false, created, updated, deleted}; }
  return {id, title:str(e.title,CAPS.title), user:str(e.user,CAPS.user), pass:str(e.pass,CAPS.pass), url:str(e.url,CAPS.url),
          notes:str(e.notes,CAPS.notes), totp:normalizeTotp(e.totp), fav:e.fav===true, created, updated, deleted:null};
}
// Kanonische Serialisierung ALLER Ebenen (Array-Replacer von JSON.stringify wäre nur eine Allowlist → totp:{})
function canon(v){ if(v===undefined||v===null||typeof v!=='object') return JSON.stringify(v===undefined?null:v); if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}'; }
const liveCount=list=>list.reduce((n,e)=>n+(e.deleted?0:1),0);
function ts(v){ const t=Date.parse(v); return Number.isFinite(t)?t:0; }
// Deterministischer Gewinner: neueres updated; Gleichstand → Tombstone; sonst größerer kanonischer JSON-String.
function winner(a,b){ const ta=ts(a.updated), tb=ts(b.updated); if(ta!==tb) return ta>tb?a:b; if(!!a.deleted!==!!b.deleted) return a.deleted?a:b; return canon(a)>=canon(b)?a:b; }
function dedupeEntries(list){ const m=new Map(); for(const e of list){ const cur=m.get(e.id); m.set(e.id, cur?winner(cur,e):e); } return [...m.values()]; }
// Cap gilt nur für LIVE-Einträge; Tombstones werden gepurgt/gekappt statt gezählt (sonst könnte eine
// fremde Datei den Tresor mit unsichtbaren Löschmarken bis an den Cap füllen und der nächste eigene Eintrag brickt ihn).
function sanitizeEntries(list, now){ if(!Array.isArray(list)) return []; if(list.length>MAX_ENTRIES*4) throw new Error('toomany'); const out=[]; for(const e of list){ const s=sanitizeEntry(e,now); if(s) out.push(s); } const d=purgeTombstones(dedupeEntries(out), now); if(liveCount(d)>MAX_ENTRIES) throw new Error('toomany'); return d; }
function sanitizeSettings(s){ const o={}; for(const k in SETTINGS_DEFAULT){ const v=s&&typeof s==='object'?Number(s[k]):NaN; o[k]=SETTINGS_ALLOWED[k].includes(v)?v:SETTINGS_DEFAULT[k]; } return o; }
function sanitizeVault(v, now){
  if(!v||typeof v!=='object') throw new Error('format');
  const meta=v.meta&&typeof v.meta==='object'?v.meta:{};
  return {version:VAULT_VERSION, entries:sanitizeEntries(v.entries, now), settings:sanitizeSettings(v.settings),
          meta:{lastBackup:isoOrNull(meta.lastBackup), lastBackupCount:Number.isInteger(meta.lastBackupCount)?meta.lastBackupCount:0}};
}
// Merge (kommutativ, assoziativ, idempotent) — Ergebnis + Zähler. incoming ist bereits sanitisiert.
function mergeEntries(local, incoming){
  const map=new Map(); for(const e of local) map.set(e.id,e);
  let added=0, updated=0, deleted=0;
  for(const inc of dedupeEntries(incoming)){
    const loc=map.get(inc.id);
    if(!loc){ map.set(inc.id,inc); if(!inc.deleted) added++; continue; }
    const w=winner(loc,inc); if(w===loc) continue;
    map.set(inc.id,inc); if(inc.deleted&&!loc.deleted) deleted++; else if(!inc.deleted) updated++;
  }
  return {entries:[...map.values()], added, updated, deleted, tombstonesIn:incoming.reduce((n,e)=>n+(e.deleted?1:0),0)};
}
function purgeTombstones(entries, now){ now=now||Date.now(); const kept=entries.filter(e=>!e.deleted || now-ts(e.deleted) < TOMBSTONE_DAYS*86400000);
  const tombs=kept.filter(e=>e.deleted); if(tombs.length<=MAX_TOMBSTONES) return kept;
  tombs.sort((a,b)=>ts(b.deleted)-ts(a.deleted)); const keep=new Set(tombs.slice(0,MAX_TOMBSTONES).map(e=>e.id)); return kept.filter(e=>!e.deleted||keep.has(e.id)); }
function tombstone(e, nowIso){ return {id:e.id, title:'', user:'', pass:'', url:'', notes:'', totp:null, fav:false, created:e.created, updated:nowIso, deleted:nowIso}; }

/* ---------- TOTP (RFC 6238; SHA1/256/512, 6–8 Stellen, Periode) ---------- */
async function totpCode(t, forTime){
  const counter=Math.floor((forTime==null?Date.now():forTime)/1000/t.period);
  const hash={SHA1:'SHA-1',SHA256:'SHA-256',SHA512:'SHA-512'}[t.algorithm];
  const k=await crypto.subtle.importKey('raw', base32Decode(t.secret), {name:'HMAC',hash}, false, ['sign']);
  const msg=new Uint8Array(8), dv=new DataView(msg.buffer); dv.setUint32(0,Math.floor(counter/4294967296)); dv.setUint32(4,counter>>>0);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',k,msg));
  const off=sig[sig.length-1]&0xf;
  const bin=((sig[off]&0x7f)<<24)|(sig[off+1]<<16)|(sig[off+2]<<8)|sig[off+3];
  return String(bin%Math.pow(10,t.digits)).padStart(t.digits,'0');
}
function totpRemaining(t, forTime){ const s=Math.floor((forTime==null?Date.now():forTime)/1000); return t.period-(s%t.period); }

/* ---------- Generator ---------- */
const SETS={upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower:'abcdefghijklmnopqrstuvwxyz', digits:'0123456789', symbols:'!@#$%&*()-_=+[]{}:,.?'};
const AMBIG=/[l1IO0]/g;
function genChars(len, opts){
  len=Math.min(64,Math.max(8,len|0)); const groups=[]; let pool='';
  for(const k of ['upper','lower','digits','symbols']) if(opts[k]){ let s=SETS[k]; if(opts.noamb) s=s.replace(AMBIG,''); pool+=s; groups.push(s); }
  if(!pool) return {pw:'', bits:0};
  for(let tries=0;tries<100;tries++){ let out=''; for(let i=0;i<len;i++) out+=pool[randInt(pool.length)];
    if(groups.every(g=>Array.from(out).some(c=>g.includes(c)))) return {pw:out, bits:Math.round(len*Math.log2(pool.length))}; }
  return {pw:'', bits:0};
}
function genWords(n, sep, cap, num){
  const W=globalThis.EFF_WORDS; if(!Array.isArray(W)||W.length!==7776) return {pw:'', bits:0};
  n=Math.min(10,Math.max(4,n|0)); const words=[];
  for(let i=0;i<n;i++){ let w=W[randInt(7776)]; if(cap) w=w[0].toUpperCase()+w.slice(1); words.push(w); }
  let bits=n*Math.log2(7776);
  if(num){ const pos=randInt(n); words[pos]+=String(randInt(10)); bits+=Math.log2(10*n); }
  return {pw:words.join(sep==null?'-':sep), bits:Math.round(bits)};
}
function passStrength(p){ const words=p.trim().split(/[\s\-_.,;]+/).filter(w=>w.length>=3).length, len=p.length; if(len<12) return 0; if(len>=24||(len>=18&&words>=4)) return 3; if(len>=16||words>=3) return 2; return 1; }

/* ---------- CSV (RFC 4180) + Import-Mapping ---------- */
function parseCsv(text, delim){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  delim=delim||','; const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ field+='"'; i++; } else q=false; } else field+=c; }
    else if(c==='"'&&field===''){ q=true; }               // Anführungszeichen nur am Feldanfang öffnen, mitten im Feld literal
    else if(c===delim){ row.push(field); field=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(field); field=''; rows.push(row); row=[]; }
    else field+=c; }
  if(field!==''||row.length){ row.push(field); rows.push(row); }
  return rows.filter(r=>!(r.length===1&&r[0].trim()===''));
}
function csvMap(header){
  const h=header.map(x=>String(x).trim().toLowerCase()); const idx=n=>h.indexOf(n), has=n=>idx(n)>=0;
  if(has('login_username')&&has('login_password')) return {fmt:'bitwarden', title:idx('name'), user:idx('login_username'), pass:idx('login_password'), url:idx('login_uri'), notes:idx('notes'), totp:idx('login_totp'), type:idx('type'), fav:idx('favorite')};
  if(has('type')&&has('name')&&has('password')&&(has('email')||has('username'))) return {fmt:'proton', title:idx('name'), user:idx('username'), email:idx('email'), pass:idx('password'), url:idx('url'), notes:idx('note'), totp:idx('totp'), type:idx('type'), created:idx('createtime'), updated:idx('modifytime')};
  if(has('title')&&has('password')&&has('username')) return {fmt:'keepassxc', title:idx('title'), user:idx('username'), pass:idx('password'), url:idx('url'), notes:idx('notes'), totp:idx('totp'), group:idx('group'), created:idx('created'), updated:idx('last modified')};
  const find=(...names)=>{ for(const n of names){ const i=idx(n); if(i>=0) return i; } return -1; };
  const m={fmt:'generic', title:find('title','name','account','site','titel','bezeichnung','konto'), user:find('username','user','login','email','login_name','benutzername','benutzer','anmeldename','e-mail'), pass:find('password','pass','login_password','passwort','kennwort'), url:find('url','website','uri','web site','login_uri','webseite','adresse'), notes:find('notes','note','comment','extra','notizen','notiz','kommentar'), totp:find('totp','otp','otpauth','login_totp','2fa')};
  if(m.title<0&&m.url>=0) m.title=m.url;                    // ohne Titelspalte dient die URL als Titel
  return (m.title>=0&&m.pass>=0)?m:null;
}
function csvDate(s, now){ s=String(s||'').trim(); if(!s) return new Date(now).toISOString(); if(/^\d{9,11}$/.test(s)) return new Date(Number(s)*1000).toISOString(); if(/^\d{12,14}$/.test(s)) return new Date(Number(s)).toISOString(); const t=Date.parse(s); return Number.isFinite(t)?new Date(t).toISOString():new Date(now).toISOString(); }
// Zeile → sanitisierter Eintrag (neue ID) oder null (Typ nicht übernommen / unbrauchbar)
function csvRowToEntry(m, row, now){
  const g=i=>(i>=0&&i<row.length)?String(row[i]):'';
  if(m.type>=0){ const t=g(m.type).trim().toLowerCase();
    if(m.fmt==='bitwarden'&&t!=='login'&&t!=='note') return null;
    if(m.fmt==='proton'&&!['login','note','alias'].includes(t)) return null; }
  let user=g(m.user), notes=g(m.notes);
  if(m.fmt==='proton'){ const email=g(m.email); if(!user) user=email; else if(email&&email!==user) notes=(notes?notes+'\n':'')+'E-Mail: '+email; }
  if(m.group>=0){ const grp=g(m.group).trim(); if(grp&&grp!=='Root') notes=(notes?notes+'\n':'')+'Gruppe: '+grp; }
  const title=g(m.title).trim()||g(m.url).trim()||user.trim();
  if(!title) return null;
  const created=csvDate(m.created>=0?g(m.created):'', now), updated=csvDate(m.updated>=0?g(m.updated):'', now);
  return sanitizeEntry({id:cryptoId(), title, user, pass:g(m.pass), url:g(m.url), notes, totp:g(m.totp)||null,
    fav:m.fav>=0&&g(m.fav).trim()==='1', created, updated, deleted:null}, now);
}
/* === VAULT-FORMAT END === */

/* ============================================================
   App
   ============================================================ */
const App = (function(){
  let DEK=null, KDF=null, WRAP=null, VAULT=null;      // Sitzungszustand — auf lock() alles null
  let editId=null, currentId=null, genMode='chars', genValue='', search='';
  let totpTimer=null, lastCode='', clipTimer=null, clipOwnedAt=0, failCount=0, lockedUntil=0, pendingImport=null, kdfTouched=false;

  const $ = id => document.getElementById(id);
  const show = id => $(id).classList.remove('hidden');
  const hide = id => $(id).classList.add('hidden');
  function screen(name){ ['setup','lock','app'].forEach(s=>$('screen-'+s).classList.add('hidden')); $('screen-'+name).classList.remove('hidden'); }
  function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2600); }
  function err(id,msg){ const e=$(id); if(!msg){ e.classList.add('hidden'); e.textContent=''; return; } e.textContent=msg; e.classList.remove('hidden'); }
  function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
  const nowIso=()=>new Date().toISOString();
  const live=()=>VAULT?VAULT.entries.filter(e=>!e.deleted):[];
  const byId=id=>VAULT?VAULT.entries.find(e=>e.id===id&&!e.deleted):null;
  const fmtDate=iso=>{ const t=ts(iso); return t?new Date(t).toLocaleDateString(LANG==='de'?'de-DE':'en-GB'):'—'; };

  /* ---------- persistence ---------- */
  async function persist(){
    const dek=DEK, kdf=KDF, wrap=WRAP, vault=VAULT;          // Schlüssel-Generation pinnen (lock/changePass während des await)
    const entries=purgeTombstones(vault.entries);              // Purge erst NACH erfolgreichem Schreiben committen
    const body=await encryptBody(Object.assign({},vault,{entries}), dek, kdf);
    const s=serializeFile(kdf, wrap, body);
    try{ localStorage.setItem(LS_KEY, s); }
    catch(e){ toast(tr('err.saveFailed')); throw e; }
    if(VAULT===vault) vault.entries=entries;
  }
  function fileErrMsg(e){ const c=e&&e.message; return tr(c==='newer'?'err.fileNewer':c==='kdfbounds'?'err.fileBounds':c==='toolarge'?'err.fileLarge':c==='toomany'?'err.tooMany':'err.fileFormat'); }

  /* ---------- boot / setup / unlock / lock ---------- */
  function boot(){
    const raw=localStorage.getItem(LS_KEY);
    if(!raw){ screen('setup'); setTimeout(()=>$('setup-pass1').focus(),100); benchKdf(); }
    else { screen('lock'); setTimeout(()=>$('lock-pass').focus(),100); }
    const soft=document.documentElement.getAttribute('data-theme')==='soft';
    $('th-dark').classList.toggle('on',!soft); $('th-soft').classList.toggle('on',soft);
  }
  async function benchKdf(){
    if(benchKdf._done) return; benchKdf._done=true;
    $('setup-bench').textContent=tr('bench.run');
    await new Promise(r=>setTimeout(r,250));
    try{
      const t0=performance.now();
      await argon2Raw(passBytes('alien-pass-benchmark'), {m:KDF_DEFAULT.m,t:KDF_DEFAULT.t,p:KDF_DEFAULT.p,salt:rand(16)});
      const ms=Math.round(performance.now()-t0);
      let key='bench.done';
      if(!kdfTouched){ if(ms>2500){ $('setup-kdf').value='32768'; key='bench.light'; } else if(ms<400){ $('setup-kdf').value='131072'; key='bench.strong'; } }
      $('setup-bench').textContent=tr(key,{ms});
    }catch(_){ $('setup-bench').textContent=''; }
  }
  async function doSetup(){
    if(doSetup._busy) return; err('setup-err');
    const p1=$('setup-pass1').value, p2=$('setup-pass2').value;
    if(p1.length<12) return err('setup-err',tr('err.setupShort'));
    if(p1!==p2) return err('setup-err',tr('err.setupMismatch'));
    const btn=$('setup-btn'), orig=btn.textContent; doSetup._busy=true; btn.disabled=true; btn.textContent=tr('busy.creating');
    try{
      const m=parseInt($('setup-kdf').value,10);
      const kdf={m:[32768,65536,131072].includes(m)?m:KDF_DEFAULT.m, t:KDF_DEFAULT.t, p:KDF_DEFAULT.p, salt:rand(16)};
      const kek=await deriveKek(passBytes(p1), kdf);
      const dekX=await newDek(); const wrap=await wrapDek(dekX, kek, kdf);
      const dek=await unwrapDek(wrap, kek, kdf, false);            // Sitzungsschlüssel nicht extrahierbar
      DEK=dek; KDF=kdf; WRAP=wrap; VAULT=emptyVault();
      await persist();
    }catch(e){ DEK=KDF=WRAP=VAULT=null; return err('setup-err',tr('err.setupFailed')); }
    finally{ doSetup._busy=false; btn.disabled=false; btn.textContent=orig; }
    $('setup-pass1').value=$('setup-pass2').value=''; $('setup-meter').textContent='';
    enterApp(); toast(tr('toast.vaultCreated'));
  }
  async function doUnlock(){
    if(doUnlock._busy) return; err('lock-err');
    const now=Date.now(); if(now<lockedUntil) return err('lock-err',tr('err.wait',{s:Math.ceil((lockedUntil-now)/1000)}));
    const raw=localStorage.getItem(LS_KEY); if(!raw) return boot();
    let f; try{ f=parseFile(raw); }catch(e){ return err('lock-err',fileErrMsg(e)); }
    const btn=$('unlock-btn'), orig=btn.textContent; doUnlock._busy=true; btn.disabled=true; btn.textContent=tr('busy.decrypting');
    try{
      const kek=await deriveKek(passBytes($('lock-pass').value), f.kdf);
      const dek=await unwrapDek(f.wrap, kek, f.kdf, false);
      const obj=await decryptBody(f.body, dek, f.kdf);
      const v=sanitizeVault(obj);                                     // auch lokal: Whitelist beim Unlock
      DEK=dek; KDF=f.kdf; WRAP=f.wrap; VAULT=v; failCount=0; lockedUntil=0;
    }catch(e){
      failCount++; if(failCount>=3) lockedUntil=Date.now()+Math.min(30,(failCount-2)*2)*1000;
      return err('lock-err', e&&e.message==='toomany'?tr('err.tooMany'):tr('err.wrongPass'));
    }finally{ doUnlock._busy=false; btn.disabled=false; btn.textContent=orig; }
    $('lock-pass').value='';
    enterApp();
  }
  function enterApp(){ screen('app'); tab('list'); renderAll(); resetIdle(); }
  function lock(){
    clearIdle(); stopTotp(); clearClip();
    DEK=null; KDF=null; WRAP=null; VAULT=null; editId=null; currentId=null; genValue=''; pendingImport=null; search='';
    clearRendered(); boot();
  }
  // Nach dem Sperren darf nichts Entschlüsseltes im DOM oder in Formularfeldern bleiben
  function clearRendered(){
    ['entry-list','health','backup-hint','d-body','gen-out','gen-ent','f-meter','cp-meter','setup-meter'].forEach(id=>{ const n=$(id); if(n) n.replaceChildren(); });
    ['d-title','d-meta','bk-msg','import-msg','csv-msg','about-line'].forEach(id=>{ const n=$(id); if(n) n.textContent=''; });
    ['f-title','f-user','f-pass','f-url','f-totp','f-notes','search','import-pass','cp-cur','cp1','cp2','lock-pass','setup-pass1','setup-pass2','vault-file','csv-file'].forEach(id=>{ const n=$(id); if(n) n.value=''; });
    $('f-fav').checked=false; err('add-err'); err('cp-err'); err('lock-err'); err('setup-err');
    document.querySelectorAll('input[data-showpass]').forEach(cb=>{ cb.checked=false; cb.dataset.showpass.split(',').forEach(id=>{ const f=$(id); if(f) f.type='password'; }); });
    hide('detail-overlay'); hide('help-overlay'); hide('import-pass-box');
    doImportVault._busy=false; const ib=$('import-btn'); if(ib){ ib.disabled=false; }
  }

  /* ---------- Auto-Lock: Idle + Hintergrund (unabhängig voneinander) ---------- */
  let idleTimer=null, lastActivity=0, hiddenAt=0;
  const settings=()=>VAULT?VAULT.settings:SETTINGS_DEFAULT;
  function clearIdle(){ if(idleTimer){ clearTimeout(idleTimer); idleTimer=null; } }
  function resetIdle(){ clearIdle(); if(!DEK||!VAULT) return; const mins=settings().autolock; if(!mins) return; idleTimer=setTimeout(()=>{ clearIdle(); lock(); toast(tr('toast.autolocked')); }, mins*60000); }
  function activity(){ if(!DEK) return; const n=Date.now(); if(n-lastActivity<5000) return; lastActivity=n; resetIdle(); }
  ['click','keydown','touchstart','scroll','mousemove'].forEach(ev=>document.addEventListener(ev, activity, {passive:true}));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ hiddenAt=Date.now(); if(DEK&&settings().bgLock===0){ lock(); } return; }
    const away=hiddenAt?Date.now()-hiddenAt:0; hiddenAt=0;
    if(clipOwnedAt&&(clipDue||(settings().clipClear>0&&Date.now()-clipOwnedAt>=settings().clipClear*1000))) clearClip();
    if(!DEK) return;
    const s=settings();
    if((s.bgLock>0&&away>s.bgLock*1000)||(s.autolock>0&&away>s.autolock*60000)){ lock(); toast(tr('toast.autolocked')); }
    else resetIdle();
  });

  /* ---------- Zwischenablage (synchron im Klick-Handler aufrufen!) ---------- */
  function fallbackCopy(text){ let ta=null; try{ ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); return document.execCommand('copy'); }catch(_){ return false; } finally{ if(ta){ ta.value=''; ta.remove(); } } }
  let clipDue=false;   // Löschen war fällig, konnte aber (Hintergrund/kein Fokus) noch nicht ausgeführt werden
  function armClip(){ if(clipTimer){ clearTimeout(clipTimer); clipTimer=null; } clipOwnedAt=Date.now(); clipDue=false; const s=settings().clipClear; if(s>0) clipTimer=setTimeout(clearClip, s*1000); }
  // Besitz erst aufgeben, wenn der Write bestätigt ist. Chromium lehnt writeText ohne Fokus ab (Document is not focused),
  // Android blockt Hintergrund-Writes → dann nur vormerken und beim Zurückkehren / nächsten Tick erneut versuchen.
  function clearClip(){
    if(clipTimer){ clearTimeout(clipTimer); clipTimer=null; }
    if(!clipOwnedAt) return; clipDue=true;
    if(document.hidden||(typeof document.hasFocus==='function'&&!document.hasFocus())){ clipTimer=setTimeout(clearClip,1000); return; }
    const ok=()=>{ clipOwnedAt=0; clipDue=false; };
    const retry=()=>{ if(fallbackCopy(' ')) ok(); else clipTimer=setTimeout(clearClip,1000); };
    let p=null; try{ p=navigator.clipboard&&navigator.clipboard.writeText(' '); }catch(_){ p=null; }
    if(p&&p.then) p.then(ok,retry); else retry();
  }
  function copyText(text, whatKey){
    if(!text) return toast(tr('copy.empty'));
    const what=tr(whatKey), s=settings().clipClear;
    const done=()=>{ if(!DEK){ clipOwnedAt=Date.now(); clearClip(); return; } armClip(); toast(s>0?tr('copy.done',{what,s}):tr('copy.doneNoClear',{what})); };
    let p=null; try{ p=navigator.clipboard&&navigator.clipboard.writeText(text); }catch(_){ p=null; }
    if(p&&p.then) p.then(done).catch(()=>{ fallbackCopy(text)?done():toast(tr('copy.manual')); });
    else fallbackCopy(text)?done():toast(tr('copy.manual'));
  }

  /* ---------- tabs ---------- */
  function tab(name){
    if(name!=='add'&&editId){ editId=null; resetForm(); }   // sonst überschreibt „Neu“ später still den zuletzt bearbeiteten Eintrag
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    document.querySelectorAll('.tabview').forEach(v=>v.classList.toggle('hidden',v.id!=='tab-'+name));
    if(name==='gen'&&!genValue) genNew();
    if(name==='list') renderList();
    if(name==='settings') renderSettings();
    if(name==='backup') renderBackupMsg();
  }

  /* ---------- Einträge: Liste, Gesundheit ---------- */
  function health(){
    const r=new Set(), w=new Set(), o=new Set(), byPass=new Map(); const old=Date.now()-730*86400000;
    for(const e of live()){ if(!e.pass) continue; if(!byPass.has(e.pass)) byPass.set(e.pass,[]); byPass.get(e.pass).push(e.id); if(e.pass.length<12) w.add(e.id); if(ts(e.updated)<old) o.add(e.id); }
    for(const ids of byPass.values()) if(ids.length>1) ids.forEach(id=>r.add(id));
    return {r,w,o};
  }
  function renderList(){
    if(!VAULT) return;
    search=($('search').value||'').trim().toLowerCase();
    const list=$('entry-list'); list.replaceChildren();
    const all=live().sort((a,b)=>(b.fav-a.fav)||a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));
    const items=search?all.filter(e=>(e.title+'\n'+e.user+'\n'+e.url).toLowerCase().includes(search)):all;
    const h=health(); const hEl=$('health'); const bad=h.r.size+h.w.size+h.o.size;
    hEl.textContent=all.length?(bad?tr('health.bad',{r:h.r.size,w:h.w.size,o:h.o.size}):tr('health.ok')):''; hEl.classList.toggle('bad',bad>0);
    renderBackupHint();
    if(!items.length){ list.appendChild(el('div','empty',all.length?tr('list.noMatch'):tr('list.empty'))); return; }
    for(const e of items){
      const row=el('div','entry'); row.dataset.action='openDetail'; row.dataset.arg=e.id;
      row.appendChild(el('div','av',(e.title.trim()[0]||'?').toUpperCase()));
      const main=el('div','main'); main.appendChild(el('div','t',e.title)); main.appendChild(el('div','u',e.user||e.url||'')); row.appendChild(main);
      const badges=el('div','badges');
      if(e.fav) badges.appendChild(el('span','pill fav','★'));
      if(e.totp) badges.appendChild(el('span','pill totp','TOTP'));
      if(h.r.has(e.id)) badges.appendChild(el('span','pill bad',tr('badge.reused')));
      if(h.w.has(e.id)) badges.appendChild(el('span','pill bad',tr('badge.weak')));
      if(h.o.has(e.id)) badges.appendChild(el('span','pill bad',tr('badge.old')));
      row.appendChild(badges); list.appendChild(row);
    }
  }
  function renderBackupHint(){
    const box=$('backup-hint'); box.replaceChildren(); if(!VAULT||!live().length) return;
    const lb=VAULT.meta.lastBackup; let msg='';
    if(!lb) msg=tr('bk.none');
    else { const days=Math.floor((Date.now()-ts(lb))/86400000); const n=VAULT.entries.filter(e=>ts(e.updated)>ts(lb)).length; if(n>0&&days>=7) msg=tr('bk.stale',{d:days,n}); }
    if(msg){ const w=el('div','warn',msg); w.style.marginBottom='12px'; box.appendChild(w); }
  }

  /* ---------- Formular: neu / bearbeiten / speichern ---------- */
  function resetForm(){ ['f-title','f-user','f-pass','f-url','f-totp','f-notes'].forEach(id=>$(id).value=''); $('f-fav').checked=false; $('f-meter').textContent=''; err('add-err'); }
  function newEntry(){ editId=null; resetForm(); $('add-title').textContent=tr('add.titleNew'); tab('add'); setTimeout(()=>$('f-title').focus(),80); }
  function editCurrent(){ const e=byId(currentId); if(!e) return toast(tr('toast.noEntry')); closeDetail(); editId=e.id; resetForm();
    $('f-title').value=e.title; $('f-user').value=e.user; $('f-pass').value=e.pass; $('f-url').value=e.url; $('f-notes').value=e.notes; $('f-fav').checked=e.fav;
    $('f-totp').value=e.totp?((e.totp.algorithm!=='SHA1'||e.totp.digits!==6||e.totp.period!==30||e.totp.issuer||e.totp.label)?otpauthUri(e.totp):e.totp.secret):'';
    $('add-title').textContent=tr('add.titleEdit'); meterForm(); tab('add'); }
  function cancelEdit(){ editId=null; resetForm(); tab('list'); }
  function saveEntry(){
    if(!VAULT) return; err('add-err');
    const title=$('f-title').value.trim(); if(!title) return err('add-err',tr('err.titleReq'));
    const totpIn=$('f-totp').value.trim(); const totp=totpIn?normalizeTotp(totpIn):null; if(totpIn&&!totp) return err('add-err',tr('err.totpBad'));
    const now=nowIso();
    const draft={id:editId||cryptoId(), title, user:$('f-user').value, pass:$('f-pass').value, url:$('f-url').value.trim(), notes:$('f-notes').value, totp, fav:$('f-fav').checked, created:now, updated:now, deleted:null};
    const idx=editId?VAULT.entries.findIndex(e=>e.id===editId):-1; const before=idx>=0?VAULT.entries[idx]:null;
    if(before) draft.created=before.created;
    const entry=sanitizeEntry(draft); if(!entry) return err('add-err',tr('err.titleReq'));
    if(idx<0&&liveCount(VAULT.entries)>=MAX_ENTRIES) return err('add-err',tr('err.tooMany'));
    const snapshot=VAULT.entries.slice();
    if(idx>=0) VAULT.entries[idx]=entry; else VAULT.entries.push(entry);
    persist().then(()=>{ toast(tr('toast.saved')); editId=null; resetForm(); tab('list'); })
      .catch(()=>{ VAULT.entries=snapshot; });
  }
  function meterForm(){ renderMeter('f-pass','f-meter'); }

  /* ---------- Detail ---------- */
  function kv(label, value, opts){
    const box=el('div','kv'); box.appendChild(el('div','k',label));
    const vrow=el('div','vrow'); const v=el('div','v'+(opts&&opts.secret?' secret masked':'')); v.textContent=opts&&opts.secret?'••••••••••••':value; v.id=opts&&opts.id||''; vrow.appendChild(v);
    if(opts&&opts.secret){ const b=el('button','btn sm ghost',tr('d.show')); b.dataset.action='toggleReveal'; b.id='d-reveal'; vrow.appendChild(b); }
    if(opts&&opts.copy){ const c=el('button','btn sm ghost',tr('d.copy')); c.dataset.action='copyField'; c.dataset.arg=opts.copy; vrow.appendChild(c); }
    box.appendChild(vrow); return box;
  }
  function openDetail(id){
    const e=byId(id); if(!e) return; currentId=id; stopTotp();
    $('d-title').textContent=e.title; const b=$('d-body'); b.replaceChildren();
    if(e.user) b.appendChild(kv(tr('d.user'), e.user, {copy:'user'}));
    if(e.pass) b.appendChild(kv(tr('d.pass'), '', {secret:true, copy:'pass', id:'d-pass'}));
    if(e.url) b.appendChild(kv(tr('d.url'), e.url, {copy:'url'}));   // bewusst Text, kein Link (kein Netz in der App)
    if(e.totp){ const box=el('div','kv'); box.appendChild(el('div','k',tr('d.totp')+(e.totp.issuer?' · '+e.totp.issuer:'')));
      const vrow=el('div','vrow'); const code=el('div','v totp-box','------'); code.id='d-totp'; vrow.appendChild(code);
      const c=el('button','btn sm ghost',tr('d.copy')); c.dataset.action='copyField'; c.dataset.arg='totp'; vrow.appendChild(c); box.appendChild(vrow);
      const bar=el('div','totp-bar'); bar.id='d-totp-bar'; bar.appendChild(el('i')); box.appendChild(bar); b.appendChild(box); startTotp(e.totp); }
    if(e.notes) b.appendChild(kv(tr('d.notes'), e.notes, {copy:'notes'}));
    $('d-meta').textContent=tr('d.meta',{c:fmtDate(e.created),u:fmtDate(e.updated)});
    $('d-fav-btn').textContent=e.fav?tr('d.unfav'):tr('d.fav');
    show('detail-overlay'); $('detail-overlay').scrollTop=0;
  }
  function closeDetail(){ stopTotp(); hide('detail-overlay'); const b=$('d-body'); b.replaceChildren(); $('d-title').textContent=''; $('d-meta').textContent=''; currentId=null; }
  function toggleReveal(){ const e=byId(currentId), v=$('d-pass'), btn=$('d-reveal'); if(!e||!v) return; const masked=v.classList.contains('masked'); v.textContent=masked?e.pass:'••••••••••••'; v.classList.toggle('masked',!masked); if(btn) btn.textContent=masked?tr('d.hide'):tr('d.show'); }
  function copyField(which){ if(which==='gen') return copyText(genValue,'what.gen'); const e=byId(currentId); if(!e) return toast(tr('toast.noEntry')); const val=which==='totp'?lastCode:e[which]; copyText(val,'what.'+which); }
  function toggleFavCurrent(){ const e=byId(currentId); if(!e) return; const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice(); const upd=Object.assign({},e,{fav:!e.fav,updated:nowIso()}); VAULT.entries[idx]=upd; persist().then(()=>{ openDetail(e.id); renderList(); }).catch(()=>{ VAULT.entries=snapshot; }); }
  function deleteCurrent(){ const e=byId(currentId); if(!e) return; if(!confirm(tr('confirm.delete',{t:e.title}))) return;
    const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice(); VAULT.entries[idx]=tombstone(e, nowIso());
    persist().then(()=>{ closeDetail(); renderList(); toast(tr('toast.deleted')); }).catch(()=>{ VAULT.entries=snapshot; }); }
  function startTotp(t){ stopTotp(); let lastCounter=-1; const tick=async()=>{ if(!DEK) return stopTotp(); const now=Date.now(), counter=Math.floor(now/1000/t.period), rem=totpRemaining(t,now);
      if(counter!==lastCounter){ lastCounter=counter; try{ lastCode=await totpCode(t,now); }catch(_){ lastCode=''; } const c=$('d-totp'); if(c) c.textContent=lastCode?lastCode.replace(/(\d{3})(?=\d)/g,'$1 '):'—'; }
      const bar=$('d-totp-bar'); if(bar){ bar.firstChild.style.width=(rem/t.period*100)+'%'; bar.classList.toggle('low',rem<=5); } };
    tick(); totpTimer=setInterval(tick,1000); }
  function stopTotp(){ if(totpTimer){ clearInterval(totpTimer); totpTimer=null; } lastCode=''; }

  /* ---------- Generator ---------- */
  function genOpts(){ return {upper:$('gen-upper').checked, lower:$('gen-lower').checked, digits:$('gen-digits').checked, symbols:$('gen-symbols').checked, noamb:$('gen-noamb').checked}; }
  function setGenMode(m){ genMode=m==='words'?'words':'chars'; $('gm-chars').classList.toggle('on',genMode==='chars'); $('gm-words').classList.toggle('on',genMode==='words'); $('gen-chars-opts').classList.toggle('hidden',genMode!=='chars'); $('gen-words-opts').classList.toggle('hidden',genMode!=='words'); genNew(); }
  function genNew(){
    let r; if(genMode==='words'){ const n=parseInt($('gen-wc').value,10); $('gen-wc-v').textContent=n; r=genWords(n,$('gen-sep').value,$('gen-cap').checked,$('gen-num').checked); if(!r.pw) toast(tr('toast.wordsMissing')); }
    else { const len=parseInt($('gen-len').value,10); $('gen-len-v').textContent=len; r=genChars(len,genOpts()); if(!r.pw){ $('gen-out').textContent=''; $('gen-ent').textContent=tr('gen.noset'); genValue=''; return; } }
    genValue=r.pw; $('gen-out').textContent=r.pw; $('gen-ent').textContent=r.pw?tr('gen.bits',{b:r.bits}):'';
    $('gen-use').classList.toggle('hidden', false);
  }
  function genCopy(){ copyText(genValue,'what.gen'); }
  function genUse(){ if(!genValue) return; if(!editId&&!$('f-title').value) { editId=null; resetForm(); $('add-title').textContent=tr('add.titleNew'); } $('f-pass').value=genValue; meterForm(); tab('add'); }
  function genIntoForm(){ const r=genChars(parseInt($('gen-len').value,10)||20, genOpts()); if(!r.pw) return toast(tr('gen.noset')); $('f-pass').value=r.pw; $('f-pass').type='text'; const cb=document.querySelector('input[data-showpass="f-pass"]'); if(cb) cb.checked=true; meterForm(); }
  function suggestPass(){ const r=genWords(6,'-',false,false); if(!r.pw) return toast(tr('toast.wordsMissing')); $('setup-pass1').value=r.pw; $('setup-pass2').value=r.pw; $('setup-pass1').type=$('setup-pass2').type='text'; $('setup-show').checked=true; meterSetup(); toast(tr('toast.suggest')); }
  function renderMeter(inId,outId){ const p=$(inId).value, o=$(outId); if(!p){ o.textContent=''; return; } const st=passStrength(p); const col=['var(--red)','var(--orange)','var(--text-mid)','var(--neon)'][st]; o.replaceChildren(); const s=el('span',null,'▮'.repeat(st+1)+'▯'.repeat(3-st)+' '+tr('pass.s'+st)); s.style.color=col; o.appendChild(s); }
  function meterSetup(){ renderMeter('setup-pass1','setup-meter'); }
  function meterCp(){ renderMeter('cp1','cp-meter'); }

  /* ---------- Backup export / import ---------- */
  const CAP = window.Capacitor || null;
  const isNative = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  async function nativeSaveAndShare(name, content, dir, shareText){
    const FS=CAP.Plugins&&CAP.Plugins.Filesystem; if(!FS) throw new Error('Filesystem-Plugin fehlt');
    const w=await FS.writeFile({path:name, data:content, directory:dir||'DOCUMENTS', encoding:'utf8', recursive:true});
    try{ const SH=CAP.Plugins&&CAP.Plugins.Share; if(SH) await SH.share({title:name, text:shareText||'Alien Pass Backup', url:w.uri}); }catch(_){}
    return w.uri;
  }
  function downloadFile(name, content, type){ const blob=new Blob([content],{type:type||'application/octet-stream'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function renderBackupMsg(){ const m=$('bk-msg'); const lb=VAULT&&VAULT.meta.lastBackup; m.textContent=lb?(LANG==='de'?'Letztes Backup: ':'Last backup: ')+fmtDate(lb):''; }
  async function exportVault(){
    if(!VAULT||exportVault._busy) return; exportVault._busy=true;
    try{
      const raw=localStorage.getItem(LS_KEY); const name='alien-pass-'+new Date().toISOString().slice(0,10)+'.vault';
      // Erst die Datei schreiben — der Backup-Stempel darf nur nach Erfolg gesetzt werden
      try{ if(isNative){ await nativeSaveAndShare(name, raw, 'DOCUMENTS', 'Alien Pass Backup'); $('bk-msg').textContent=tr('bk.doneNative',{n:name}); }
           else { downloadFile(name, raw, 'application/octet-stream'); $('bk-msg').textContent=tr('bk.done',{n:name}); } }
      catch(e){ $('bk-msg').textContent=tr('bk.failed',{e:String(e&&e.message||e)}); return; }
      if(!VAULT) return;
      const before={lastBackup:VAULT.meta.lastBackup,lastBackupCount:VAULT.meta.lastBackupCount};
      VAULT.meta.lastBackup=nowIso(); VAULT.meta.lastBackupCount=VAULT.entries.length;
      try{ await persist(); }catch(_){ if(VAULT) Object.assign(VAULT.meta,before); }
      renderBackupHint();
    }finally{ exportVault._busy=false; }
  }
  function pickFile(id){ const n=$(id); if(n) n.click(); }
  function importVault(ev){
    const f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f) return; const input=ev.target; $('import-msg').textContent='';
    const r=new FileReader(); r.onerror=()=>{ $('import-msg').textContent=tr('bk.readErr'); input.value=''; };
    r.onload=()=>{ input.value=''; try{ pendingImport=parseFile(String(r.result)); }catch(e){ pendingImport=null; $('import-msg').textContent=fileErrMsg(e); return; }
      show('import-pass-box'); setTimeout(()=>$('import-pass').focus(),80); };
    if(f.size>MAX_FILE_BYTES){ $('import-msg').textContent=tr('err.fileLarge'); input.value=''; return; }
    r.readAsText(f);
  }
  function cancelImport(){ pendingImport=null; $('import-pass').value=''; hide('import-pass-box'); }
  async function doImportVault(){
    if(doImportVault._busy||!pendingImport||!VAULT) return; const f=pendingImport;
    if(f.kdf.m>KDF_CONFIRM_M && !confirm(tr('confirm.bigKdf',{m:Math.round(f.kdf.m/1024)}))) return;
    const btn=$('import-btn'), orig=btn.textContent; doImportVault._busy=true; btn.disabled=true; btn.textContent=tr('busy.decrypting');
    try{
      let incoming;
      try{ const kek=await deriveKek(passBytes($('import-pass').value), f.kdf); const dek=await unwrapDek(f.wrap,kek,f.kdf,false); const obj=await decryptBody(f.body,dek,f.kdf); incoming=sanitizeVault(obj).entries; }
      catch(e){ if(VAULT) $('import-msg').textContent=e&&e.message==='toomany'?tr('err.tooMany'):tr('bk.mergeFail'); return; }
      if(!VAULT||!DEK) return;                                   // während des Argon2-Laufs gesperrt → sauber abbrechen
      const before=VAULT.entries.slice(); const m=mergeEntries(VAULT.entries, incoming);
      if(liveCount(m.entries)>MAX_ENTRIES){ $('import-msg').textContent=tr('err.tooMany'); return; }
      VAULT.entries=m.entries;
      try{ await persist(); if(!VAULT) return; $('import-msg').textContent=tr('bk.merged',{a:m.added,u:m.updated,d:m.deleted,t:m.tombstonesIn}); cancelImport(); renderList(); }
      catch(_){ if(VAULT) VAULT.entries=before; }
    }finally{ doImportVault._busy=false; btn.disabled=false; btn.textContent=orig; }
  }
  function importCsv(ev){
    const f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f||!VAULT) return; const input=ev.target; $('csv-msg').textContent='';
    if(f.size>MAX_FILE_BYTES){ $('csv-msg').textContent=tr('err.fileLarge'); input.value=''; return; }
    const r=new FileReader(); r.onerror=()=>{ $('csv-msg').textContent=tr('bk.readErr'); input.value=''; };
    r.onload=()=>{ input.value=''; const text=String(r.result);
      let rows=parseCsv(text,','); if(rows.length&&rows[0].length<2&&text.indexOf(';')>=0) rows=parseCsv(text,';');
      if(rows.length<2){ $('csv-msg').textContent=tr('csv.empty'); return; }
      const map=csvMap(rows[0]); if(!map){ $('csv-msg').textContent=tr('csv.unknown'); return; }
      const now=Date.now(); const existing=new Set(live().map(e=>e.title+'\u0000'+e.user+'\u0000'+e.pass));
      const added=[]; let skipped=0, bad=0;
      for(const row of rows.slice(1)){ const e=csvRowToEntry(map,row,now); if(!e){ bad++; continue; } const key=e.title+'\u0000'+e.user+'\u0000'+e.pass; if(existing.has(key)){ skipped++; continue; } existing.add(key); added.push(e); }
      if(liveCount(VAULT.entries)+added.length>MAX_ENTRIES){ $('csv-msg').textContent=tr('err.tooMany'); return; }
      const before=VAULT.entries.slice(); VAULT.entries=VAULT.entries.concat(added);
      persist().then(()=>{ $('csv-msg').textContent=tr('csv.done',{n:added.length,f:tr('fmt.'+map.fmt),s:skipped,b:bad}); renderList(); })
        .catch(()=>{ VAULT.entries=before; }); };
    r.readAsText(f);
  }

  /* ---------- Einstellungen ---------- */
  function renderSettings(){ if(!VAULT) return; const s=VAULT.settings; $('set-autolock').value=String(s.autolock); $('set-bglock').value=String(s.bgLock); $('set-clip').value=String(s.clipClear);
    const soft=document.documentElement.getAttribute('data-theme')==='soft'; $('th-dark').classList.toggle('on',!soft); $('th-soft').classList.toggle('on',soft);
    $('about-line').textContent=tr('about',{v:APP_VERSION,m:Math.round(KDF.m/1024),t:KDF.t,p:KDF.p}); }
  function setSetting(key, v){ if(!VAULT) return; const n=Number(v); if(!SETTINGS_ALLOWED[key].includes(n)) return; const before=VAULT.settings[key]; VAULT.settings[key]=n; persist().then(()=>{ resetIdle(); }).catch(()=>{ VAULT.settings[key]=before; renderSettings(); }); }
  const setAutolock=v=>setSetting('autolock',v), setBgLock=v=>setSetting('bgLock',v), setClipClear=v=>setSetting('clipClear',v);
  function theme(t){ try{ if(t==='soft'){ document.documentElement.setAttribute('data-theme','soft'); localStorage.setItem('alien-theme','soft'); } else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('alien-theme','dark'); } }catch(_){} renderSettings(); }
  async function changePass(){
    if(changePass._busy||!VAULT) return; err('cp-err');
    const cur=$('cp-cur').value, p1=$('cp1').value, p2=$('cp2').value;
    if(p1.length<12) return err('cp-err',tr('err.cpShort'));
    if(p1!==p2) return err('cp-err',tr('err.cpMismatch'));
    const btn=$('cp-btn'), orig=btn.textContent; changePass._busy=true; btn.disabled=true; btn.textContent=tr('busy.changing');
    const old={DEK,KDF,WRAP};
    try{
      try{ const kOld=await deriveKek(passBytes(cur), KDF); await unwrapDek(WRAP,kOld,KDF,false); }   // alte Passphrase real prüfen
      catch(_){ return err('cp-err',tr('err.cpWrong')); }
      const kdf={m:KDF.m,t:KDF.t,p:KDF.p,salt:rand(16)};
      const kNew=await deriveKek(passBytes(p1), kdf);
      const dekX=await newDek(); const wrap=await wrapDek(dekX,kNew,kdf); const dek=await unwrapDek(wrap,kNew,kdf,false);   // DEK-Rotation
      if(!VAULT||!DEK) return;                                   // zwischenzeitlich gesperrt → nichts wiederbeleben
      DEK=dek; KDF=kdf; WRAP=wrap;
      try{ await persist(); }catch(_){ DEK=old.DEK; KDF=old.KDF; WRAP=old.WRAP; return; }
      $('cp-cur').value=$('cp1').value=$('cp2').value=''; $('cp-meter').textContent=''; toast(tr('toast.passChanged')); renderSettings();
    }finally{ changePass._busy=false; btn.disabled=false; btn.textContent=orig; }
  }
  function wipeLocal(){ if(!confirm(tr('confirm.wipe'))) return; localStorage.removeItem(LS_KEY); lock(); }

  /* ---------- misc ---------- */
  function openHelp(){ show('help-overlay'); $('help-overlay').scrollTop=0; }
  function closeHelp(){ hide('help-overlay'); }
  function toggleLang(){ setLang(LANG==='de'?'en':'de'); }
  function relabel(){ if(!VAULT) return; $('add-title').textContent=editId?tr('add.titleEdit'):tr('add.titleNew'); renderList(); renderSettings(); renderBackupMsg(); if(genValue) genNew(); if(currentId&&!$('detail-overlay').classList.contains('hidden')) openDetail(currentId); }
  function renderAll(){ renderList(); renderSettings(); renderBackupMsg(); }
  function kdfChanged(){ kdfTouched=true; }

  return {boot,doSetup,doUnlock,lock,tab,newEntry,saveEntry,cancelEdit,editCurrent,deleteCurrent,toggleFavCurrent,openDetail,closeDetail,toggleReveal,copyField,renderList,
    setGenMode,genNew,genCopy,genUse,genIntoForm,suggestPass,exportVault,importVault,doImportVault,cancelImport,importCsv,pickFile,
    setAutolock,setBgLock,setClipClear,theme,changePass,wipeLocal,openHelp,closeHelp,toggleLang,relabel,meterSetup,meterCp,meterForm,kdfChanged};
})();

/* ---------- Event-Delegation ----------
   CSP ohne 'unsafe-inline': KEINE Inline-Handler (auch nicht in dynamisch erzeugtem Markup) —
   alles läuft über data-Attribute + diese Listener. Die Funktion muss im App-Export stehen. */
document.addEventListener('click',ev=>{
  const sp=ev.target.closest('[data-showpass]');
  if(sp){ const t=sp.checked?'text':'password'; sp.dataset.showpass.split(',').forEach(id=>{ const f=document.getElementById(id); if(f) f.type=t; }); return; }
  const elx=ev.target.closest('[data-action]'); if(!elx) return;
  const fn=App[elx.dataset.action];
  if(typeof fn==='function') fn(elx.dataset.arg, elx);
});
document.addEventListener('change',ev=>{
  const elx=ev.target.closest('[data-change]'); if(!elx) return;
  const a=elx.dataset.change; const fn=App[a]; if(typeof fn!=='function') return;
  if(a==='importCsv'||a==='importVault') return fn(ev);
  fn(elx.value, elx);
});
document.addEventListener('input',ev=>{
  const elx=ev.target.closest('[data-input]'); if(!elx) return;
  const fn=App[elx.dataset.input]; if(typeof fn==='function') fn(elx.value, elx);
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){ App.closeDetail(); App.closeHelp(); return; }
  if(ev.key!=='Enter') return;
  const elx=ev.target.closest('[data-enter]'); if(!elx) return;
  const fn=App[elx.dataset.enter]; if(typeof fn==='function') fn();
});

window.addEventListener('DOMContentLoaded',()=>{
  const ok=window.crypto&&crypto.subtle&&typeof WebAssembly!=='undefined'&&window.hashwasm&&typeof hashwasm.argon2id==='function';
  if(!ok){ const c=document.querySelector('.container'); c.replaceChildren(); const d=document.createElement('div'); d.className='card warn'; d.textContent=tr('nocrypto'); c.appendChild(d); return; }
  const k=document.getElementById('setup-kdf'); if(k) k.addEventListener('change',App.kdfChanged);
  applyI18n();
  App.boot();
});
