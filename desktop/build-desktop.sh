#!/usr/bin/env bash
# Alien Pass Desktop bauen: www/ (Vendor-Hashes wie bei der APK) → Electron (Version + Hash gepinnt) → app.asar + Fuses
# → Flatpak ohne Netz, als User-Installation. Kein sudo, keine npm-Installationsskripte.
set -euo pipefail
cd "$(dirname "$0")"

EL_VER="44.4.3"
EL_SHA="fe880a7e37160cfd4e00193bc4c713ead7a778abfe74860a2d36d86fd0be48a8"   # electron-v44.4.3-linux-x64.zip (SHASUMS256.txt des Release)
APP_ID="org.alieninvestor.pass"
CACHE="$HOME/.cache/alien-pass-desktop"
ZIP="$CACHE/electron-v$EL_VER-linux-x64.zip"

mkdir -p "$CACHE"
if [ ! -f "$ZIP" ]; then
  curl -fL --proto '=https' --tlsv1.2 -o "$ZIP.part" "https://github.com/electron/electron/releases/download/v$EL_VER/electron-v$EL_VER-linux-x64.zip"
  mv "$ZIP.part" "$ZIP"
fi
echo "$EL_SHA  $ZIP" | sha256sum -c --quiet - || { echo "FEHLER: Hash des Electron-Archivs weicht ab — Build abgebrochen!"; exit 1; }
echo "Electron $EL_VER: Hash OK."

[ -d node_modules/@electron/asar ] && [ -d node_modules/@electron/fuses ] || { echo "FEHLER: erst 'npm ci' in desktop/"; exit 1; }

(cd .. && ./build-www.sh >/dev/null) && echo "www/ gebaut."
VNAME=$(grep '^VERSION_NAME=' ../VERSION | cut -d= -f2 | tr -d '[:space:]')

rm -rf build && mkdir -p build/app build/electron
unzip -q "$ZIP" -d build/electron
rm -f build/electron/chrome-sandbox build/electron/resources/default_app.asar   # Sandbox kommt im Flatpak über zypak
cp main.js preload.js build/app/
cp -r ../www build/app/www
printf '{"name":"alien-pass","productName":"Alien Pass","version":"%s","main":"main.js","private":true}\n' "$VNAME" > build/app/package.json
node pack.mjs build/app build/electron

# Der Builder läuft selbst als Flatpak und sieht nur ~/ — deshalb liegt alles unter desktop/build/
flatpak run org.flatpak.Builder --user --install --force-clean --state-dir=build/.flatpak-builder build/fp flatpak/$APP_ID.yml

# Endkontrolle an der installierten App: kein Netz, kein Dateisystem, nur Anzeige + GPU
PERM=$(flatpak info --user --show-permissions "$APP_ID")
echo "$PERM"
if echo "$PERM" | grep -qiE '^shared=.*network|^filesystems='; then echo "FEHLER: Flatpak hat Netz- oder Dateisystem-Zugriff — abgebrochen!"; exit 1; fi
echo "Endkontrolle OK: kein Netz, kein Dateisystem. Start: flatpak run $APP_ID"
