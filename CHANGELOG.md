# Changelog — Alien Pass

## v1.7 — 2026-09-22
Erste Fassung für den **Linux-Desktop**, als Flatpak — gleichzeitig mit Android 1.7. Am Tresor-Format, an der Verschlüsselung und an
deinen Daten ändert sich nichts. Ein Backup vom Handy lässt sich am Desktop importieren und umgekehrt.
**Android:** Einzige Änderung ist die Korrektur „Sperren im Hintergrund“ unten.
- **Alien Pass Desktop (Linux, Flatpak).** Derselbe Code wie auf dem Handy, dazu eine kleine Hülle aus Electron. Das System nimmt der App
  das Netz: Das Flatpak hat keine Netzwerk-Berechtigung und keinen Zugriff auf deine Dateien. Backup und Import laufen über den
  Dateidialog des Systems. Ab etwa 1000 Pixeln Fensterbreite stehen Liste und Eintrag nebeneinander. Tastatur: Strg+F, Strg+N, Strg+L, Esc.
- **Zwischenablage am Desktop:** Kopiertes ist für KDE als Passwort markiert, Klipper übernimmt es nicht in den Verlauf. Die App löscht
  es nach der eingestellten Zeit, beim Sperren und beim Beenden. Das gilt auch für Strg+C, Strg+X und für Text, den du nur mit der Maus
  markierst (Mittelklick unter Linux).
- **Sperren im Hintergrund, Android und Desktop:** Wurde die App schon während des Entsperrens in den Hintergrund geschickt, blieb der Tresor
  bei „sofort sperren“ danach offen. Jetzt sperrt er.
- **Ehrliche Grenzen am Desktop:** kein Schutz vor Bildschirmfotos; die Browser-Engine liefert die App selbst mit (Updates nur mit neuer
  App-Version); bei Bildschirmsperre und Ruhezustand sperrt die App nicht von selbst, darum die Systemsperre und eine kurze
  Inaktivitäts-Sperre nutzen; kein Fingerabdruck.
- Zwei interne Audits der Desktop-Hülle (run-6, run-7), alle Funde behoben.

## v1.6.2 — 2026-09-21
Reine Darstellungskorrektur. Am Tresor-Format, an der Verschlüsselung und an deinen Daten ändert sich nichts.
- **Passwortfeld bleibt dunkel, wenn ein anderer Passwortmanager es ausfüllt.** Füllte ein Passwortmanager (z.B. Proton Pass) die
  Passphrase per Autofill ein, legte das System ein helles Feld darüber. Das Feld behält jetzt Hintergrund und Schriftfarbe der
  gewählten Darstellung.

## v1.6.1 — 2026-09-19
Zwei Sicherheits-Korrekturen, gefunden im internen Audit der Schwester-App Sachwert-Tresor. Deren Fingerabdruck-Code und
Fehlversuchs-Bremse stammen aus Alien Pass und hatten dieselben Fehler.
- **Fingerabdruck: ein neu registrierter Finger bleibt nach einem Neustart nicht mehr unbemerkt (mittel).** Bisher meldete die App nach
  einem Neustart immer „Neustart“ und richtete den Fingerabdruck nach der Passphrase automatisch wieder ein — auch dann, wenn jemand
  inzwischen einen eigenen Finger in Android registriert hatte. Der hätte danach den Tresor öffnen können. Jetzt merkt sich ein zweiter,
  nie benutzter Schlüssel im Android-Keystore jede neue Registrierung über den Neustart hinweg. In diesem Fall richtet die App nichts
  automatisch ein, sondern zeigt eine **bleibende Warnung** in der Liste und in den Einstellungen, bis du sie liest oder den Fingerabdruck
  bewusst neu aktivierst. Passphrase und Tresor-Format sind nicht betroffen.
  **Nach dem Update:** Öffnest du die App einmal, bevor du das Handy neu startest, legt sie den neuen Schlüssel selbst an — du merkst nichts.
  Startest du das Handy vorher neu, richtet sie den Fingerabdruck einmalig nicht automatisch wieder ein und bittet dich, ihn in den
  Einstellungen bewusst neu zu aktivieren.
