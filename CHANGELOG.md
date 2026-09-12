# Changelog — Alien Pass

## v1.1 — 2026-09-12
- **Eintragstypen:** Login, Notiz (nur verschlüsselter Text) und Karte (Inhaber, Nummer, Ablauf, CVV, PIN — maskiert, kopierbar)
- **Kategorien** wie Ordner: frei eintippen, Vorschläge aus vorhandenen, Filter-Chips über der Liste, Suche findet auch die Kategorie
- **Proton-Pass-Import direkt aus dem Export** — PGP-verschlüsselt (empfohlen), ZIP oder JSON: eigener minimaler OpenPGP-Leser
  (symmetrisch, AES in WebCrypto, MDC-Prüfung), ZIP-Leser; Logins inkl. TOTP/Extra-Felder, Notizen, Kreditkarten, Aliase, WLAN,
  Identitäten, SSH-Schlüssel; Proton-Tresore → Kategorien, angepinnt → Favorit; Papierkorb und Anhänge bleiben außen vor
- **CSV:** KeePassXC-Gruppen, Bitwarden-Ordner und Proton-Tresore werden zu Kategorien; Notizen kommen als Notiz-Typ
- **Aegis-Hürde** beim Entsperren (optional, TOTP): ehrlich als Hürde benannt — kein kryptografischer Zweitfaktor
- **Kurz-Passwort-Schalter** pro Login-Eintrag, wenn ein Dienst kein längeres Passwort erlaubt
- **Zwischenablage (Android):** natives Mini-Plugin markiert Kopiertes als „sensibel“ — keine System-Vorschau des Inhalts (Android 13+),
  Leeren per clearPrimaryClip; weiterhin keine Berechtigungen
- Tresorformat unverändert (AIPV1); neue Felder sind additiv. Ein v1.0-Gerät verwirft sie beim Zusammenführen still.
- **Security-Audit run-2** (13 Funde, alle gefixt): Sperrbildschirm behält keine getippte Passphrase mehr (Fehlversuch, Verstecken);
  Typwechsel beim Bearbeiten fragt nach und nennt die Felder, die verloren gehen; Passwort-Anzeige-Schalter setzt sich je Eintrag zurück;
  Idle-Sperre gilt auch auf dem Aegis-Code-Bildschirm; Fehlversuchs-Bremse überlebt Neustart; OpenPGP-Leser mit eigener AES-Blockchiffre
  (20 MB in < 1 s statt 5 s/900 MB), Quick-Check vor der Volltext-Entschlüsselung, max. 4 SKESK-Pakete, streamendes Inflate mit Abbruch
  (Deflate-Bombe); Import-Dubletten nur bei wirklich gleichem Inhalt (TOTP/URL/Notizen/Kartendaten zählen), Notiz-Kürzung wird gemeldet,
  Geheimnisse vor dem Freitext; Clipboard-Leeren nativ auch im Hintergrund (bis Android die App einfriert), Doku zur 1-h-Systemlöschung
  auf Android 13+ präzisiert; Aegis-QR-PNG wird aus dem Cache gelöscht; Kategorien/Titel ohne Steuer- und Nullbreiten-Zeichen,
  „Alle“-Chip ohne Sentinel, hängender Filter behoben; APK-Endkontrolle prüft allowBackup verankert; qr.js + Test-Fixtures im Repo im Klartext.

## v1.0 — 2026-09-11
Erstes Release. Offline-Passwort-Manager für Android/GrapheneOS im Alien-Investor-Stil.

- Einträge mit Titel, Nutzername, Passwort, URL, Notizen, TOTP, Favorit; Suche; Detailansicht mit Kopier-Buttons
- Argon2id (32/64/128 MiB, Selbstmessung beim Einrichten) + AES-256-GCM; Datenschlüssel per Passphrase verpackt, Kopfdaten als AAD authentisiert
- Auto-Lock nach Inaktivität und im Hintergrund (sofort bis 5 min); Zwischenablage mit Auto-Löschen (15/30/60 s)
- Passwort-Generator: Zeichen (8–64) und Diceware (EFF Large Wordlist), Entropie-Anzeige
- TOTP pro Eintrag (SHA-1/256/512, 6–8 Stellen), Passwort-Gesundheit (doppelt / kurz / alt)
- Verschlüsseltes `.vault`-Backup und Zusammenführen zwischen Geräten (neuere Änderung gewinnt, Löschungen ein Jahr mitgeführt)
- CSV-Import aus Proton Pass, KeePassXC, Bitwarden und generischen Exporten
- Härtung: keine Berechtigungen (kein INTERNET), FLAG_SECURE, allowBackup=false, CSP ohne unsafe-inline und mit connect-src 'none', Import-Grenzen für Argon2-Parameter, Feld-Whitelist auch beim Entsperren, Vendor-Hash-Prüfung im Build
- Deutsch/Englisch, Handbuch in der App, zwei Farbschemata
