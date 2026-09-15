# Changelog — Alien Pass

## v1.5 — 2026-09-15
- **Sicherheits-Audit run-5 (15.09.2026) vor der Auslieferung:** Drei Funde mittleren Schweregrads, alle behoben. (1) Eine untergeschobene
  `.vault` von 79 KB konnte den **kompletten eigenen Papierkorb** verdrängen — die Einträge einer fremden Datei bekommen beim Einlesen
  immer den jüngsten Löschzeitpunkt und drängten die eigenen aus dem 200er-Deckel. (2) Dieselbe Mechanik eine Ebene höher verdrängte die
  **Löschmarken**; ohne Marke holte das nächste Einspielen eines älteren eigenen Backups gelöschte Einträge **wieder lebendig zurück**,
  auch solche, die über „Endgültig löschen“ vernichtet worden waren — dieser Teil betraf auch v1.4 und früher. (3) Ein Backup, das direkt
  nach dem Entsperren erstellt wurde, enthielt noch Papierkorb-Inhalte, die die App im selben Moment als geräumt anzeigte.
  **Die Folge für dich:** der Papierkorb ist jetzt **gerätelokal** — beim Zusammenführen wandert die Löschung auf deine anderen Geräte,
  der Inhalt nicht. Wiederherstellen geht nur dort, wo du gelöscht hast. Außerdem nennt die App den 200er-Deckel jetzt überall, wo sie
  vorher nur „30 Tage“ versprach, und die Rückfrage sagt dir, welcher Eintrag bei vollem Papierkorb vernichtet wird.
- **Papierkorb:** Gelöschte Einträge landen für **30 Tage** im Papierkorb und lassen sich vollständig zurückholen — bisher war Löschen
  sofort und unwiderruflich. Der Papierkorb hängt am Symbol rechts neben dem `+` in der Suchzeile; die Zahl daneben sagt, wie viel drin ist.
  Er zeigt **nur Titel, Typ und Löschdatum** — kein Aufdecken, kein Kopieren. Wer den Inhalt braucht, stellt erst wieder her.
  „Endgültig löschen“ und „Papierkorb leeren“ vernichten sofort. Nach 30 Tagen räumt die App beim nächsten Entsperren selbst auf;
  danach bleibt wie bisher ein Jahr lang nur die Löschmarke für den Abgleich zwischen Geräten.
  **Ehrlich dazu:** Solange ein Eintrag im Papierkorb liegt, steht er auch in jedem Backup dieses Geräts. Wer etwas wirklich sofort
  loswerden will, nutzt „Endgültig löschen“. Mehr als 200 Einträge fasst der Papierkorb nicht. Ein Gerät mit v1.4 oder älter leert den Papierkorb beim Zusammenführen — dort bleiben die Einträge gelöscht,
  sie tauchen nie wieder auf.
- **Eigene Auswahl- und Vorschlagsfelder:** Die Kategorie-Vorschläge beim Bearbeiten und die sechs Auswahlfelder (Schlüsselableitung,
  Trenner, Auto-Sperre, Hintergrund, Zwischenablage) klappten bisher als graue Systemliste auf. Jetzt öffnen sie im Stil der App, mit
  Filter beim Tippen im Kategoriefeld. Escape oder ein Klick daneben schließt.
- **Speichern abgesichert:** Wird der Tresor gesperrt oder die Passphrase gewechselt, während gerade gespeichert wird, schreibt der
  angefangene Vorgang nicht mehr über den neuen Stand. Querfund aus dem Sachwert-Tresor; im Alltag kaum erreichbar, jetzt ausgeschlossen.

## v1.4.1 — 2026-09-13
- **Versionsanzeige korrigiert:** Die Einstellungen zeigten seit v1.3 weiterhin „v1.2“. Die Anzeige kommt jetzt aus derselben Quelle wie
  die Versionsnummer der App und wird beim Bauen und im Test gegengeprüft. Sonst keine Änderung; Tresor-Format und Daten bleiben gleich.

