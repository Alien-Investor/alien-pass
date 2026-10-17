#!/usr/bin/env bash
# Kopiert die Web-Assets in www/ (Capacitor-webDir) und prüft VORHER die Integrität des
# gebündelten Fremdcodes (hash-wasm Argon2id, EFF-Wortliste). Falscher Hash = Build-Abbruch.
set -euo pipefail
cd "$(dirname "$0")"

# Gepinnte Hashes (hash-wasm 4.12.0, dist/argon2.umd.min.js; EFF Large Wordlist 2016-07-18)
ARGON2_SHA="dcec617a2e1b700fa132d1583a186cb70611113395e869f2dd6cc82b415d3094"
EFF_SHA="addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e"
EFF_JS_SHA="b7ccf3dd6958efa9000d8d68c63ebfdbab4a98493cf2fbcd25e1fc31ba57a6b7"   # bei Neugenerierung der .js neu pinnen
check(){ local f="$1" want="$2"; local got; got=$(sha256sum "$f" | cut -d' ' -f1)
  [ "$got" = "$want" ] || { echo >&2 "FEHLER: Hash von $f weicht ab ($got) — Build abgebrochen!"; exit 1; }; }
check vendor/hash-wasm/argon2.umd.min.js "$ARGON2_SHA"
check vendor/eff/eff_large_wordlist.txt "$EFF_SHA"
check vendor/eff/eff-wordlist.js "$EFF_JS_SHA"
# Fremdcode darf weder evaluieren noch funken (unbedingt geprüft, nicht nur bei Änderung)
for f in vendor/hash-wasm/argon2.umd.min.js vendor/eff/eff-wordlist.js qr.js; do
  if grep -qE 'eval\(|Function\(|fetch\(|XMLHttpRequest|WebSocket|importScripts|document\.|location\.|setTimeout\(\s*["'"'"']|setInterval\(\s*["'"'"']|window\[' "$f"; then
    echo >&2 "FEHLER: $f enthält eval/Function/Netz/DOM-Zugriffe — Build abgebrochen!"; exit 1; fi
done
# eff-wordlist.js muss exakt aus der .txt stammen
node -e '
const fs=require("fs");
const words=fs.readFileSync("vendor/eff/eff_large_wordlist.txt","utf8").trim().split("\n").map(l=>l.split("\t")[1].trim());
const js=fs.readFileSync("vendor/eff/eff-wordlist.js","utf8");
if(!js.includes("window.EFF_WORDS="+JSON.stringify(words)+";")){console.error("FEHLER: eff-wordlist.js passt nicht zur .txt");process.exit(1);}'
# Platzhalter in den ausgelieferten Texten (v1.23, Querfund Alien Notes v1.14 run-12 c2-2, run-13 R9; Regel wortgleich Notes build-www.sh): Textentwürfe
# markieren unbelegte Teile mit [eckigen Klammern] („nur, wenn der Gerätetest sie belegt“) — ein stehengebliebener Teil im Handbuch ginge sonst ungeprüft
# in APK und Bundle. Geprüft wird der sichtbare Text von index.html (ohne Kommentare/Skripte/Tags, dazu title/aria-label/placeholder/content/alt) und
# alle Zeichenketten der Tabellen I18N und T in app.js (gemessen: 0 Fehlalarme, ROT für DE, EN und T). Findet sie eine Tabelle nicht, bricht der
# Build ab (nie still ungeprüft).
node -e '
const fs=require("fs"); const RX=/\[(?![ xX]\])[^\]]{1,300}\](?!\()|\b(TODO|TBD|FIXME|XXX)\b/;
const raw=fs.readFileSync("index.html","utf8").replace(/<!--[\s\S]*?-->/g," ").replace(/<(script|style)[\s\S]*?<\/\1>/g," ");
const attrs=[...raw.matchAll(/\b(?:title|aria-label|placeholder|content|alt)="([^"]*)"/g)].map(m=>m[1]).join("\n");
const html=raw.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&")+"\n"+attrs;
const js=fs.readFileSync("app.js","utf8").split("\n");
const block=(start)=>{ const i=js.findIndex(l=>l.startsWith(start)); if(i<0){ console.error("FEHLER: Tabelle "+start+" in app.js nicht gefunden (Platzhalter-Prüfung)"); process.exit(1); }
  const out=[]; for(let k=i;k<js.length;k++){ out.push(js[k]); if(k>i&&/^};/.test(js[k])) return out.join("\n"); } console.error("FEHLER: Ende von "+start+" nicht gefunden"); process.exit(1); };
const strs=(src)=>[...src.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m=>m[1]).filter(s=>!/^[a-z]+(\.[A-Za-z0-9]+)+$/.test(s)).join("\n").replace(/<[^>]+>/g," ");
for(const [name,text] of [["index.html",html],["app.js I18N",strs(block("const I18N = {"))],["app.js T",strs(block("const T = {"))]]){
  const m=RX.exec(text); if(m){ console.error("FEHLER: Platzhalter in "+name+": "+JSON.stringify(m[0].slice(0,120))+" — erst auflösen (Gerätetest/Faktencheck)"); process.exit(1); } }
' || { echo >&2 "FEHLER: Platzhalter-Prüfung der App-Texte — Build abgebrochen!"; exit 1; }
echo "Vendor-Integrität OK."

rm -rf www && mkdir -p www/vendor
cp index.html app.js qr.js icon.svg www/
# Versionsanzeige aus VERSION setzen (einzige Quelle; v1.3/v1.4 zeigten noch „1.2“, weil die Konstante von Hand gepflegt war)
VNAME=$(grep '^VERSION_NAME=' VERSION | cut -d= -f2 | tr -d '[:space:]')
[ -n "$VNAME" ] || { echo >&2 "FEHLER: VERSION_NAME fehlt in VERSION"; exit 1; }
sed -i -E "s|^const APP_VERSION = '[^']*';|const APP_VERSION = '$VNAME';|" www/app.js
grep -q "^const APP_VERSION = '$VNAME';" www/app.js || { echo >&2 "FEHLER: APP_VERSION konnte nicht auf $VNAME gesetzt werden"; exit 1; }
echo "APP_VERSION = $VNAME"
cp -r vendor/fonts vendor/hash-wasm www/vendor/
mkdir -p www/vendor/eff && cp vendor/eff/eff-wordlist.js www/vendor/eff/
echo "www/ gebaut:"; find www -type f | sort
