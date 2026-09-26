# Alien Pass

Lokaler, verschlüsselter **Passwort-Manager** für Android / GrapheneOS — und seit v1.7 auch für den **Linux-Desktop** (Flatpak).
Läuft komplett **offline** — keine Cloud, kein Server, kein Konto, keine Telemetrie.
Die Android-App fordert **keine Internet-Berechtigung** an — nur die zwei normalen Berechtigungen für den Fingerabdrucksensor (siehe Sicherheit).
Die Desktop-Fassung läuft als Flatpak **ohne Netzwerk-Berechtigung und ohne Zugriff auf deine Dateien**.
Deine Passwörter verlassen das Gerät nie im Klartext.

Schwester-App des [Sachwert-Tresors](https://codeberg.org/Alien-Investor/sachwert-tresor) — gleiche Architektur, gleiche Härtung, gleicher Alien-Investor-Stil.

## 📲 Installieren (Android / GrapheneOS)

Bewusst **nicht im Google Play Store**. Verteilung über signierte Releases hier auf Codeberg
und im [Zap Store](https://zapstore.dev). Empfohlen über **[Obtainium](https://github.com/ImranR98/Obtainium)**:

1. In Obtainium **„App hinzufügen"** → diese Repo-URL eintragen:
   ```
   https://codeberg.org/Alien-Investor/alien-pass
   ```
2. Quell-Typ wird als **Forgejo/Gitea** erkannt → **Hinzufügen** → **Installieren**.
3. Updates meldet Obtainium automatisch.

**Ohne Obtainium:** [Neuestes Release](https://codeberg.org/Alien-Investor/alien-pass/releases/latest) → `.apk` laden und installieren.

**Signatur-Fingerprint** (SHA-256 des Signatur-Zertifikats, über alle Versionen gleich — mit
[AppVerifier](https://github.com/soupslurpr/AppVerifier) prüfen):
```
AppVerifier (mit Doppelpunkten):
73:C7:17:D8:05:6C:6A:02:B0:8B:AB:BA:24:18:17:F3:93:E4:6D:EA:03:19:D4:FA:26:B8:C3:D8:E1:F9:3C:95

Plain SHA-256 (apksigner):
73c717d8056c6a02b08babba241817f393e46dea0319d4fa26b8c3d8e1f93c95
```

## 🖥️ Installieren (Linux-Desktop, Flatpak)

Derselbe Code wie auf dem Handy, verpackt mit Electron als **Flatpak** (x86_64). Das Tresor-Format ist identisch: Backups vom Handy lassen
sich am Desktop importieren und umgekehrt. Verteilung als Datei mit GPG-signierter Prüfsumme im [Codeberg-Release](https://codeberg.org/Alien-Investor/alien-pass/releases) —
nicht auf Flathub, kein automatisches Update.

**Voraussetzung:** Flatpak mit dem Flathub-Remote (für die Laufzeit `org.freedesktop.Platform` 25.08, die flatpak beim Installieren nachlädt):
```
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

**1. Drei Dateien aus dem Release laden:** `alien-pass-X.Y-linux-x86_64.flatpak`, `SHA256SUMS`, `SHA256SUMS.asc`.

**2. Signatur prüfen.** Die Pakete sind mit dem GPG-Release-Schlüssel von Alien Investor signiert
([`alien-investor-release-key.asc`](alien-investor-release-key.asc) hier im Repo). Den Fingerabdruck zusätzlich über einen zweiten Weg
vergleichen (Website [alien-investor.org](https://alien-investor.org/alien-pass.html)):
```
Fingerabdruck:  100F 9E25 BFAE A807 DBC3  57D7 50C0 D785 83BF CB81
```
```
gpg --import alien-investor-release-key.asc
gpg --verify SHA256SUMS.asc SHA256SUMS      # „Korrekte Signatur von "Alien Investor (Release-Signatur) …"“
sha256sum -c SHA256SUMS                     # „…flatpak: OK“
```

**3. Installieren und starten:**
```
flatpak install --user alien-pass-X.Y-linux-x86_64.flatpak
flatpak run org.alieninvestor.pass
```
Danach steht Alien Pass im Anwendungsmenü.

**Update:** Eine neue Bündel-Datei lässt sich (Flatpak 1.14) nicht über die installierte legen. Neue Version laden und prüfen (Schritt 1–2), dann
```
flatpak uninstall --user org.alieninvestor.pass     # löscht KEINE Daten (ohne --delete-data)
flatpak install --user alien-pass-X.Y-linux-x86_64.flatpak
```
Der Tresor liegt in `~/.var/app/org.alieninvestor.pass/data/alien-pass/vault.aipv` und bleibt dabei erhalten. Vorher trotzdem ein Backup anlegen.

**Selbst prüfen, dass die App kein Netz hat:**
```
flatpak info --user --show-permissions org.alieninvestor.pass
```
Erwartet genau:
```
[Context]
shared=ipc;
sockets=wayland;fallback-x11;
devices=dri;
```
Kein `network`, kein `filesystem`.

## Erster Start

Beim ersten Öffnen vergibst du deine **Passphrase** (mindestens 12 Zeichen; der Vorschlag-Button
erzeugt sechs Würfelwörter aus der EFF-Liste). Die App misst dabei, wie schnell dein Gerät die
Schlüsselableitung schafft, und schlägt eine passende Argon2-Stufe vor.

> ⚠️ **Kein Reset, kein Backdoor.** Passphrase vergessen = Daten weg.
> Lege ein Backup an (verschlüsselte `.vault`-Datei) und bewahre die Passphrase sicher auf.

## Was es kann

- **Vier Eintragstypen**: **Login** (Titel, Nutzername/E-Mail, Passwort, URL, Notizen, optional TOTP), **Notiz** (nur verschlüsselter Text),
  **Karte** (Inhaber, Nummer, Ablauf, CVV, PIN) und **Konto** (Inhaber, IBAN/Kontonummer, BIC, Bank, PIN). Favoriten stehen oben. Suche über Titel, Nutzer, URL und Kategorie.
- **Kategorien** wie Ordner: frei eintippen (Vorschläge aus den vorhandenen), Filter-Chips über der Liste. Eine Kategorie
  existiert, solange ein Eintrag sie trägt — nichts zu verwalten, nichts, was beim Sync kollidieren kann.
- **Detailansicht** mit Kopier-Buttons; Passwörter, Kartennummer, CVV und PINs erscheinen nur auf Anfrage (IBAN/BIC im Klartext — sie werden
  zum Überweisen gebraucht und stehen auf jeder Rechnung; die Liste zeigt IBAN und Kartennummer nur als `•••• 1234`).
- **Zwischenablage mit Auto-Löschen** (15/30/60 s): beim Ablauf, beim Zurückkehren in die App (sobald die Zeit abgelaufen ist oder ein Löschen im Hintergrund fehlschlug) und beim Sperren. Einzige Ausnahme: Bei „Sperren im Hintergrund: sofort“ bleibt das Kopierte bis zum Ablauf der Zeit stehen, damit es sich noch in eine andere App einfügen lässt (v1.11).
  In der Android-App wird Kopiertes als **sensibel** markiert — die System-Vorschau zeigt den Inhalt nicht (Android 13+).
- **Passwort-Generator**, auch direkt im Eintragsformular (Panel unter dem Passwortfeld): Zeichen-Modus (8–64 Zeichen, Zeichensätze wählbar, ohne verwechselbare Zeichen)
  und **Diceware** (EFF Large Wordlist, 7.776 Wörter, ~12,9 Bit je Wort). Entropie-Anzeige (im Zeichen-Modus ehrlich um die Pflicht „jeder Zeichensatz kommt vor“ bereinigt), kein Modulo-Bias.
- **TOTP pro Eintrag** (RFC 6238; SHA-1/256/512, 6–8 Stellen, beliebige Periode) mit Restlaufzeit.
- **Passwort-Gesundheit**: markiert wiederverwendete, kurze (< 12) und vorhersagbare Passwörter (Wiederholungen, Zeichen- und
  Tastaturfolgen, Jahreszahlen, häufige Wörter auch in Leetspeak, nur Ziffern) — rein lokal, eigene kleine Heuristik, ausdrücklich eine
  Schätzung. Bei einer vorhersagbaren Tresor-Passphrase fragt die App nach. Das Alter wird bewusst nicht markiert:
  Zwangsrotation ist ein Anti-Muster (NIST SP 800-63B); gewechselt wird, wenn ein Passwort geleakt sein könnte.
  Erlaubt ein Dienst kein längeres Passwort, schaltet ein Häkchen im Eintrag die „kurz“-Markierung ab.
- **Nutzername und E-Mail getrennt**: optionales E-Mail-Feld beim Login für Dienste, die beides verlangen — im Detail mit eigenem
  Kopier-Button, durchsuchbar.
- **Zusatzfelder, immer geheim**: bis zu acht frei benannte Felder je Eintrag (App-PIN, Telefon-Kennwort, Sicherheitsfrage …), bei jedem
  Typ. Der Wert erscheint im Detail nur nach „Anzeigen“ und hat einen eigenen Kopier-Button — so muss nichts davon im Klartext in die Notizen.
  Die Bezeichnung ist durchsuchbar, der Wert nie.
- **Typwechsel mit Rückfrage**: Wird ein Login nachträglich zur Notiz, Karte oder zum Konto, gehen Passwort/TOTP verloren — die App nennt
  die Felder und fragt; Importe melden gekürzte Notizen (Cap 10.000 Zeichen) und überspringen nur echte Dubletten.
- **Papierkorb**: Gelöschtes bleibt **30 Tage** wiederherstellbar (Symbol rechts neben dem `+` in der Suchzeile, mit Zähler), höchstens
  **200 Einträge** gleichzeitig — ist der Papierkorb voll, vernichtet die nächste Löschung die älteste sofort, und die Rückfrage sagt,
  welche das ist. Der Papierkorb zeigt nur Titel, Typ und Löschdatum — kein Aufdecken, kein Kopieren; wer den Inhalt braucht, stellt erst
  wieder her. „Endgültig löschen“ und „Papierkorb leeren“ vernichten sofort. **Solange ein Eintrag im Papierkorb liegt, steht er auch in
  jedem Backup dieses Geräts.** Nach 30 Tagen räumt die App beim nächsten Entsperren selbst auf.
  **Der Papierkorb ist gerätelokal**: beim Zusammenführen wandert die *Löschung* auf die anderen Geräte, der *Inhalt* nicht —
  wiederherstellen lässt sich ein Eintrag nur dort, wo er gelöscht wurde. Das ist Absicht (siehe [Sicherheit](#sicherheit)).
  **„Rückgängig“** (seit v1.9): Nach dem Löschen steht sechs Sekunden lang ein Knopf im Hinweis, der den Eintrag sofort zurückholt.
- **Mehrfachauswahl** (seit v1.9): Das Symbol ☑ neben dem `+` schaltet Kästchen an jeder Zeile ein. Die Leiste unten legt die gewählten Einträge in
  den Papierkorb (mit einem gemeinsamen „Rückgängig“), gibt ihnen eine Kategorie oder markiert sie als Favorit. „Alle“ nimmt nur, was gerade zu
  sehen ist — Suche und Kategorie-Chips wirken weiter. Höchstens 200 auf einmal in den Papierkorb; Sperren, Tab-Wechsel oder „Abbrechen“ beenden die Auswahl.
- **Aegis-Hürde** (optional): nach der Passphrase zusätzlich ein TOTP-Code aus Aegis. Ehrlich benannt als *Hürde*, nicht als
  zweiter Faktor — siehe [Sicherheit](#sicherheit).
- **Auto-Lock**: nach Inaktivität (1–15 min oder aus) und im Hintergrund (sofort / 30 s / 1 min / 5 min). Bei „sofort“ sperrt die App auch,
  während der Datei-Picker offen ist; die gewählte Datei wird nach dem Entsperren importiert.
- **Verschlüsseltes Backup** (`.vault`) und **Zusammenführen** zwischen Geräten: je Eintrag gewinnt
  die neuere Änderung, Löschungen werden ein Jahr lang mitgeführt. Die Datei darf eine andere
  Passphrase haben. Sync z.B. über Syncthing. Papierkorb-Inhalt reist dabei nie mit, nur die Löschung selbst.
  Ein Gerät mit v1.4 oder älter leert den Papierkorb beim Zusammenführen — die Einträge bleiben dort gelöscht, sie tauchen nie wieder
  auf. Erst alle Geräte aktualisieren.
- **Umzug aus Proton Pass direkt aus dem Export** — PGP-verschlüsselt (von Proton empfohlen), ZIP oder JSON: Logins inkl. TOTP,
  Notizen, Kreditkarten, Aliase, WLAN, Identitäten, SSH-Schlüssel; Proton-Tresore werden zu Kategorien, Angepinntes zu Favoriten,
  versteckte Zusatzfelder zu geheimen Zusatzfeldern.
  Der Klartext liegt damit nie auf dem Handy, die Passphrase des Exports wird nur zum Entschlüsseln verwendet.
- **Umzug per CSV** aus **Google Passwortmanager / Chrome**, **Apple Passwörter**, **Firefox**, **KeePassXC**, **Bitwarden**,
  **LastPass**, **1Password** und **NordPass** (und Proton Pass) — automatische Erkennung, weitere Formate über passende
  Spaltennamen; Ordner, Gruppen und Tags werden zu Kategorien, Favoriten bleiben Favoriten, TOTP kommt mit. Dubletten werden übersprungen.
- **Deutsch / Englisch**, Handbuch in der App (`?`-Button), zwei Farbschemata.

## Sicherheit

- **Schlüsselableitung: Argon2id** (Standard 64 MiB, 3 Durchgänge, wählbar 32/64/128 MiB) — memory-hard,
  also teuer für GPU-Angriffe auf eine gestohlene Datei.
- **Verschlüsselung: AES-256-GCM** (native WebCrypto). Ein zufälliger Datenschlüssel (DEK) verschlüsselt den
  Tresor; die Passphrase verpackt nur diesen Schlüssel (KEK). Alle Kopfdaten der Datei (Version, Argon2-Parameter,
  Salt) sind als AAD mitauthentisiert — Manipulation fällt auf. Beim Passphrase-Wechsel wird auch der DEK erneuert.
- **Import-Grenzen**: Eine fremde `.vault` darf keine beliebigen Argon2-Parameter erzwingen
  (8–256 MiB, 1–16 Durchgänge, Arbeitsbudget), keine Übergröße, keine Fremdfelder. Alle Inhalte laufen durch
  eine Feld-Whitelist — auch der lokale Tresor beim Entsperren. Höchstens 10.000 aktive Einträge; Löschmarken
  zählen nicht mit und werden auf 2.000 begrenzt, damit eine fremde Datei den Tresor nicht zufüllen kann.
  Der Papierkorb ist zusätzlich auf 200 Einträge begrenzt (darüber weichen die ältesten eigenen Löschungen).
  **Eine fremde Datei kann darin gar nichts unterbringen**: Papierkorb-Inhalt ist gerätelokal, eingelesene Löschungen kommen
  ausschließlich als inhaltsleere Löschmarke an, und Marken zu unbekannten Einträgen füllen nur den Platz, den die eigenen übrig lassen.
  Ohne diese Regeln konnte eine untergeschobene Datei von 79 KB den gesamten eigenen Papierkorb verdrängen und — über die Löschmarken —
  endgültig gelöschte Einträge beim nächsten Einspielen eines älteren eigenen Backups wieder lebendig machen (Audit run-5, 15.09.2026;
  die zweite Hälfte betraf auch v1.4 und früher).
- **Keine INTERNET-Permission**: Die Android-App fordert genau zwei normale Berechtigungen an, beide für den Fingerabdrucksensor (seit v1.2):
  `USE_BIOMETRIC` und `USE_FINGERPRINT` (letztere nur bis Android 8.1, `maxSdkVersion=27`, mitgebracht von der AndroidX-Biometrie-Bibliothek).
  Kein Internet, keine Dateien, keine Kontakte. Dass sie nicht nach Hause funken *kann*, erzwingt das Betriebssystem — im Manifest der
  APK nachprüfbar (`aapt dump permissions`). Daneben steht dort nur eine von AndroidX automatisch erzeugte, selbst definierte Signatur-Berechtigung
  (`org.alieninvestor.pass.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`), die app-interne Broadcast-Empfänger nicht exportiert;
  sie gibt keiner anderen App Zugriff und erscheint nicht in den Android-Berechtigungen. Der Build bricht ab, sobald irgendeine andere Berechtigung auftaucht.
- **FLAG_SECURE**: keine Screenshots, kein Screen-Recording, keine Vorschau im App-Switcher. **Rückfragen sind seit v1.9 eigene Dialoge im
  Fenster der App**, kein Android-Systemdialog mehr — der erbte diesen Schutz nicht, ein Screenshot bei offener Löschnachfrage zeigte den
  Eintragstitel (intern gefunden beim Gerätetest von Alien Notes, 25.09.2026).
  **allowBackup=false** verhindert ADB- und Cloud-Backups; **data_extraction_rules.xml** schließt zusätzlich den
  Gerät-zu-Gerät-Transfer aus (Android 12+ ignoriert dort `allowBackup`, auch Seedvault-D2D). Backups machst nur du
  selbst über die verschlüsselte `.vault`-Datei.
- **Content-Security-Policy** mit `connect-src 'none'` und ohne `unsafe-inline`: kein Netz, kein Inline-Script.
  Einzige Ergänzung gegenüber dem Sachwert-Tresor ist `'wasm-unsafe-eval'` — Chromium verlangt den Token für
  jede WebAssembly-Kompilierung (Argon2). Er erlaubt ausschließlich WASM, kein String-Eval.
- **Sperre**: Schlüssel und alle Anzeigen werden aus dem Speicher entfernt; nach Fehlversuchen greift eine
  Wartezeit. **Kein Autofill** — und seit v1.13 auch kein fremdes: Die App nimmt ihre WebView vom Android-Autofill-Framework aus, ein anderer
  Passwort-Manager, der als Autofill-Dienst eingerichtet ist, sieht die Passphrase-Felder nicht und kann nicht anbieten, sie zu speichern.
  Nativer Code beschränkt sich auf vier kleine, im Repo im Klartext einsehbare Stücke: FLAG_SECURE,
  Backup-Ausschluss, ein Zwischenablage-Plugin und das Fingerabdruck-Plugin (alle als Quelltext in `patch-hardening.mjs`; der
  Vendor-Hash-Check steht in `build-www.sh`, ebenfalls Klartext).
- **Fingerabdruck-Entsperren, ehrlich eingeordnet** (optional, nur Android-App): Der Datenschlüssel wird zusätzlich unter einem
  32-Byte-Zufallsschlüssel verpackt; den verwahrt der Android-Keystore, gebunden an eine starke Biometrie (Freigabe pro Nutzung mit
  Bestätigung, StrongBox falls vorhanden, ungültig bei neu eingerichtetem Fingerabdruck). Dieser Slot liegt *außerhalb* der `.vault`-Datei
  und ist an den Passphrase-Slot der Datei gebunden — das Dateiformat bleibt unverändert, Backups tragen nichts davon mit. Aktivieren
  verlangt die Passphrase. Ein Fingerabdruck ist kein Geheimnis und lässt sich erzwingen; darum verlangt die App die Passphrase **nach jedem
  Neustart** (beim nächsten Start wird der Slot verworfen und nach der Passphrase mit frischem Zufall neu angelegt), nach einem
  Passphrase-Wechsel und bei neuem Fingerabdruck im System. Der Neustart-Zwang ist eine Regel im Code, keine kryptografische Garantie —
  im Zweifel Handy neu starten. **Schalter „auch nach Neustart“ (seit v1.8, ab Werk aus):** Beim Aktivieren lässt sich ankreuzen, dass der
  Fingerabdruck über einen Neustart hinaus gilt. Der Neustart-Zwang schützt nur in einem Fall: Jemand kennt oder erzwingt die Geräte-PIN
  **und** kann den Finger erzwingen — dann hilft ein Neustart, weil die App danach die Passphrase will. GrapheneOS startet ab Werk neu, sobald
  das Handy 18 Stunden am Stück gesperrt bleibt (einstellbar von 10 Minuten bis 72 Stunden); wer den Zähler kurz stellt, tippt die Passphrase
  entsprechend oft. Mit dem Haken bleibt nach einem Neustart allein die Geräte-PIN-Pflicht des Systems; Passphrase-Wechsel, neuer
  Fingerabdruck und „Jetzt sperren“ verlangen die Passphrase weiterhin. Die Wahl steckt im Slot selbst und ist zusammen mit der
  Boot-Kennung des Geräts (seit v1.8 der Android-Boot-Zähler) im verschlüsselten Slot mitauthentisiert — nachträglich lässt sie sich nicht
  umschreiben, ändern geht nur durch Deaktivieren und erneutes Aktivieren. **Welche Biometrie zählt:** Android kennt keine „nur Fingerabdruck“-Bindung; der Schlüssel gilt für jede
  Biometrie der Klasse „stark“ auf dem Gerät. Wo eine starke Gesichtserkennung eingerichtet ist (manche Stock-Pixel; GrapheneOS hat keine),
  öffnet auch sie den Tresor, nach einem Bestätigungs-Tipp. Die App setzt einen Fingerabdrucksensor voraus. **„Jetzt sperren“ ist der bewusste
  Riegel:** Der nächste Start verlangt dann die Passphrase (kein Knopf, kein Prompt), danach gilt der Fingerabdruck wieder — für Grenze,
  Weitergeben des Handys, jede Lage, in der ein Finger erzwungen werden könnte. Berechtigungen: siehe oben.
- **Aegis-Hürde, ehrlich eingeordnet**: Der TOTP-Schlüssel liegt verschlüsselt im Tresor selbst und wird erst geprüft, nachdem
  die Passphrase die Datei geöffnet hat. Wer Tresordatei *und* Passphrase besitzt, entschlüsselt sie außerhalb der App — das Format
  steht unten. Die Hürde hilft gegen jemanden, der die Passphrase abgeschaut hat und das entsperrte Handy in der Hand hält.
  Ein echter zweiter Faktor braucht eine Instanz, die ihn erzwingt (bei Cloud-Diensten der Server); für eine lokale Datei bleibt
  die Passphrase der einzige kryptografische Schutz. Backups tragen die Hürde nicht mit.
- **Fremdcode**: nur die Argon2-Bibliothek [hash-wasm](https://github.com/Daninet/hash-wasm) (MIT, v4.12.0)
  und die [EFF-Wortliste](https://www.eff.org/dice) (CC BY 3.0) — beide gebündelt, der Build prüft ihre
  SHA-256-Hashes und dass die Bibliothek weder `eval` noch Netzzugriffe enthält:
  ```
  vendor/hash-wasm/argon2.umd.min.js   dcec617a2e1b700fa132d1583a186cb70611113395e869f2dd6cc82b415d3094
  vendor/eff/eff_large_wordlist.txt    addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e
  vendor/eff/eff-wordlist.js           b7ccf3dd6958efa9000d8d68c63ebfdbab4a98493cf2fbcd25e1fc31ba57a6b7  (aus der .txt erzeugt, im Build gegengeprüft)
  ```
  Der **OpenPGP-Leser** für Proton-Exporte ist eigener, bewusst kleiner Code (nur symmetrische Nachrichten: SKESK v4 mit
  S2K, SEIPD v1 mit MDC-Prüfung — exakt Protons Variante). Die AES-Blockchiffre dafür ist eigener Code (nur Verschlüsselungsrichtung,
  WebCrypto kennt weder ECB noch CFB) — die Testsuite prüft sie gegen FIPS-197-Vektoren und WebCrypto; ihre Schlüssel dienen nur dem
  Import und werden danach genullt, der Tresorschlüssel berührt sie nie. Neuere
  OpenPGP-Varianten (AEAD, Argon2-S2K, Public-Key) werden klar abgewiesen statt still zu scheitern. Der QR-Encoder für die
  Aegis-Einrichtung ist ebenfalls eigener Code (`qr.js`).
- **Desktop-Fassung (Linux), ehrlich eingeordnet:**
  - **Kein Netz, vom System erzwungen:** Das Flatpak hat keine Netzwerk-Berechtigung, im Käfig gibt es nur `lo`. Zusätzlich blockt die App
    selbst jede Verbindung (Content-Security-Policy, Anfrage-Filter, WebRTC über einen toten Proxy ins Leere). **Keine Dateien:** Backup und Import laufen
    über den Dateidialog des Systems (Portal), der nur die gewählte Datei freigibt.
  - **Härtung der Hülle:** Chromium-Sandbox über Flatpaks eigenen Käfig (`zypak`), Renderer ohne Node, Kontext-Isolation, nur die eigene
    Seite erreicht die Brücke zum Hauptprozess. Electron-Fuses: kein `ELECTRON_RUN_AS_NODE`, kein `NODE_OPTIONS`, kein `--inspect`, App nur aus
    dem Archiv. Fernsteuerung (`--remote-debugging-*`) wird verweigert, DevTools lassen sich nicht öffnen, kein Anwendungsmenü.
  - **Tresor als Datei** (Rechte 600, Ordner 700), atomar geschrieben — ein Absturz oder eine volle Platte hinterlässt nie einen halben Tresor.
  - **Zwischenablage:** Kopiertes ist für KDE als Passwort markiert, Klipper nimmt es nicht in den Verlauf (unter Plasma geprüft); andere Zwischenablage-Manager
    können die Markierung ignorieren. Die App löscht nur ihre eigene Kopie — nach der eingestellten Zeit, beim Sperren und beim Beenden.
    Das gilt auch für Strg+C, Strg+X und für Text, den du nur mit der Maus markierst (unter Linux per Mittelklick einfügbar).
  - **Grenzen:** Die App liefert ihre Browser-Engine (Electron 44) selbst mit — Sicherheits-Updates dafür kommen nur mit einer neuen
    App-Version, nicht über das System. **Kein Schutz vor Bildschirmfotos** (Linux kennt kein Gegenstück zu FLAG_SECURE). Unter **X11** kann
    jedes laufende Programm Tastatur und Zwischenablage mitlesen — das gilt für jeden Passwort-Manager, Wayland trennt Programme besser.
    Bei **Bildschirmsperre und Ruhezustand sperrt die App nicht von selbst** (im Flatpak erfährt sie davon nichts): Systemsperre nutzen (vor allem beim Ruhezustand), dazu eine
    kurze Inaktivitäts-Sperre, Strg+L sperrt sofort. Kein Fingerabdruck. Aus „vier kleinen nativen Stücken“ werden am Desktop drei
    kleine Dateien (`desktop/main.js`, `desktop/preload.js`, `desktop/atomic.js`) plus Electron.
  - **Schnell-Entsperren mit PIN, ehrlich eingeordnet** (optional, seit v1.8, nur Desktop): Nach einer Sperre durch Inaktivität oder
    Hintergrund genügt eine PIN mit 6 bis 12 Ziffern statt der Passphrase — bis die App beendet wird, höchstens 24 Stunden. Beim Einrichten
    (verlangt die Passphrase) verpackt die App eine Kopie des Datenschlüssels unter einem aus der PIN abgeleiteten Schlüssel (Argon2id mit den
    Parametern des Tresors, eigenes Salz) und hält sie **nur im Arbeitsspeicher**; die Sperre räumt die Sitzung wie bisher ab, diese Kopie
    bleibt. Nichts davon wird gespeichert, die Tresordatei bleibt unverändert, Backups tragen nichts davon mit. **Was es kostet:** Sechs Ziffern
    sind ein winziger Suchraum; mit den Argon2-Parametern des Tresors ist er auf einer gewöhnlichen CPU in wenigen Stunden durchprobiert, auf einer
    einzelnen Grafikkarte in etwa zehn Minuten — als Schutz für die Tresordatei reicht das nie, jede weitere Ziffer verzehnfacht nur den Aufwand. Die PIN schützt allein diese Kopie. „Gesperrt“ heißt mit PIN nicht mehr „Schlüssel
    aus dem Speicher gelöscht“: Wer den Arbeitsspeicher des laufenden Programms auslesen kann, hat den verpackten Schlüssel und kann PINs
    offline raten — die drei Fehlversuche sind eine Regel im Code, keine kryptografische Grenze. Verworfen wird die PIN nach drei
    Fehlversuchen, nach einem Passphrase-Wechsel, beim Löschen des Tresors, bei einer veränderten oder getauschten Tresordatei (die Kopie ist
    an Kopfdaten und Passphrase-Slot der Datei gebunden), nach 24 Stunden und beim Beenden. „Jetzt sperren“ (Strg+L) ist der Riegel: danach
    einmal die Passphrase, dann gilt die PIN wieder. Wer den Rechner mit anderen teilt oder unverschlüsselten Swap hat, lässt die PIN aus.
  - **„Hintergrund“ heißt am Desktop minimiert oder versteckt.** Ein Wechsel zu einem anderen Fenster (Alt+Tab) sperrt nicht, leert aber
    getippte Passphrasen und PINs.
  - Drei **interne** Audits am Desktop-Zweig (22./23.09.2026: zweimal die Hülle, einmal das PIN-Entsperren samt Zusammenspiel der drei
    Pforten), alle Funde behoben — kein unabhängiges Audit.
- **Grenzen, ehrlich benannt**: Im Hintergrund leert die Android-App die Zwischenablage nur, solange Android sie nicht eingefroren
  hat (meist nach dem zweiten App-Wechsel); danach erst beim Zurückkehren. Ab Android 13 leert das System nach etwa 1 h selbst, davor nicht.
  Im Browser gibt es keine Maskierung der Clipboard-Vorschau. Passwort und 2FA im selben Tresor schwächen die Faktor-Trennung —
  kritische Konten besser mit Aegis absichern.

## Open Source & selbst prüfen

Der komplette **Client-Code ist offen** ([MIT](LICENSE)): `index.html` (UI), `app.js` (App + Krypto), `qr.js` (QR-Encoder), `icon.svg`, `vendor/`.
Die Desktop-Hülle liegt vollständig in `desktop/` (Hauptprozess, Brücke, Build-Skript mit gepinntem Electron-Hash, Flatpak-Manifest).

- **Kein Nach-Hause-Telefonieren:** keine `fetch`/`XMLHttpRequest`/WebSocket-Aufrufe, keine externen Skripte, keine CDNs.
  Einzige externe URL ist der Spenden-Link im Footer.
- **Krypto:** `crypto.subtle` (AES-256-GCM, HMAC für TOTP, `wrapKey`/`unwrapKey`) plus Argon2id aus hash-wasm.
- `roundtrip-test.mjs` führt die Vault-Format-Funktionen **direkt aus `app.js`** aus (kein Nachbau) und belegt
  u.a.: Roundtrip, Manipulations-Erkennung (AAD), Parameter-Grenzen, Passphrase-Wechsel mit DEK-Rotation,
  Merge-Eigenschaften (kommutativ, idempotent), RFC-6238-Testvektoren, CSV-Parser, Proton-JSON-Zuordnung, ZIP-Leser und
  den OpenPGP-Entschlüsseler gegen mit GnuPG erzeugte Nachrichten (alte und neue Paketköpfe, Partial-Längen, Kompression,
  falsche Passphrase, manipulierte Daten, abgewiesene AEAD-/Argon2-Varianten).

Datei-Format (`.vault`, JSON):
```
{ magic:"AIPV1", ver:1,
  kdf:{ name:"argon2id", m, t, p, salt },   // m in KiB
  wrap:{ iv, ct },                          // DEK, AES-GCM mit KEK, AAD = Kopfdaten|"wrap"
  body:{ iv, ct } }                         // Tresor, AES-GCM mit DEK, AAD = Kopfdaten|"body"
```

> Build-/Signatur-/Deploy-Interna liegen bewusst nicht im öffentlichen Teil — sie enthalten keine Geheimnisse,
> aber auch keinen Mehrwert für die Prüfung des Clients.

## Bedienung

> 💡 Das komplette Handbuch steckt in der App — der „?"-Button oben rechts öffnet es (offline).

### Umzug aus Proton Pass (empfohlen: PGP-verschlüsselt)

1. Im Web-Client oder der Browser-Erweiterung (die Mobil-Apps können nicht exportieren): Zahnrad → **Exportieren** →
   Format **PGP-verschlüsselt**, Passphrase vergeben, Dateianhänge aus.
2. Das ZIP unverändert aufs Handy (Syncthing, USB) — es ist verschlüsselt und darf liegen bleiben.
3. In Alien Pass **Sicherung → Proton-Export wählen** → Passphrase des Exports eingeben → importieren.
   Unverschlüsselte ZIP-/JSON-Exporte gehen genauso, dann ohne Passphrase.

### Umzug per CSV (Google, Apple, Firefox, KeePassXC, Bitwarden, LastPass, 1Password, NordPass, andere)

1. Dort exportieren: **Google Passwortmanager / Chrome** → Menü → Passwörter und Autofill → Google Passwortmanager → Einstellungen →
   Passwörter exportieren · **Apple Passwörter** (nur am Mac) → Ablage → Alle Passwörter in eine Datei exportieren · **Firefox** →
   about:logins → ⋯ → Passwörter exportieren · **KeePassXC** → Datenbank → Export → CSV-Datei · **Bitwarden** (Web-Tresor) → Tools →
   Export → .csv · **LastPass** → Advanced Options → Export · **1Password** → Datei → Exportieren → CSV · **NordPass** → Einstellungen →
   Import and Export → Export items.
2. Datei aufs Handy, in Alien Pass **Sicherung → CSV-Datei wählen**. Das Format wird an der Kopfzeile erkannt und im Ergebnis genannt;
   jede andere CSV mit Spalten für Titel/Name (oder URL) und Passwort geht ebenfalls.
3. **Danach die CSV-Datei löschen** — sie enthält alle Passwörter im Klartext (bei Google/Chrome liegt sie im Downloads-Ordner des Browsers).

### Backup & Sync

1. **Sicherung → Backup erstellen** schreibt `alien-pass-JJJJ-MM-TT.vault` in „Dokumente" (verschlüsselt).
2. Auf dem zweiten Gerät Alien Pass einrichten (eigene Passphrase möglich), dann **Sicherung → .vault-Datei wählen**
   → Passphrase **der Datei** eingeben → Zusammenführen.
3. Für laufenden Sync: auf beiden Geräten regelmäßig exportieren und das jeweils andere Backup importieren.
   Änderungen und Löschungen werden zusammengeführt; beide Seiten landen beim gleichen Stand.

---
100 % lokal · Alien Investor Stil · keine Konto-, keine Server-Abhängigkeit.