## v1.4 — 2026-09-13
- **Zusatzfelder (immer geheim):** Jeder Eintrag — Login, Notiz, Karte, Konto — kann bis zu acht frei benannte Zusatzfelder tragen
  (App-PIN, Telefon-Kennwort, Sicherheitsfrage, Auszahlungs-PIN …). Der Wert ist grundsätzlich geheim: im Formular maskiert (ein Schalter
  zeigt alle), im Detail nur nach „Anzeigen“, mit eigenem Kopier-Button (Auto-Löschen wie beim Passwort). Bisher landete so etwas im Klartext
  in den Notizen. Die Bezeichnung ist durchsuchbar, der Wert nie; die Liste zeigt nichts davon. Ein Typwechsel lässt die Zusatzfelder stehen.
  Beim **Proton-Import** werden versteckte Zusatzfelder („Hidden“) zu Zusatzfeldern statt zu Notizzeilen (die ersten acht; Text-Felder
  bleiben Notizzeilen). Ein Gerät mit v1.3 oder älter verwirft die Zusatzfelder beim Zusammenführen still: erst alle Geräte aktualisieren.
- **E-Mail-Feld (optional) beim Login:** für Konten, die Nutzername UND E-Mail-Adresse brauchen. Klartext im Detail mit eigenem Kopier-Button,
  durchsuchbar; die Liste zeigt weiter den Nutzernamen (die E-Mail nur, wenn kein Nutzername gesetzt ist). Proton-Importe (ZIP/PGP/JSON und CSV)
  legen eine zweite Adresse jetzt in dieses Feld statt als Zeile „E-Mail: …“ in die Notizen. Auch dieses Feld geht auf älteren Geräten beim
  Zusammenführen verloren.
- **Audit run-4 (Diff-Durchsicht, 13.09.2026):** keine ausnutzbare Lücke. Behoben: „Zusatzfelder anzeigen“ blieb nach dem Entfernen der letzten
  Zeile aktiv (nächste Zeile wäre unmaskiert gewesen); das Generator-Panel hob ein manuelles Verbergen des Passworts bei jeder Regleränderung
  wieder auf. Neu: der Proton-Import meldet, wenn versteckte Felder über dem Deckel von acht im Klartext in den Notizen gelandet sind.
- **Generator direkt im Eintragsformular:** „Generieren“ klappt unter dem Passwortfeld ein Panel auf — Zeichen oder Würfelwörter, Länge bzw.
  Wortzahl, Zeichensätze, Trenner, Großschreibung, „+ Ziffer“ — und schreibt bei jeder Änderung sofort ein neues Passwort ins Feld, mit
  Entropie-Anzeige. Kein Wechsel in den Generator-Tab mehr nötig. Beide Stellen teilen sich dieselben Einstellungen (nur für die Sitzung,
  nichts davon liegt im Tresor). „Fertig“ schließt das Panel und maskiert das Feld wieder.

## v1.3 — 2026-09-12
- **Neuer Eintragstyp „Konto“** (Bankkonto): Kontoinhaber, IBAN/Kontonummer, BIC/SWIFT, Bank, optional PIN. IBAN und BIC stehen im Detail
  im Klartext (werden zum Überweisen gebraucht), die PIN nur nach „Anzeigen“; die Liste zeigt die IBAN nur als `•••• 1234`. IBAN/BIC werden
  beim Speichern normalisiert (Großschreibung, nur Buchstaben/Ziffern, IBAN mit Leerzeichen). Importe (Proton, CSV) bleiben unverändert —
  sie kennen keinen Kontotyp. Ein Gerät mit v1.2 oder älter stuft einen Konto-Eintrag beim Zusammenführen zu einem leeren Login zurück:
  erst alle Geräte aktualisieren, dann Konten anlegen.
- **Alters-Markierung entfernt:** „seit über zwei Jahren unverändert“ gibt es nicht mehr. Ein starkes Zufallspasswort wird mit der Zeit
  nicht schwächer; Zwangsrotation ist ein Anti-Muster (NIST SP 800-63B, BSI). Gewechselt wird, wenn ein Passwort geleakt sein könnte.
  „wiederverwendet“ und „kurz“ bleiben.
