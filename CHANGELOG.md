# Changelog — Alien Pass

## v1.14 — 2026-09-26

Nacharbeit aus dem internen Audit run-9 (nachgeholter Import). Keine Änderung an Tresor-Format, Verschlüsselung oder Daten.
- **Import hält die Sitzung fest.** Sperrte die App, während eine Datei noch gelesen wurde, stand nach dem nächsten Entsperren die
  Passphrase-Abfrage eines .vault-Imports aus der alten Sitzung offen; eine CSV- oder Proton-Datei konnte in die nächste Sitzung laufen.
  Jetzt verfällt ein Import, dessen Sitzung inzwischen gesperrt wurde — Datei einfach neu wählen.
- **Zurückgestellte Uhr** verlängert die fünf Minuten nicht mehr, in denen eine bei gesperrter App gewählte Datei nachgeholt wird.
- **Neuer Tresor** übernimmt keine vorher gewählte Datei mehr.
- **Handbuch und README:** „bei ‚sofort‘ sperrt die App, während der Datei-Picker offen ist“ gilt nur für Android — am Desktop zählt der
  Dateidialog nicht als Hintergrund. Beim nachgeholten Import von .vault und PGP-Export folgt nach dem Entsperren noch die Passphrase-Abfrage.

## v1.13 — 2026-09-26

- **Behoben:** Der Autofill-Ausschluss aus v1.12 wirkte nicht. Ein als Autofill-Dienst eingerichteter Passwort-Manager bot sich im
  Passphrase-Feld weiter an. Grund: Die WebView (Chromium) beachtet die Android-Markierung „nicht wichtig für Autofill“ nicht. Jetzt
  bekommt die WebView gar keinen Zugang zum Autofill-Dienst mehr, damit schaltet sich ihr Autofill vollständig ab (am Gerät geprüft).
  Die Markierung aus v1.12 bleibt als zweite Schicht.

## v1.12 — 2026-09-26

Härtung ohne Änderung an Oberfläche, Tresor-Format oder Daten.
- **Neu:** Die App nimmt ihre Felder vom Android-Autofill-Framework aus. Bisher meldete die WebView jedes Passwortfeld an den
  systemweiten Autofill-Dienst — ist dort ein anderer Passwort-Manager eingerichtet, bot er sich in den Passphrase-Feldern von Alien Pass
  an und konnte anbieten, die Passphrase zu speichern. Das Attribut `autocomplete="off"` im HTML hält das nicht auf, darum jetzt nativ
  (eine Zeile in der MainActivity, Quelltext wie bisher in `patch-hardening.mjs`). Alien Pass hat weiterhin keinen eigenen Autofill-Dienst.

## v1.11 — 2026-09-26

Kleine Korrektur aus dem Alltag. Am Tresor-Format, an der Verschlüsselung und an deinen Daten ändert sich nichts.
- **Behoben:** Stand „Sperren im Hintergrund“ auf „sofort“, ließ sich ein kopiertes Passwort nie in eine andere App einfügen — der
  App-Wechsel sperrte Alien Pass und leerte dabei sofort die Zwischenablage (im Ziel-Feld gab es dann nur „Autofill“, kein „Einfügen“).
  Jetzt bleibt das Kopierte bei der Sofort-Sperre bis zum Ablauf der eingestellten Zeit stehen (Standard 30 s) und wird wie bisher auch im
  Hintergrund gelöscht. Der Schlüssel im Speicher geht weiterhin sofort weg. Steht „Zwischenablage leeren“ auf „nie“, leert die Sperre
  wie bisher sofort. Handbuch entsprechend ergänzt.

## v1.10 — 2026-09-26

Umzug aus den großen Passwort-Managern per CSV. Am Tresor-Format, an der Verschlüsselung und an deinen Daten ändert sich nichts;
Android und Linux-Desktop bekommen dieselbe App.
- **CSV-Import erkennt jetzt auch Google Passwortmanager / Chrome, Apple Passwörter, Firefox, LastPass, 1Password und NordPass** an der
  Kopfzeile und nennt das Format im Ergebnis. Bisher liefen diese Exporte als „generisches CSV“ durch — und niemand wusste, dass das
  für ihn gilt. Ordner (LastPass, NordPass), Tags (1Password, erstes Tag) und Favoriten (LastPass, 1Password) kommen mit; sichere
  Notizen aus LastPass werden zu Notizen, Karten und Identitäten aus NordPass werden übersprungen. Firefox speichert keine Titel,
  darum wird der Hostname der Adresse zum Titel.
- **Behoben:** Ein Apple-Export (und ein KeePassXC-Export mit Spalte „OTPAuth“) fiel bisher in den KeePassXC-Zweig und verlor dabei
  die Einmal-Codes. Ein NordPass-Export wäre als Proton Pass gelesen worden und hätte alle Logins verworfen.