- Ein abgebrochener Fingerabdruck-Dialog (Zeitüberschreitung, Sensor kurz nicht bereit) setzt den Fingerabdruck nicht mehr zurück.
- **Fehlversuchs-Bremse zählt über App-Neustarts weiter (niedrig).** Bisher begann jeder Neustart der App nach abgelaufener Wartezeit wieder
  bei null — die Wartezeit wuchs so nie über 2 Sekunden. Das betraf vor allem das Durchprobieren des Aegis-Codes durch jemanden, der die
  Passphrase kennt. Jetzt zählt die Bremse bis zum nächsten Erfolg weiter, die Wartezeit wächst wie vorgesehen bis 30 Sekunden.

## v1.6 — 2026-09-19
- **Ehrlichere Stärke-Anzeige:** Der Balken hat bisher nur Länge und Wortzahl gezählt — `Sommer2024Sommer` hieß „stark“. Jetzt erkennt er
  typische Muster: Wiederholungen, Zeichen- und Tastaturfolgen (`abcd`, `12345`, `qwertz`), Jahreszahlen, häufige Wörter (auch als
  `P4ssw0rt`), nur Ziffern und sehr wenige verschiedene Zeichen. Wird ein Muster gefunden, sagt der Balken **„vorhersagbar“** und nennt den
  Grund. Sonst heißt die Anzeige ausdrücklich **„Schätzung“** — sie erkennt Muster, aber nicht, ob ein Passwort zu dir passt (Name, Geburtstag).
  Wirklich stark ist ein Passwort aus dem Generator.
- **Neues Kennzeichen „vorhersagbar“** in der Liste und in der Gesundheitszeile, auch für bestehende Einträge. Das Häkchen „Dienst erlaubt kein
  längeres Passwort“ schaltet „kurz“ ab, bei einer reinen Ziffern-PIN auch „vorhersagbar“ (`123456` bleibt markiert).
- **Rückfrage bei der Tresor-Passphrase:** Beim Einrichten und beim Wechseln fragt die App nach, wenn die Passphrase vorhersagbar ist — sie
  schützt auch jedes Backup, und eine gestohlene Backup-Datei lässt sich offline beliebig oft durchprobieren. Verboten wird nichts.
- Im Eintragsformular läuft der Balken jetzt beim Tippen mit (bisher nur nach „Generieren“ und beim Bearbeiten).
- Alles lokal, eigener kleiner Code ohne Wörterbuch-Bibliothek. Tresor-Format, Verschlüsselung, Import und Berechtigungen sind unverändert.

## v1.5.1 — 2026-09-16
- **Auge im Passwortfeld:** Statt des Kästchens „Passwort anzeigen“ sitzt jetzt rechts in jedem Passwortfeld ein Auge — beim Einrichten,
  Entsperren, im Eintrag (Passwort, Kartendaten, PIN), bei Fingerabdruck und Passphrase-Wechsel und neu auch bei den Passphrasen für den
  Backup- und Proton-Import. Das Auge zeigt nur sein eigenes Feld; Tastatur und Cursor bleiben beim Antippen im Feld.
  **Zusatzfelder** haben je Wert ein eigenes Auge statt eines gemeinsamen Schalters; eine neue Zeile ist immer verdeckt.
  Beim Sperren und im Hintergrund gehen wie bisher alle Felder wieder zu.
- **Kästchen im Neon-Look:** Die übrigen Kästchen (Generator-Optionen, Favorit, „kein längeres Passwort“) waren weiß mit blauem Haken
  im Android-Standard. Jetzt: leer dunkel mit Cyan-Rand, angehakt Cyan mit dunklem Haken — in beiden Darstellungen.
- Nur Oberfläche: Tresor-Format, Verschlüsselung, Import und Berechtigungen sind unverändert.

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
  Dazu drei Funde niedrigen Schweregrads (heute nicht auslösbar oder nur ungenaue Zähler beim Zusammenführen), ebenfalls behoben.
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
  Filter beim Tippen im Kategoriefeld. Escape oder ein Klick daneben schließt. Auch das Löschen-X im Suchfeld ist jetzt Cyan statt
  System-Blau.
- **Anzahl der Einträge:** Am Ende der Liste steht dezent, wie viele Einträge der Tresor hat. Mit Kategorie oder Suche heißt es
  „12 von 42 Einträgen“, damit sichtbar ist, wie viel der Filter ausblendet. Einträge im Papierkorb zählen nicht mit.
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