- **Ehrliche Entropie-Anzeige im Zeichen-Modus:** Die Vorgabe „jeder gewählte Zeichensatz kommt mindestens einmal vor“ verwirft Kandidaten
  und kostet Entropie — das wird jetzt abgezogen (8 Zeichen/4 Sätze: 50 statt 51 Bit; ab 16 Zeichen unter 0,25 Bit). Wörter-Modus unverändert.

## v1.2 — 2026-09-12
- **Fingerabdruck-Entsperren (Android, optional):** Der Datenschlüssel wird zusätzlich unter einem 32-Byte-Zufallsschlüssel verpackt,
  den der Android-Keystore nur nach einem starken Fingerabdruck herausgibt (Freigabe pro Nutzung, StrongBox falls vorhanden, ungültig bei
  neu eingerichtetem Fingerabdruck). Slot liegt außerhalb der `.vault`-Datei — Backups tragen nichts davon mit. Aktivieren verlangt die
  Passphrase. **Passphrase-Pflicht nach jedem Neustart** (Slot wird verworfen und nach der Passphrase neu bewaffnet), nach Passphrase-Wechsel
  und bei neuem Fingerabdruck im System; ehrlich als Regel im Code dokumentiert, nicht als kryptografische Garantie. Aegis-Hürde bleibt davor.
- Berechtigungen der APK: genau `USE_BIOMETRIC` und `USE_FINGERPRINT` (letztere nur bis Android 8.1, von AndroidX mitgebracht) — beide
  normal, kein Netz; die Build-Endkontrolle erlaubt genau diese zwei und bricht bei jeder anderen ab.
- **„Jetzt sperren“ ist der bewusste Riegel:** Der nächste Start verlangt die Passphrase (kein Fingerabdruck-Knopf, kein Prompt); danach gilt
  der Fingerabdruck wieder ohne Neu-Aktivierung. Sperren durch Timer/Hintergrund fragt beim Zurückkehren weiter automatisch nach dem Finger.
- **Security-Audit run-3** (9 Funde, alle behoben): Passphrase-Pfad überschreibt keine bereits per Fingerabdruck geöffnete Sitzung mehr
  (Datenverlust-Wettlauf); Fingerabdruck-Slot ist an den Passphrase-Slot der Datei gebunden (manipulierter `wrap` wird nie übernommen);
  Biometrie-Prompt verlangt Bestätigung, Fingerabdrucksensor vorausgesetzt, Doku nennt ehrlich „jede starke Biometrie“; Slot wird nach
  Neustart beim nächsten Start wirklich verworfen (Marker statt Schlüsselmaterial); Passphrase-Wechsel lässt auch ein laufendes Aktivieren
  verfallen; OpenPGP-Partial-Body-Bombe abgewiesen (erste Teillänge ≥ 512, max. 4096 Teilstücke); MDC-Fehler als Manipulation gemeldet;
  Doku (Berechtigungen, eigene AES statt „AES in WebCrypto“, Klartext-Quellen des nativen Codes im Repo) berichtigt.

## v1.1 — 2026-09-12
- **Eintragstypen:** Login, Notiz (nur verschlüsselter Text) und Karte (Inhaber, Nummer, Ablauf, CVV, PIN — maskiert, kopierbar)
- **Kategorien** wie Ordner: frei eintippen, Vorschläge aus vorhandenen, Filter-Chips über der Liste, Suche findet auch die Kategorie
- **Proton-Pass-Import direkt aus dem Export** — PGP-verschlüsselt (empfohlen), ZIP oder JSON: eigener minimaler OpenPGP-Leser
  (symmetrisch, MDC-Prüfung; AES anfangs in WebCrypto, seit Audit run-2 eigene AES-Blockchiffre, siehe unten), ZIP-Leser; Logins inkl. TOTP/Extra-Felder, Notizen, Kreditkarten, Aliase, WLAN,
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