- **Generischer Zweig:** erkennt zusätzlich Ordner/Gruppen/Kategorien/Tags und Favoriten am Spaltennamen, „otpUrl“ als TOTP und die
  Spalten des klassischen KeePass („Login Name“, „Comments“). Fehlt die Titelspalte, wird der Hostname der URL zum Titel statt der
  ganzen Adresse.
- **Handbuch und README:** Export-Weg für jeden der neun Manager (Menüpfade gegen die Hilfeseiten und Quelltexte der Hersteller geprüft),
  Hinweis auf die Klartext-Datei im Downloads-Ordner.
- **Gerätetest-Fund: Import bei „Sperren im Hintergrund: sofort“ war unmöglich.** Der Datei-Picker ist eine eigene Android-Ansicht, die App
  sperrte beim Öffnen und verwarf die gewählte Datei still. Jetzt merkt sie sich die Datei (nur den Verweis, gelesen wird nichts, solange die
  App zu ist), zeigt auf dem Sperrbildschirm „Datei gewählt — zum Importieren entsperren“ und importiert nach dem Entsperren genau diese
  Datei. Gilt für CSV, Proton-Export und .vault. Die Sperre selbst bleibt, wie sie ist: kein Schlüssel im Speicher, während die App im
  Hintergrund liegt.
- **Nach dem internen Diff-Review vor dem Gerätetest:** Zugangsdaten in einer Adresse (`https://nutzer:passwort@host/`) landen nicht mehr im
  Titel, wenn der Export keinen Titel liefert (Firefox, Google ohne Namen). Eine LastPass-Zeile mit `http://sn`, die trotzdem Nutzer und
  Passwort trägt, bleibt ein Login ohne Adresse, statt beide still zu verlieren. Eine KeePassXC-Datei mit Spalte „OTPAuth“ behält Gruppe und
  Datum. Eine CSV mit mehr als 40.000 Zeilen wird sofort abgewiesen, statt erst minutenlang geparst zu werden.

## v1.9 — 2026-09-26

Rückfragen im eigenen Look, „Rückgängig“ nach dem Löschen und eine Mehrfachauswahl. Am Tresor-Format, an der Verschlüsselung und an deinen Daten
ändert sich nichts; Android und Linux-Desktop bekommen dieselbe App.
- **Rückfragen erscheinen als eigener Dialog in der App, nicht mehr als Android-Systemdialog (intern gefunden beim Gerätetest der Schwester-App
  Alien Notes).** Der Systemdialog erbt den Screenshot-Schutz der App nicht: Ein Screenshot bei offener Löschnachfrage zeigte den Titel des
  Eintrags, während die App dahinter schwarz blieb. Jetzt liegt jede Rückfrage (Löschen, endgültig löschen, Papierkorb leeren, Typwechsel,
  vorhersagbare Passphrase, großer Import, Aegis/Fingerabdruck/PIN abschalten, Tresor löschen) im Fenster der App und wird wie alles andere
  geschützt. Jeder Dialog trägt seinen eigenen Knopf („In den Papierkorb“, „Endgültig löschen“, „Typ wechseln“ …) statt eines nackten „OK“;
  Escape oder ein Tipp daneben bricht ab, eine Sperre während der Frage lässt die Antwort verfallen.
- **„Rückgängig“ nach dem Löschen.** Der Hinweis „In den Papierkorb gelegt“ bekommt für sechs Sekunden einen Knopf, der den Eintrag sofort
  zurückholt. Für „Endgültig löschen“ und „Papierkorb leeren“ gibt es das bewusst nicht — dort bleibt die Rückfrage.
- **Mehrfachauswahl.** Das Symbol ☑ neben dem + in der Suchzeile schaltet Kästchen an jeder Zeile ein; die Leiste unten legt die gewählten
  Einträge in den Papierkorb (mit einem gemeinsamen „Rückgängig“), gibt ihnen eine Kategorie oder markiert sie als Favorit. „Alle“ nimmt nur,
  was gerade zu sehen ist — Suche und Kategorie-Chips wirken also weiter. Höchstens 200 Einträge auf einmal in den Papierkorb, mehr fasst er nicht;
  bei vollem Papierkorb sagt die Rückfrage, wie viele alte Einträge dabei vernichtet würden. Die Auswahl lebt nur bis zum Sperren, Tab-Wechsel
  oder „Abbrechen“.
- **Kleinigkeiten:** Ein Auswahlfeld (Auto-Sperre, Zwischenablage, Trennzeichen) speichert nicht mehr, wenn man den schon gewählten Wert noch einmal
  antippt, und nimmt keine Werte an, die es nicht kennt. Die Speicher-Nachprüfung übernimmt nach dem Schreiben nur noch den eigenen Stand (heute
  ohne Folgen, Vorsorge für einen späteren Sync-Ordner). Der Leuchtschein hinter dem Logo passt sich schmalen Fenstern an. Handbuch DE/EN ergänzt.

## v1.8 — 2026-09-23

