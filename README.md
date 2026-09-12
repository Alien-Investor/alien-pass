# Alien Pass

Lokaler, verschlüsselter **Passwort-Manager** für Android / GrapheneOS.
Läuft komplett **offline** — keine Cloud, kein Server, kein Konto, keine Telemetrie.
Die App fordert **keine Android-Berechtigung** an, nicht einmal Internet. Deine Passwörter verlassen das Gerät nie im Klartext.

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

## Erster Start

Beim ersten Öffnen vergibst du deine **Passphrase** (mindestens 12 Zeichen; der Vorschlag-Button
erzeugt sechs Würfelwörter aus der EFF-Liste). Die App misst dabei, wie schnell dein Gerät die
Schlüsselableitung schafft, und schlägt eine passende Argon2-Stufe vor.

> ⚠️ **Kein Reset, kein Backdoor.** Passphrase vergessen = Daten weg.
> Lege ein Backup an (verschlüsselte `.vault`-Datei) und bewahre die Passphrase sicher auf.

## Was es kann

- **Drei Eintragstypen**: **Login** (Titel, Nutzername/E-Mail, Passwort, URL, Notizen, optional TOTP), **Notiz** (nur verschlüsselter Text)
  und **Karte** (Inhaber, Nummer, Ablauf, CVV, PIN). Favoriten stehen oben. Suche über Titel, Nutzer, URL und Kategorie.
- **Kategorien** wie Ordner: frei eintippen (Vorschläge aus den vorhandenen), Filter-Chips über der Liste. Eine Kategorie
  existiert, solange ein Eintrag sie trägt — nichts zu verwalten, nichts, was beim Sync kollidieren kann.
- **Detailansicht** mit Kopier-Buttons; Passwörter, Kartennummer, CVV und PIN erscheinen nur auf Anfrage.
- **Zwischenablage mit Auto-Löschen** (15/30/60 s): beim Ablauf, beim Zurückkehren in die App (sobald die Zeit abgelaufen ist oder ein Löschen im Hintergrund fehlschlug) und beim Sperren.
  In der Android-App wird Kopiertes als **sensibel** markiert — die System-Vorschau zeigt den Inhalt nicht (Android 13+).
- **Passwort-Generator**: Zeichen-Modus (8–64 Zeichen, Zeichensätze wählbar, ohne verwechselbare Zeichen)
  und **Diceware** (EFF Large Wordlist, 7.776 Wörter, ~12,9 Bit je Wort). Entropie-Anzeige, kein Modulo-Bias.
- **TOTP pro Eintrag** (RFC 6238; SHA-1/256/512, 6–8 Stellen, beliebige Periode) mit Restlaufzeit.
- **Passwort-Gesundheit**: markiert wiederverwendete, kurze (< 12) und seit über zwei Jahren unveränderte Einträge — rein lokal.
  Erlaubt ein Dienst kein längeres Passwort, schaltet ein Häkchen im Eintrag die „kurz“-Markierung ab.
- **Typwechsel mit Rückfrage**: Wird ein Login nachträglich zur Notiz oder Karte, gehen Passwort/TOTP verloren — die App nennt
  die Felder und fragt; Importe melden gekürzte Notizen (Cap 10.000 Zeichen) und überspringen nur echte Dubletten.
