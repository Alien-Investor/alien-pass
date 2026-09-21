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