**Desktop-Neubau `1.8-r2` (23.09.2026, nur die Linux-Hülle, gleiche App):** Das minimierte Fenster zeigte in der Taskleiste ein Standard-Icon,
weil die Zuordnung zum Starter am Fensternamen scheiterte; jetzt trägt das Fenster ein eigenes Icon und ist dem Starter zugeordnet (Nutzerfund,
Korrektur wie im Sachwert-Tresor v3.3). Android-APK und Tresor-Format unverändert.
Alltagstauglichkeit: Fingerabdruck über den Neustart hinaus (Android) und eine PIN nach der Sperre (Desktop). Am Tresor-Format, an der
Verschlüsselung und an deinen Daten ändert sich nichts.
- **Android: Schalter „Auch nach einem Neustart des Handys mit Fingerabdruck entsperren“** (ab Werk aus). Bisher verlangte die App nach jedem
  Neustart einmal die Passphrase — GrapheneOS startet ab Werk nach 18 Stunden Sperre von selbst neu, wer den Zähler kürzer stellt, tippte sie
  entsprechend oft. Der Haken lässt sich nur beim Aktivieren des Fingerabdrucks setzen; die Wahl steckt im Fingerabdruck-Slot selbst, ist dort
  mitauthentisiert und nur durch Deaktivieren und erneutes Aktivieren änderbar. Unverändert: Passphrase nach einem Passphrase-Wechsel, Warnung
  bei neuem Fingerabdruck im System, „Jetzt sperren“ als Riegel. Die Einstellungen und das Handbuch erklären, wovor der Neustart-Zwang schützt
  und was der Haken davon aufgibt.
  **Nach dem Update** verlangt die App einmal die Passphrase, als wäre das Handy neu gestartet worden, und richtet den Fingerabdruck danach
  von selbst wieder ein: Die Neustart-Erkennung nutzt jetzt den Boot-Zähler von Android statt der Kernel-Kennung, die nicht auf jedem Gerät
  lesbar ist. Ein bestehender Slot passt darum einmalig nicht mehr.
- **Desktop: Schnell-Entsperren mit PIN (bis zum Beenden, höchstens 24 Stunden).** Nach einer Sperre durch Inaktivität oder Hintergrund genügt
  eine PIN mit 6 bis 12 Ziffern statt der Passphrase. Die PIN schützt nie die Tresordatei, sondern nur eine Kopie des Datenschlüssels, die beim
  Sperren im Arbeitsspeicher bleibt; nichts davon wird gespeichert. Drei Fehlversuche, ein Passphrase-Wechsel, eine veränderte Tresordatei,
  der Ablauf der 24 Stunden und das Beenden der App verwerfen die PIN. „Jetzt sperren“ (Strg+L) ist der Riegel: danach einmal die Passphrase,
  dann gilt die PIN wieder. Ehrliche Grenzen stehen in der Karte, im Handbuch und in der README.
- **Desktop: Fensterwechsel leert getippte Eingaben.** Wer mit Alt+Tab in ein anderes Fenster wechselt, sperrt die App nicht (das tut nur
  Minimieren oder Verstecken), aber eine halb getippte Passphrase oder PIN bleibt nicht stehen. Handbuch und README sagen jetzt, was
  „Hintergrund“ am Desktop bedeutet.
- **Fingerabdruck und PIN prüfen die Tresordatei vollständiger (intern gefunden, niedrig).** Beide Schnell-Pforten sind an den Passphrase-Slot
  der Datei gebunden; bisher deckte der Abgleich nur den verschlüsselten Teil, nicht den Zufallswert daneben und nicht die Kopfdaten. Eine an
  diesen Stellen veränderte Datei konnte die Schnell-Pforte still öffnen und wurde beim nächsten Speichern so zurückgeschrieben, bis die
  Passphrase nicht mehr passte. Jetzt meldet die App „Datei geändert“. Auf Android braucht das Zugriff auf die App-Daten, am Desktop auf
  deinen Benutzer — ein Backup von davor stellt alles wieder her.
- Desktop: bei einem Tippfehler beim Einrichten der PIN oder beim Passphrase-Wechsel bleibt die alte Passphrase nicht mehr sichtbar im Feld
  stehen; ein Fehlversuch-Hinweis überlebt das Minimieren nicht.
- Android: eine von Hand veränderte Fingerabdruck-Slot-Datei meldet sich als Manipulation mit bleibender Warnung statt als „Sensor
  vorübergehend nicht verfügbar“.
- Desktop: zwei veraltete Kommentare zur Bildschirmsperre im Quelltext berichtigt (im Flatpak erfährt die App davon nichts).
- Internes Audit run-8 (PIN-Slot im Arbeitsspeicher, Zusammenspiel der drei Pforten, Neustart-Schalter, Wortlaut gegen Code): keine
  mittleren oder schweren Funde, alle niedrigen und Hinweise behoben.

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
