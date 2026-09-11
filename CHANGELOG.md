# Changelog — Alien Pass

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