- **Aegis-Hürde** (optional): nach der Passphrase zusätzlich ein TOTP-Code aus Aegis. Ehrlich benannt als *Hürde*, nicht als
  zweiter Faktor — siehe [Sicherheit](#sicherheit).
- **Auto-Lock**: nach Inaktivität (1–15 min oder aus) und im Hintergrund (sofort / 30 s / 1 min / 5 min).
- **Verschlüsseltes Backup** (`.vault`) und **Zusammenführen** zwischen Geräten: je Eintrag gewinnt
  die neuere Änderung, Löschungen werden ein Jahr lang mitgeführt. Die Datei darf eine andere
  Passphrase haben. Sync z.B. über Syncthing.
- **Umzug aus Proton Pass direkt aus dem Export** — PGP-verschlüsselt (von Proton empfohlen), ZIP oder JSON: Logins inkl. TOTP,
  Notizen, Kreditkarten, Aliase, WLAN, Identitäten, SSH-Schlüssel; Proton-Tresore werden zu Kategorien, Angepinntes zu Favoriten.
  Der Klartext liegt damit nie auf dem Handy, die Passphrase des Exports wird nur zum Entschlüsseln verwendet.
- **Umzug per CSV** aus **KeePassXC** und **Bitwarden** (und Proton Pass) — automatische Erkennung, weitere Formate über
  passende Spaltennamen, Gruppen/Ordner werden zu Kategorien. Dubletten werden übersprungen.
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
- **Keine INTERNET-Permission**: Die Android-App fordert keine Berechtigung von dir oder vom System an — kein Internet,
  keine Dateien, keine Kontakte. Dass sie nicht nach Hause funken *kann*, erzwingt das Betriebssystem — im Manifest der
  APK nachprüfbar. Dort steht nur eine von AndroidX automatisch erzeugte, selbst definierte Signatur-Berechtigung
  (`org.alieninvestor.pass.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`), die app-interne Broadcast-Empfänger nicht exportiert;
  sie gibt keiner anderen App Zugriff und erscheint nicht in den Android-Berechtigungen.
- **FLAG_SECURE**: keine Screenshots, kein Screen-Recording, keine Vorschau im App-Switcher.
  **allowBackup=false** verhindert ADB- und Cloud-Backups; **data_extraction_rules.xml** schließt zusätzlich den
  Gerät-zu-Gerät-Transfer aus (Android 12+ ignoriert dort `allowBackup`, auch Seedvault-D2D). Backups machst nur du
  selbst über die verschlüsselte `.vault`-Datei.
- **Content-Security-Policy** mit `connect-src 'none'` und ohne `unsafe-inline`: kein Netz, kein Inline-Script.
  Einzige Ergänzung gegenüber dem Sachwert-Tresor ist `'wasm-unsafe-eval'` — Chromium verlangt den Token für
  jede WebAssembly-Kompilierung (Argon2). Er erlaubt ausschließlich WASM, kein String-Eval.
- **Sperre**: Schlüssel und alle Anzeigen werden aus dem Speicher entfernt; nach Fehlversuchen greift eine
  Wartezeit. **Kein Autofill, keine Biometrie** (geplant). Nativer Code beschränkt sich auf drei kleine, im Repo
  einsehbare Stücke: FLAG_SECURE, Backup-Ausschluss und ein Zwischenablage-Plugin (`patch-hardening.mjs`).
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
  S2K, SEIPD v1 mit MDC-Prüfung — exakt Protons Variante). AES läuft in WebCrypto, Schlüssel bleiben dort; neuere
  OpenPGP-Varianten (AEAD, Argon2-S2K, Public-Key) werden klar abgewiesen statt still zu scheitern. Der QR-Encoder für die
  Aegis-Einrichtung ist ebenfalls eigener Code (`qr.js`).
- **Grenzen, ehrlich benannt**: Im Hintergrund leert die Android-App die Zwischenablage nur, solange Android sie nicht eingefroren
  hat (meist nach dem zweiten App-Wechsel); danach erst beim Zurückkehren. Ab Android 13 leert das System nach etwa 1 h selbst, davor nicht.
  Im Browser gibt es keine Maskierung der Clipboard-Vorschau. Passwort und 2FA im selben Tresor schwächen die Faktor-Trennung —
  kritische Konten besser mit Aegis absichern.

## Open Source & selbst prüfen

Der komplette **Client-Code ist offen** ([MIT](LICENSE)): `index.html` (UI), `app.js` (App + Krypto), `qr.js` (QR-Encoder), `icon.svg`, `vendor/`.

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

### Umzug per CSV (KeePassXC, Bitwarden, andere)

1. Dort exportieren: **KeePassXC** → Datenbank → Exportieren → CSV · **Bitwarden** → Tools → Tresor exportieren → .csv.
2. Datei aufs Handy, in Alien Pass **Sicherung → CSV-Datei wählen**.
3. **Danach die CSV-Datei löschen** — sie enthält alle Passwörter im Klartext.

### Backup & Sync

1. **Sicherung → Backup erstellen** schreibt `alien-pass-JJJJ-MM-TT.vault` in „Dokumente" (verschlüsselt).
2. Auf dem zweiten Gerät Alien Pass einrichten (eigene Passphrase möglich), dann **Sicherung → .vault-Datei wählen**
   → Passphrase **der Datei** eingeben → Zusammenführen.
3. Für laufenden Sync: auf beiden Geräten regelmäßig exportieren und das jeweils andere Backup importieren.
   Änderungen und Löschungen werden zusammengeführt; beide Seiten landen beim gleichen Stand.

---
100 % lokal · Alien Investor Stil · keine Konto-, keine Server-Abhängigkeit.
