"use strict";
/* Theme-Init vor dem ersten Render (app.js lädt synchron im <head>) */
(function(){var t=localStorage.getItem('alien-theme');if(t==='soft')document.documentElement.setAttribute('data-theme','soft');})();

/* ============================================================
   Alien Pass — Offline-Passwort-Manager. Alles client-side,
   kein Netz, kein Tracking. Schwester des Sachwert-Tresors.
   ============================================================ */
const LS_KEY = 'ai-pass-vault';
const LANG_KEY = 'ai-pass-lang';
const APP_VERSION = '1.5';   // Anzeige in den Einstellungen; muss VERSION_NAME entsprechen (build-www.sh setzt es aus VERSION, roundtrip-test.mjs prüft es)

/* ============================ i18n ============================
   Deutsch = Original im HTML (data-i18n / -html / -ph). Englisch aus I18N.
   Dynamische JS-Strings aus T (beide Sprachen) via tr(). */
const I18N = {
  "tagline":"Passwords · local & encrypted · offline",
  "setup.title":"Set up vault",
  "setup.intro":"Choose a strong passphrase. It encrypts all passwords right on this device (Argon2id + AES-256-GCM). <strong>There is no backdoor and no reset</strong> — forget the passphrase and the data is gone.",
  "lbl.passphrase":"Passphrase",
  "setup.ph1":"min. 12 characters, better a word sequence",
  "setup.repeat":"Repeat passphrase",
  "setup.showpass":"Show passphrase (to double-check)",
  "setup.suggest":"Suggest passphrase (6 dice words)",
  "setup.kdf":"Key derivation (Argon2id)",
  "setup.kdfLight":"Light — 32 MiB (older devices)",
  "setup.kdfStd":"Standard — 64 MiB",
  "setup.kdfStrong":"Strong — 128 MiB",
  "setup.create":"Create vault",
  "lock.title":"Unlock vault",
  "lock.showpass":"Show passphrase",
  "lock.unlock":"Unlock",
  "tab.list":"Entries","tab.add":"New","tab.gen":"Generator","tab.backup":"Backup","tab.settings":"Settings",
  "help.hTrash":"Trash",
  "help.pTrash":"Deleted entries go to the trash for <strong>30 days</strong> \u2014 the icon right of the <strong>+</strong> in the search row; the number next to it says how much is in there. It shows only <strong>title, type and date of deletion</strong>: no reveal, no copy. If you need the content, restore the entry first \u2014 it comes back complete, with password, extra fields and category. <strong>Honestly:</strong> while an entry sits in the trash it is also part of every backup. To get rid of something right away use \u201CDelete permanently\u201D or \u201CEmpty trash\u201D \u2014 that cannot be undone. After 30 days the app clears it out on the next unlock; after that, as before, only the deletion marker remains for a year, for syncing. <strong>A device running version 1.4 or older</strong> empties the trash when merging: the entries stay deleted, they never come back. Update every device first.",
  "trash.title":"Trash",
  "trash.intro":"Deleted entries stay here for <strong>30 days</strong> and can be brought back. After that the content is erased for good on the next unlock — only the deletion marker for syncing remains. <strong>While an entry sits here it is also part of every backup.</strong> \u201CDelete permanently\u201D destroys it right away. A device running version 1.4 or older empties the trash when merging.",
  "trash.back":"Back to entries",
  "trash.emptyBtn":"Empty trash",
  "list.search":"Search (title, user, URL)…",
  "add.titleNew":"New entry",
  "f.title":"Title *","f.titlePh":"e.g. Proton Mail","f.user":"Username / e-mail","f.email":"E-mail (optional, in addition to the username)","f.pass":"Password","f.gen":"Generate",
  "f.showpass":"Show password","f.url":"URL / app","f.totp":"TOTP secret (optional)","f.totpPh":"Base32 secret or otpauth:// link",
  "f.notes":"Notes","f.fav":"Favourite (top of the list)","add.save":"Save","btn.cancel":"Cancel",
  "type.login":"Login","type.note":"Note","type.card":"Card","type.bank":"Account",
  "f.cat":"Category (folder)","f.catPh":"e.g. Private, Work, Finance — empty = none",
  "f.nowarn":"Service does not allow a longer password (no “short” warning)",
  "f.holder":"Cardholder","f.number":"Card number","f.expiry":"Valid until","f.cvv":"Security code (CVV)","f.pin":"PIN (optional)","f.showcard":"Show card data",
  "f.bholder":"Account holder","f.iban":"IBAN / account number","f.bic":"BIC / SWIFT","f.bank":"Bank","f.bpin":"PIN (optional)","f.showbank":"Show PIN",
  "f.extra":"Extra fields (secret, e.g. app PIN)","f.extraAdd":"+ Extra field","f.extraShow":"Show extra fields",
  "totp.title":"Second factor","totp.intro":"Enter the current 6-digit code from your <strong>Aegis 2FA manager</strong>.","totp.confirm":"Confirm",
  "pt.title":"Migrate from Proton Pass (PGP / ZIP / JSON)",
  "pt.intro":"Reads the Proton export directly — preferably the <strong>PGP-encrypted</strong> variant (Proton's recommendation): the file can travel to the phone safely and is only decrypted here with its passphrase. Logins, notes, credit cards, aliases, Wi-Fi and identities come over; Proton vaults become categories. The trash is left out.",
  "pt.pick":"Choose Proton export","pt.filePass":"Passphrase of the export","pt.doImport":"Decrypt & import",
  "set.totpTitle":"Aegis hurdle (TOTP on unlock)",
  "set.totpOffIntro":"Extra hurdle on unlock: after the passphrase a 6-digit code from <strong>Aegis</strong> is required. <strong>Honestly:</strong> the key lives inside the vault itself — whoever has the vault file <em>and</em> the passphrase does not need the code. The hurdle helps against someone who peeked at your passphrase and holds your unlocked phone.",
  "set.totpEnable":"Enable hurdle",
  "set.totpSetup1":"Add in <strong>Aegis</strong> — works without a camera: “Copy key” → in Aegis “Add entry manually” → type <em>TOTP</em> → paste. Or “Save QR as image” → in Aegis “+” → QR scan → import from image.",
  "set.copyKey":"Copy key","set.saveQR":"Save QR as image","set.otpauth":"Copy otpauth link",
  "set.totpSetup3":"Aegis now shows a 6-digit code. Enter it to confirm:","set.activate":"Activate",
  "set.totpOnText":"Hurdle active. Unlocking additionally asks for an Aegis code. It applies only to this app on this device — backups do not carry it.","set.totpDisable":"Disable hurdle",
  "gen.title":"Password generator","gen.modeChars":"Characters","gen.modeWords":"Dice words",
  "gen.new":"Generate new","gen.done":"Done","gen.copy":"Copy","gen.use":"Use in form","gen.len":"Length","gen.noamb":"no l/1/I/O/0",
  "gen.words":"Words","gen.sep":"Separator","gen.cap":"Capitalise","gen.num":"+ digit",
  "gen.effNote":"Word list: EFF Large Wordlist (7,776 words, ~12.9 bits per word). Six words ≈ 77 bits. The same settings apply to “Generate” in the entry form — a panel with mode, length and character sets opens there.",
  "bk.title":"Encrypted backup",
  "bk.intro":"The <code>.vault</code> file holds the whole vault <strong>encrypted</strong> (Argon2id + AES-256-GCM) — it only opens with the passphrase. Sync it between devices e.g. via Syncthing; nothing is ever exported in plaintext.",
  "bk.export":"Create backup (.vault)",
  "bk.importTitle":"Import backup (merge)",
  "bk.importIntro":"Merges a <code>.vault</code> file into this vault: per entry the <strong>newer change</strong> wins, deletions are applied. The file may use a different passphrase — your local one stays unchanged.",
  "bk.pick":"Choose .vault file","bk.filePass":"Passphrase of the file","bk.doImport":"Merge",
  "csv.title":"Migrate via CSV (KeePassXC, Bitwarden, others)",
  "csv.intro":"Detects CSV exports from <strong>KeePassXC</strong>, <strong>Bitwarden</strong> and <strong>Proton Pass</strong> automatically (other formats via matching column names). Folders and groups become categories. Entries with identical title, user and password are skipped.",
  "csv.pick":"Choose CSV file",
  "csv.warn":"⚠ The export file sits <strong>unencrypted</strong> on the device. Delete it right after importing (Downloads folder) — and don't leave the export lying around in the source manager either.",
  "set.secTitle":"Security","set.autolock":"Lock after inactivity","set.off":"Off",
  "set.al1":"1 minute","set.al2":"2 minutes","set.al5":"5 minutes","set.al15":"15 minutes",
  "set.bgLock":"Lock in background after","set.bg0":"immediately","set.bg30":"30 seconds","set.bg60":"1 minute","set.bg300":"5 minutes",
  "set.clip":"Clear clipboard after","set.c15":"15 seconds","set.c30":"30 seconds","set.c60":"1 minute","set.cOff":"only on lock (not recommended)",
  "set.clipNote":"Note: in the Android app copied content is flagged as “sensitive” — the system preview then hides it (Android 13+). The app clears the clipboard after the chosen time — also in the background, as long as Android has not frozen the app (usually after the second app switch); at the latest when you return to the app and when it locks. From Android 13 the system additionally clears the clipboard after about an hour, older versions do not.",
  "set.lockNow":"Lock now",
  "lock.bio":"Unlock with fingerprint",
  "set.bioTitle":"Fingerprint unlock (Android)",
  "set.bioOffIntro":"Unlocks the vault with the device fingerprint instead of the passphrase. <strong>Honestly:</strong> a fingerprint is convenient, but it can be forced — at a border, or by someone holding your hand. Android binds the key to every strong biometric of the device: where a strong face unlock is enrolled (some stock Pixels; not on GrapheneOS), that opens the vault too, after a confirmation tap. The passphrase stays the real protection: it is required after every restart of the phone, after a passphrase change and as soon as a new fingerprint is enrolled in the system. Technically a random key wrapped by the Android keystore unlocks the data key; nothing of it enters backups.",
  "set.bioPass":"Passphrase to confirm",
  "set.bioEnable":"Enable fingerprint",
  "set.bioOnText":"Active. The fingerprint is enough to unlock — until the next restart, passphrase change or new fingerprint in the system. 'Lock now' is the deliberate bolt: the next start then requires the passphrase, afterwards the fingerprint works again. Applies to this device only.",
  "set.bioDisable":"Disable fingerprint",
  "help.h5c":"Fingerprint unlock",
  "help.p5c":"Optionally the device fingerprint unlocks the vault (Settings → Fingerprint, Android app only). <strong>How it works:</strong> the data key is additionally wrapped under a random key; the Android keystore holds that key and releases it only after a strong fingerprint, freshly each time. The vault file itself stays unchanged and backups carry none of it. <strong>What it costs:</strong> a fingerprint is not a secret. It can be forced — by someone guiding your hand, or at a border; the passphrase in your head cannot. That is why the app demands the passphrase after every restart of the phone (at the next start the fingerprint slot is discarded and, after the passphrase, re-created with fresh randomness), after a passphrase change and as soon as a new fingerprint is enrolled in the system. The restart rule is a rule in the code, not a cryptographic guarantee. <strong>Which biometrics count:</strong> Android binds the key to every biometric of the 'strong' class on the device. Where a strong face unlock is enrolled (some stock Pixels; GrapheneOS has none), it opens the vault too, after a confirmation tap. <strong>The deliberate bolt:</strong> 'Lock now' in Settings means the next start requires the passphrase — no fingerprint button, no prompt; afterwards the fingerprint works again without re-enabling. Use it before a border, before handing the phone over, whenever a finger could be forced. When in doubt: restart the phone, then only the passphrase counts.",
  "set.cpTitle":"Change passphrase","set.cpCur":"Current passphrase","set.cpNew":"New passphrase","set.cpRepeat":"Repeat","set.cpShow":"Show passphrases","set.cpBtn":"Change",
  "set.cpNote":"Changing the passphrase also rotates the internal data key. Backups exported earlier keep their old passphrase.",
  "set.themeTitle":"Appearance","set.themeDark":"Black (Neon)","set.themeSoft":"Soft (Navy)",
  "set.dangerTitle":"Danger zone","set.wipe":"Delete vault on this device",
  "set.wipeNote":"Removes the encrypted vault on <em>this</em> device only. Exported <code>.vault</code> files remain. No secure wiping of storage — the encryption takes care of that.",
  "foot.line1":"Alien Investor · Alien Pass · 100 % local · no cloud · no telemetry",
  "foot.line2":"Encryption: Argon2id · AES-256-GCM · WebCrypto · TOTP RFC 6238",
  "foot.donate":"Recharge energy · Donate",
  "help.closeX":"Close ✕","help.close":"Close","d.edit":"Edit","d.delete":"Delete",
  "help.title":"Manual",
  "help.h1":"What is Alien Pass?",
  "help.p1":"A <strong>local, encrypted password manager</strong>. Runs fully <strong>offline</strong> — no cloud, no server, no telemetry, no account. The Android app does not even have an internet permission. Your passwords never leave the device in plaintext.",
  "help.warn":"⚠ There is no reset and no backdoor. Forget your passphrase and the data is gone for good. Make regular backups and keep the passphrase safe.",
  "help.h2":"First steps",
  "help.l2":"<li><strong>Choose a passphrase</strong> — at least 12 characters, better six dice words (the suggest button builds them from the EFF list). Write it down and store it safely.</li><li>The <strong>key derivation</strong> (Argon2id) benchmarks itself during setup; “Standard” suits current phones.</li><li>Create entries — four types: <strong>Login</strong> (user, optional e-mail, password, URL, TOTP), <strong>Note</strong> (encrypted text only), <strong>Card</strong> (holder, number, expiry, CVV, PIN) and <strong>Account</strong> (holder, IBAN, BIC, bank, PIN). Every entry can carry up to eight <strong>extra fields</strong> — freely named (app PIN, phone password, security question …) and always secret: shown in the detail view only on request, each with its own copy button. Nothing of that has to sit in the notes in plain text.</li><li><strong>Categories</strong> work like folders: type one freely in the form (suggestions from existing ones). The list filters via the chips at the top; a category disappears once no entry carries it.</li><li><strong>Changing the type</strong> later is possible, but the old type's fields (e.g. a login's password and TOTP) are deleted — the app asks first. A backup does not bring them back, because the newer change wins when merging.</li><li>Tap an entry → detail view with copy buttons. Passwords, card number, CVV and PINs are only revealed on request; IBAN and BIC are shown in plain (needed for transfers, printed on every invoice).</li>",
  "help.h3":"Clipboard",
  "help.l3":"<li>Copied passwords are cleared by the app after the chosen time (default 30 s), when you return to the app and when it locks.</li><li>In the background the Android app keeps trying to clear until Android freezes it (usually after the second app switch); afterwards it catches up when you return. From Android 13 the system additionally clears the clipboard after about an hour — older Android versions do not.</li><li>The Android app flags copied content as <strong>sensitive</strong>: the system preview shown when copying hides the content (Android 13+). In a browser this protection does not exist.</li>",
  "help.h4":"Generator",
  "help.l4":"<li><strong>Characters:</strong> 8–64 characters from selectable sets; “no l/1/I/O/0” avoids mix-ups when typing.</li><li><strong>Dice words</strong> (Diceware): words from the EFF Large Wordlist, ~12.9 bits per word. Six words ≈ 77 bits — memorable and strong.</li><li>All randomness comes from the system generator without modulo bias; entropy is shown in bits — in character mode the requirement “every chosen set appears at least once” is subtracted honestly (about 1 bit at 8 characters, negligible from 16).</li>",
  "help.h5":"TOTP (2FA codes)",
  "help.l5":"<li>Each entry can hold a TOTP secret (Base32 or <code>otpauth://</code> link). The detail view shows the current code with remaining time.</li><li>Supports SHA-1/SHA-256/SHA-512, 6–8 digits, any period.</li><li><strong>Keep in mind:</strong> password and 2FA in the same vault weaken factor separation. For critical accounts (e-mail, exchange) keep the second factor in Aegis.</li>",
  "help.h5b":"Aegis hurdle on unlock",
  "help.p5b":"Optionally the app asks for an Aegis code after the passphrase (Settings → Aegis hurdle). <strong>What it does:</strong> someone who peeked at your passphrase and holds your unlocked phone cannot get in without your Aegis app. <strong>What it does not do:</strong> the TOTP key lives inside the vault itself. Whoever owns the vault file <em>and</em> the passphrase decrypts it outside the app — the format is openly documented. A real second factor needs a party that enforces it (for cloud services, the server). For a local file the passphrase remains the only cryptographic protection; make it long.",
  "help.h6":"Password health",
  "help.p6":"The list flags <strong>reused</strong> passwords and <strong>short</strong> ones (under 12 characters). Age is deliberately not flagged: a strong random password does not weaken with time, and forced rotation is an anti-pattern (NIST SP 800-63B) — change a password when it may have leaked, not on a schedule. If a service does not allow a longer password, the checkbox “Service does not allow a longer password” in the entry switches off the “short” flag. Everything is computed locally — there is no lookup in breach databases, because the app has no network.",
  "help.h7":"Backup & sync",
  "help.l7":"<li><strong>Create backup</strong> writes a <code>.vault</code> file (encrypted with your passphrase). It can safely go into Syncthing, onto a stick or into a backup.</li><li><strong>Import</strong> merges: per entry the newer change wins, deletions are carried over (for one year). The file may use a different passphrase — your local one stays.</li><li>With two devices: export on both regularly and import the other's backup. Both sides end up at the same state.</li><li>After a <strong>passphrase change</strong> older backups still open with their old passphrase.</li>",
  "help.h8":"Migrating from Proton Pass, KeePassXC, Bitwarden",
  "help.l8":"<li><strong>Proton Pass (recommended: PGP):</strong> in the web client or browser extension (the mobile apps cannot export) gear → Export → format <strong>PGP-encrypted</strong>, choose a passphrase. Move the ZIP unchanged to the phone (Syncthing, USB) and pick it in Alien Pass under Backup → Proton export. The passphrase is only used for decryption and is not stored.</li><li>Logins (incl. TOTP, further URLs and extra fields in the notes), notes, credit cards, aliases, Wi-Fi entries, identities and SSH keys (as notes) come over. Proton vaults become categories, pinned items become favourites. File attachments and the trash are not imported.</li><li><strong>KeePassXC:</strong> Database → Export → CSV file. Groups become categories.</li><li><strong>Bitwarden:</strong> Tools → Export vault → format .csv. Folders become categories.</li><li><strong>Delete the CSV afterwards</strong> — it contains all passwords in plaintext. The PGP export stays encrypted and may remain.</li>",
  "help.h9":"Security in detail",
  "help.l9":"<li><strong>Key derivation:</strong> Argon2id (default 64 MiB, 3 passes) from your passphrase — memory-hard, so expensive for GPU attacks on a stolen file.</li><li><strong>Encryption:</strong> AES-256-GCM (WebCrypto). A random data key encrypts the vault; the passphrase only wraps that key. The file header is authenticated too — tampering is detected.</li><li><strong>Device:</strong> the Android app requests exactly two normal permissions, both for the fingerprint sensor: USE_BIOMETRIC and USE_FINGERPRINT (the latter only up to Android 8.1, brought in by the AndroidX biometric library). No internet, no storage, no contacts. Besides these the APK only carries the AndroidX-generated signature permission DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, which grants nothing. It forbids screenshots and recents preview (FLAG_SECURE) and excludes itself from cloud, adb and device-to-device backups (backup rules).</li><li><strong>Locking:</strong> after inactivity, in the background after a chosen time (or immediately), and manually. Locking removes keys and all rendered data from memory.</li><li><strong>Third-party code:</strong> only the Argon2 library hash-wasm (MIT) and the EFF word list, both bundled and hash-checked in the build. No CDN, no tracker. The OpenPGP reader for Proton exports is our own, deliberately small code (symmetric only, own AES block cipher checked against FIPS-197 vectors and WebCrypto in the test suite, integrity check); its keys are import-only and zeroed afterwards, the vault key never touches it.</li><li><strong>Limits:</strong> no autofill, no breach check. Fingerprint unlock is optional and honestly limited (see above). A passphrase cannot be recovered.</li>"
};
const T = {
  "err.setupShort":{de:"Mindestens 12 Zeichen.",en:"At least 12 characters."},
  "err.setupMismatch":{de:"Die Passphrasen stimmen nicht überein.",en:"Passphrases do not match."},
  "err.setupFailed":{de:"Einrichten fehlgeschlagen (WebCrypto/WASM nicht verfügbar?).",en:"Setup failed (WebCrypto/WASM unavailable?)."},
  "err.wrongPass":{de:"Falsche Passphrase oder beschädigter Tresor.",en:"Wrong passphrase or damaged vault."},
  "err.wait":{de:"Zu viele Fehlversuche — bitte {s} s warten.",en:"Too many failed attempts — wait {s} s."},
  "err.fileFormat":{de:"Keine gültige Alien-Pass-.vault-Datei.",en:"Not a valid Alien Pass .vault file."},
  "err.fileNewer":{de:"Die Datei stammt aus einer neueren App-Version. Bitte App aktualisieren.",en:"The file comes from a newer app version. Please update the app."},
  "err.fileBounds":{de:"Die Datei verlangt unzulässige Argon2-Parameter — Import abgelehnt.",en:"The file demands out-of-bounds Argon2 parameters — import refused."},
  "err.fileLarge":{de:"Datei zu groß.",en:"File too large."},
  "err.tooMany":{de:"Zu viele Einträge (max. 10.000).",en:"Too many entries (max. 10,000)."},
  "err.saveFailed":{de:"⚠ Speichern fehlgeschlagen — Änderung verworfen (Speicher voll?).",en:"⚠ Save failed — change discarded (storage full?)."},
  "err.titleReq":{de:"Bitte einen Titel angeben.",en:"Please enter a title."},
  "err.extraHalf":{de:"Zusatzfeld {n}: Bezeichnung und Wert gehören zusammen — bitte beides ausfüllen oder die Zeile entfernen.",en:"Extra field {n}: label and value belong together — fill in both or remove the row."},
  "err.extraMax":{de:"Höchstens {n} Zusatzfelder je Eintrag.",en:"At most {n} extra fields per entry."},
  "f.extraName":{de:"Bezeichnung, z.B. App-PIN",en:"Label, e.g. app PIN"},"f.extraVal":{de:"Wert (geheim)",en:"Value (secret)"},"f.extraDel":{de:"Zusatzfeld entfernen",en:"Remove extra field"},
  "err.totpBad":{de:"TOTP-Schlüssel ungültig (Base32 oder otpauth://-Link erwartet).",en:"Invalid TOTP secret (expected Base32 or otpauth:// link)."},
  "err.cpShort":{de:"Neue Passphrase: mindestens 12 Zeichen.",en:"New passphrase: at least 12 characters."},
  "err.cpMismatch":{de:"Die neuen Passphrasen stimmen nicht überein.",en:"New passphrases do not match."},
  "err.cpWrong":{de:"Aktuelle Passphrase falsch.",en:"Current passphrase is wrong."},
  "busy.decrypting":{de:"Entschlüssele…",en:"Decrypting…"},
  "busy.creating":{de:"Erzeuge Schlüssel…",en:"Deriving key…"},
  "busy.changing":{de:"Ändere…",en:"Changing…"},
  "bench.run":{de:"Messe Argon2-Dauer auf diesem Gerät…",en:"Benchmarking Argon2 on this device…"},
  "bench.done":{de:"Standard (64 MiB) braucht hier ~{ms} ms je Entsperren.",en:"Standard (64 MiB) takes ~{ms} ms per unlock here."},
  "bench.light":{de:"Standard (64 MiB) braucht hier ~{ms} ms — „Leicht“ vorgewählt.",en:"Standard (64 MiB) takes ~{ms} ms here — “Light” preselected."},
  "bench.strong":{de:"Standard (64 MiB) braucht hier nur ~{ms} ms — „Stark“ vorgewählt.",en:"Standard (64 MiB) takes only ~{ms} ms here — “Strong” preselected."},
  "toast.vaultCreated":{de:"Tresor erstellt — Passphrase sicher aufbewahren!",en:"Vault created — keep the passphrase safe!"},
  "toast.autolocked":{de:"Automatisch gesperrt",en:"Locked automatically"},
  "toast.saved":{de:"Gespeichert",en:"Saved"},
  "toast.trashed":{de:"In den Papierkorb gelegt — {d} Tage wiederherstellbar",en:"Moved to the trash — restorable for {d} days"},
  "toast.restored":{de:"Eintrag wiederhergestellt",en:"Entry restored"},
  "toast.purged":{de:"Eintrag endgültig gelöscht",en:"Entry permanently deleted"},
  "toast.trashEmptied":{de:"Papierkorb geleert",en:"Trash emptied"},
  "trash.btn":{de:"Papierkorb",en:"Trash"},
  "trash.count":{de:"{n} im Papierkorb — jeweils {d} Tage ab dem Löschen wiederherstellbar.",en:"{n} in the trash — each restorable for {d} days after deletion."},
  "trash.empty":{de:"Der Papierkorb ist leer.",en:"The trash is empty."},
  "trash.untitled":{de:"(ohne Titel)",en:"(untitled)"},
  "trash.deletedOn":{de:"gelöscht am {d}",en:"deleted on {d}"},
  "trash.restore":{de:"Wiederherstellen",en:"Restore"},
  "trash.purge":{de:"Endgültig löschen",en:"Delete permanently"},
  "toast.passChanged":{de:"Passphrase geändert, Datenschlüssel erneuert",en:"Passphrase changed, data key rotated"},
  "toast.passChangedBio":{de:"Passphrase geändert, Datenschlüssel erneuert — Fingerabdruck deaktiviert, in den Einstellungen neu aktivieren",en:"Passphrase changed, data key rotated — fingerprint disabled, re-enable it in Settings"},
  "busy.checking":{de:"Prüfe…",en:"Checking…"},
  "bio.promptTitle":{de:"Alien Pass",en:"Alien Pass"},
  "bio.promptUnlock":{de:"Tresor entsperren",en:"Unlock vault"},
  "bio.promptEnroll":{de:"Fingerabdruck-Entsperren aktivieren",en:"Enable fingerprint unlock"},
  "bio.promptRearm":{de:"Nach dem Neustart: Fingerabdruck neu bestätigen",en:"After restart: confirm fingerprint again"},
  "bio.usePass":{de:"Passphrase",en:"Passphrase"},
  "bio.afterReboot":{de:"Nach dem Neustart einmal die Passphrase eingeben — danach gilt der Fingerabdruck wieder.",en:"After the restart, enter the passphrase once — the fingerprint works again afterwards."},
  "bio.reset":{de:"Fingerabdruck-Entsperren wurde zurückgesetzt (neuer Fingerabdruck im System oder Schlüssel ungültig). In den Einstellungen neu aktivieren.",en:"Fingerprint unlock was reset (new fingerprint enrolled or key invalid). Re-enable it in Settings."},
  "bio.lockout":{de:"Zu viele Fehlversuche — der Sensor ist vorübergehend gesperrt. Bitte Passphrase.",en:"Too many attempts — the sensor is temporarily locked. Use the passphrase."},
  "bio.cancelled":{de:"Fingerabdruck abgebrochen — Entsperren bleibt bei der Passphrase",en:"Fingerprint cancelled — unlocking stays with the passphrase"},
  "bio.failed":{de:"Fingerabdruck nicht eingerichtet (Fehler im Keystore)",en:"Fingerprint not set up (keystore error)"},
  "bio.on":{de:"Fingerabdruck-Entsperren aktiv",en:"Fingerprint unlock active"},"bio.off":{de:"Fingerabdruck-Entsperren deaktiviert",en:"Fingerprint unlock disabled"},
  "bio.rearmed":{de:"Fingerabdruck wieder aktiv",en:"Fingerprint active again"},
  "bio.naEnrolled":{de:"Im System ist kein Fingerabdruck eingerichtet (Android-Einstellungen → Sicherheit).",en:"No fingerprint enrolled in the system (Android settings → Security)."},
  "bio.naHardware":{de:"Dieses Gerät hat keinen Fingerabdrucksensor der Klasse „stark“ (Android-Einstufung).",en:"This device has no fingerprint sensor of Android's 'strong' class."},
  "bio.naNow":{de:"Fingerabdrucksensor derzeit nicht verfügbar.",en:"Fingerprint sensor currently unavailable."},
  "confirm.bioDisable":{de:"Fingerabdruck-Entsperren wirklich deaktivieren?",en:"Really disable fingerprint unlock?"},
  "toast.suggest":{de:"Vorschlag eingetragen — jetzt aufschreiben!",en:"Suggestion filled in — write it down now!"},
  "toast.wordsMissing":{de:"Wortliste fehlt — Würfelwörter nicht verfügbar",en:"Word list missing — dice words unavailable"},
  "toast.noEntry":{de:"Kein Eintrag gewählt",en:"No entry selected"},
  "copy.done":{de:"{what} kopiert · wird in {s} s geleert",en:"{what} copied · cleared in {s} s"},
  "copy.doneNoClear":{de:"{what} kopiert",en:"{what} copied"},
  "copy.manual":{de:"Kopieren nicht möglich — bitte manuell markieren",en:"Copy not possible — please select manually"},
  "copy.empty":{de:"Nichts zu kopieren",en:"Nothing to copy"},
  "what.user":{de:"Nutzername",en:"Username"},"what.email":{de:"E-Mail",en:"E-mail"},"what.pass":{de:"Passwort",en:"Password"},"what.url":{de:"URL",en:"URL"},
  "what.totp":{de:"Code",en:"Code"},"what.gen":{de:"Passwort",en:"Password"},"what.notes":{de:"Notizen",en:"Notes"},
  "what.holder":{de:"Inhaber",en:"Holder"},"what.number":{de:"Kartennummer",en:"Card number"},"what.expiry":{de:"Ablauf",en:"Expiry"},"what.cvv":{de:"CVV",en:"CVV"},"what.pin":{de:"PIN",en:"PIN"},"what.iban":{de:"IBAN",en:"IBAN"},"what.bic":{de:"BIC",en:"BIC"},"what.bank":{de:"Bank",en:"Bank"},
  "what.extra":{de:"Zusatzfeld",en:"Extra field"},"what.secret":{de:"Schlüssel",en:"Key"},"what.otpauth":{de:"otpauth-Link",en:"otpauth link"},
  "d.holder":{de:"Karteninhaber",en:"Cardholder"},"d.number":{de:"Kartennummer",en:"Card number"},"d.expiry":{de:"Gültig bis",en:"Valid until"},"d.cvv":{de:"Prüfnummer (CVV)",en:"Security code (CVV)"},"d.pin":{de:"PIN",en:"PIN"},"d.cat":{de:"Kategorie",en:"Category"},
  "d.bholder":{de:"Kontoinhaber",en:"Account holder"},"d.iban":{de:"IBAN / Kontonummer",en:"IBAN / account number"},"d.bic":{de:"BIC / SWIFT",en:"BIC / SWIFT"},"d.bank":{de:"Bank",en:"Bank"},
  "confirm.typeChange":{de:"Typ wechseln? Dabei werden gelöscht: {f}. Das lässt sich nicht rückgängig machen — auch nicht über ein Backup.",en:"Change the type? This deletes: {f}. It cannot be undone — not even from a backup."},
  "lostf.f-user":{de:"Nutzername",en:"username"},"lostf.f-email":{de:"E-Mail",en:"e-mail"},"lostf.f-pass":{de:"Passwort",en:"password"},"lostf.f-url":{de:"URL",en:"URL"},"lostf.f-totp":{de:"TOTP-Schlüssel",en:"TOTP secret"},
  "lostf.f-holder":{de:"Inhaber",en:"holder"},"lostf.f-number":{de:"Kartennummer",en:"card number"},"lostf.f-expiry":{de:"Ablauf",en:"expiry"},"lostf.f-cvv":{de:"CVV",en:"CVV"},"lostf.f-pin":{de:"PIN",en:"PIN"},
  "lostf.f-bholder":{de:"Kontoinhaber",en:"account holder"},"lostf.f-iban":{de:"IBAN",en:"IBAN"},"lostf.f-bic":{de:"BIC",en:"BIC"},"lostf.f-bank":{de:"Bank",en:"bank"},"lostf.f-bpin":{de:"PIN",en:"PIN"},
  "imp.truncated":{de:"⚠ {t} Eintrag/Einträge auf 10.000 Zeichen Notizen gekürzt.",en:"⚠ {t} entry/entries had notes cut at 10,000 characters."},
  "imp.hiddenOver":{de:"⚠ {n} versteckte(s) Feld(er) über dem Deckel von {m} je Eintrag stehen im KLARTEXT in den Notizen — bitte prüfen.",en:"⚠ {n} hidden field(s) beyond the cap of {m} per entry are in the notes in PLAIN TEXT — please review."},
  "pill.note":{de:"Notiz",en:"Note"},"pill.card":{de:"Karte",en:"Card"},"pill.bank":{de:"Konto",en:"Account"},"chip.all":{de:"Alle",en:"All"},"chip.none":{de:"Ohne Kategorie",en:"No category"},
  "err.totp6":{de:"Bitte den 6-stelligen Code eingeben.",en:"Please enter the 6-digit code."},
  "err.totpSetupBad":{de:"Code stimmt nicht. In Aegis prüfen.",en:"Code doesn't match. Check in Aegis."},
  "confirm.totpDisable":{de:"Aegis-Hürde wirklich deaktivieren?",en:"Really disable the Aegis hurdle?"},
  "toast.totpOn":{de:"Aegis-Hürde aktiv",en:"Aegis hurdle active"},"toast.totpOff":{de:"Aegis-Hürde deaktiviert",en:"Aegis hurdle disabled"},
  "toast.qrSaved":{de:"QR als Bild gespeichert",en:"QR saved as image"},"toast.qrSaveFail":{de:"QR-Speichern fehlgeschlagen",en:"Saving QR failed"},"toast.noQr":{de:"Kein QR vorhanden",en:"No QR available"},
  "busy.importing":{de:"Importiere…",en:"Importing…"},
  "pt.done":{de:"{n} Einträge aus {v} Proton-Tresor(en) importiert, {s} Dubletten übersprungen, {k} nicht übernommen (Papierkorb/leer).",en:"{n} entries imported from {v} Proton vault(s), {s} duplicates skipped, {k} not imported (trash/empty)."},
  "pt.needPass":{de:"PGP-verschlüsselter Export erkannt — Passphrase eingeben.",en:"PGP-encrypted export detected — enter the passphrase."},
  "pt.wrongPass":{de:"Falsche Passphrase oder beschädigte Datei.",en:"Wrong passphrase or damaged file."},
  "pt.algo":{de:"Diese Export-Variante wird nicht unterstützt (z.B. neues OpenPGP-Format mit AEAD/Argon2 oder Public-Key). Bitte den Export unverschlüsselt als ZIP/JSON oder als CSV verwenden.",en:"This export variant is not supported (e.g. new OpenPGP format with AEAD/Argon2 or public-key). Please use the unencrypted ZIP/JSON export or CSV."},
  "pt.bad":{de:"Kein Proton-Pass-Export (erwartet: ZIP mit data.pgp/data.json, .pgp oder .json).",en:"Not a Proton Pass export (expected: ZIP with data.pgp/data.json, .pgp or .json)."},
  "pt.mdc":{de:"Integritätsprüfung fehlgeschlagen: Die Datei wurde verändert oder ist beschädigt (selten: falsche Passphrase). Nichts importiert.",en:"Integrity check failed: the file was modified or is damaged (rarely: wrong passphrase). Nothing imported."},
  "bio.wrapMismatch":{de:"Der Passphrase-Schlüssel der Tresordatei wurde verändert — Fingerabdruck verweigert. Bitte Passphrase; falls sie nicht mehr passt, das letzte Backup zurückspielen.",en:"The vault file's passphrase key was altered — fingerprint refused. Use the passphrase; if it no longer works, restore the last backup."},
  "bio.aborted":{de:"Fingerabdruck nicht aktiviert — Vorgang durch Sperre oder Passphrase-Wechsel abgebrochen",en:"Fingerprint not enabled — interrupted by lock or passphrase change"},
  "bio.busy":{de:"Bitte erst den laufenden Fingerabdruck-Vorgang abschließen.",en:"Finish the pending fingerprint step first."},
  "bio.held":{de:"Bewusst gesperrt: Diesmal ist die Passphrase nötig — danach gilt der Fingerabdruck wieder.",en:"Locked deliberately: the passphrase is required this time — the fingerprint works again afterwards."},
  "pt.zip64":{de:"ZIP zu groß/ZIP64 — bitte ohne Dateianhänge exportieren.",en:"ZIP too large/ZIP64 — please export without file attachments."},
  "add.titleNew":{de:"Neuer Eintrag",en:"New entry"},
  "add.titleEdit":{de:"Eintrag bearbeiten",en:"Edit entry"},
  "list.empty":{de:"Noch keine Einträge.\nTippe auf + oder importiere unter „Sicherung“ aus Proton Pass, KeePassXC oder Bitwarden.",en:"No entries yet.\nTap + or import under “Backup” from Proton Pass, KeePassXC or Bitwarden."},
  "list.noMatch":{de:"Keine Treffer.",en:"No matches."},
  "health.ok":{de:"✓ Passwort-Gesundheit: keine Auffälligkeiten",en:"✓ Password health: nothing to report"},
  "health.bad":{de:"⚠ {r} wiederverwendet · {w} kurz",en:"⚠ {r} reused · {w} short"},
  "badge.reused":{de:"doppelt",en:"reused"},"badge.weak":{de:"kurz",en:"short"},
  "d.user":{de:"Nutzername / E-Mail",en:"Username / e-mail"},"d.email":{de:"E-Mail",en:"E-mail"},"d.pass":{de:"Passwort",en:"Password"},"d.url":{de:"URL / App",en:"URL / app"},
  "d.totp":{de:"TOTP-Code",en:"TOTP code"},"d.notes":{de:"Notizen",en:"Notes"},
  "d.show":{de:"Anzeigen",en:"Show"},"d.hide":{de:"Verbergen",en:"Hide"},"d.copy":{de:"Kopieren",en:"Copy"},
  "d.meta":{de:"Angelegt {c} · Geändert {u}",en:"Created {c} · Updated {u}"},
  "d.fav":{de:"★ Favorit",en:"★ Favourite"},"d.unfav":{de:"☆ Kein Favorit",en:"☆ Not a favourite"},
  "confirm.delete":{de:"Eintrag „{t}“ in den Papierkorb legen? {d} Tage wiederherstellbar, danach endgültig. (Wird beim Sync auf andere Geräte übernommen.)",en:"Move “{t}” to the trash? Restorable for {d} days, then gone for good. (Deletion syncs to other devices.)"},
  "confirm.purge":{de:"„{t}“ endgültig löschen? Das lässt sich nicht rückgängig machen.",en:"Delete “{t}” permanently? This cannot be undone."},
  "confirm.emptyTrash":{de:"Alle {n} Einträge im Papierkorb endgültig löschen? Das lässt sich nicht rückgängig machen.",en:"Permanently delete all {n} entries in the trash? This cannot be undone."},
  "confirm.wipe":{de:"Den Tresor auf diesem Gerät wirklich löschen? Ohne Backup sind alle Passwörter weg.",en:"Really delete the vault on this device? Without a backup all passwords are gone."},
  "confirm.bigKdf":{de:"Die Datei verlangt {m} MiB Arbeitsspeicher für Argon2 — das kann auf dem Handy abstürzen. Trotzdem versuchen?",en:"The file demands {m} MiB of memory for Argon2 — this may crash on a phone. Try anyway?"},
  "gen.bits":{de:"≈ {b} Bit Entropie",en:"≈ {b} bits of entropy"},
  "gen.noset":{de:"Mindestens einen Zeichensatz wählen.",en:"Select at least one character set."},
  "gen.done":{de:"Fertig",en:"Done"},
  "bk.done":{de:"Backup gespeichert: {n}",en:"Backup saved: {n}"},
  "bk.doneNative":{de:"Backup geschrieben nach Dokumente: {n}",en:"Backup written to Documents: {n}"},
  "bk.doneShare":{de:"Backup über den Teilen-Dialog bereitgestellt: {n} — dort ein Ziel wählen (Dateien, Syncthing …).",en:"Backup offered via the share sheet: {n} — pick a destination there (Files, Syncthing …)."},
  "bk.failed":{de:"Backup fehlgeschlagen: {e}",en:"Backup failed: {e}"},
  "bk.none":{de:"⚠ Noch kein Backup. Sicherung → Backup erstellen.",en:"⚠ No backup yet. Backup → Create backup."},
  "bk.stale":{de:"⚠ Letztes Backup vor {d} Tagen — seitdem {n} Änderung(en).",en:"⚠ Last backup {d} days ago — {n} change(s) since."},
  "bk.readErr":{de:"Datei konnte nicht gelesen werden.",en:"Could not read the file."},
  "bk.merged":{de:"Zusammengeführt: {a} neu, {u} aktualisiert, {d} gelöscht ({t} Löschmarken in der Datei).",en:"Merged: {a} new, {u} updated, {d} deleted ({t} deletion markers in the file)."},
  "bk.mergeFail":{de:"Falsche Passphrase oder beschädigte Datei.",en:"Wrong passphrase or damaged file."},
  "csv.unknown":{de:"Format nicht erkannt — Kopfzeile braucht mindestens Titel/Name und Passwort.",en:"Format not recognised — header needs at least title/name and password."},
  "csv.done":{de:"{n} Einträge importiert ({f}), {s} Dubletten übersprungen, {b} Zeilen unbrauchbar. Jetzt die CSV-Datei löschen!",en:"{n} entries imported ({f}), {s} duplicates skipped, {b} rows unusable. Delete the CSV file now!"},
  "csv.empty":{de:"Keine Datenzeilen gefunden.",en:"No data rows found."},
  "fmt.proton":{de:"Proton Pass",en:"Proton Pass"},"fmt.keepassxc":{de:"KeePassXC",en:"KeePassXC"},"fmt.bitwarden":{de:"Bitwarden",en:"Bitwarden"},"fmt.generic":{de:"generisches CSV",en:"generic CSV"},
  "about":{de:"Alien Pass v{v} · Argon2id m={m} MiB t={t} p={p} · AES-256-GCM",en:"Alien Pass v{v} · Argon2id m={m} MiB t={t} p={p} · AES-256-GCM"},
  "pass.s0":{de:"zu kurz (mind. 12 Zeichen)",en:"too short (min. 12 characters)"},
  "pass.s1":{de:"okay — länger ist besser",en:"okay — longer is better"},
  "pass.s2":{de:"stark",en:"strong"},
  "pass.s3":{de:"sehr stark",en:"very strong"},
  "nocrypto":{de:"Dieser Browser unterstützt kein WebCrypto/WebAssembly oder läuft nicht im sicheren Kontext. Bitte die App verwenden oder die Seite über https:// bzw. localhost öffnen.",en:"This browser lacks WebCrypto/WebAssembly or is not a secure context. Please use the app or open the page via https:// or localhost."}
};
const _qsLang = new URLSearchParams(window.location.search).get('lang');
let LANG = (_qsLang==='de'||_qsLang==='en') ? _qsLang
  : (['de','en'].includes(localStorage.getItem(LANG_KEY)) ? localStorage.getItem(LANG_KEY) : ((navigator.language||'de').toLowerCase().indexOf('de')===0?'de':'en'));
const _i18nCache = new WeakMap();
function tr(key, params){ const e=T[key]; const s=e?(e[LANG]!==undefined?e[LANG]:e.de):key; return params?s.replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(params,k)?String(params[k]):m):s; }
function applyI18n(){
  document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-ph]').forEach(el=>{
    let c=_i18nCache.get(el); if(!c){ c={}; _i18nCache.set(el,c); }
    [['data-i18n','textContent'],['data-i18n-html','innerHTML'],['data-i18n-ph','placeholder']].forEach(([attr,prop])=>{
      const key=el.getAttribute(attr); if(!key) return;
      if(c[prop]===undefined) c[prop]=el[prop];
      const en=I18N[key];
      el[prop]=(LANG==='en'&&en!==undefined)?en:c[prop];
    });
  });
  document.documentElement.setAttribute('lang',LANG);
  const lb=document.getElementById('lang-btn'); if(lb) lb.textContent=(LANG==='de'?'DE':'EN');
  if(typeof App!=='undefined'&&App.syncCombos) App.syncCombos();   // Optionen tragen data-i18n → Knopfbeschriftung nachziehen
}
function setLang(l){ LANG=l; try{localStorage.setItem(LANG_KEY,l);}catch(_){ } applyI18n(); if(typeof App!=='undefined'&&App.relabel) App.relabel(); }

/* === VAULT-FORMAT BEGIN ===
   Reine Funktionen ohne DOM: Bytes/Base64/Base32, Zufall, Argon2id-Schlüsselhierarchie,
   Dateiformat AIPV1, Sanitizer, Merge, TOTP, Generator, CSV-Parser + Import-Mapping.
   roundtrip-test.mjs evaluiert GENAU diesen Textabschnitt in Node (keine Nachbildung). */
const enc = new TextEncoder(), dec = new TextDecoder();
function bufToB64(buf){let b='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i++)b+=String.fromCharCode(u[i]);return btoa(b);}
function b64ToBuf(b64){const s=atob(b64);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;}
function b64Bytes(s){ if(typeof s!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null; try{ return new Uint8Array(b64ToBuf(s)); }catch(_){ return null; } }
const B32A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(bytes){let bits=0,val=0,out='';for(const b of bytes){val=(val<<8)|b;bits+=8;while(bits>=5){out+=B32A[(val>>>(bits-5))&31];bits-=5;}}if(bits>0)out+=B32A[(val<<(5-bits))&31];return out;}
function base32Decode(str){str=str.toUpperCase().replace(/=+$/,'').replace(/\s/g,'');let bits=0,val=0;const out=[];for(const c of str){const idx=B32A.indexOf(c);if(idx<0)continue;val=(val<<5)|idx;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&0xff);bits-=8;}}return new Uint8Array(out);}
function rand(n){ return crypto.getRandomValues(new Uint8Array(n)); }
// Gleichverteilt in [0,n) ohne Modulo-Bias (Rejection-Sampling über 32-Bit-Werte)
function randInt(n){ if(!Number.isInteger(n)||n<=0||n>0x100000000) throw new Error('range'); const limit=Math.floor(0x100000000/n)*n; const buf=new Uint32Array(1); for(;;){ crypto.getRandomValues(buf); if(buf[0]<limit) return buf[0]%n; } }
function cryptoId(){ return Array.from(rand(8),b=>b.toString(16).padStart(2,'0')).join(''); }
function passBytes(p){ return enc.encode(String(p).normalize('NFKC')); }

/* ---------- Dateiformat AIPV1 + Schlüsselhierarchie ----------
   KEK = Argon2id(Passphrase) verpackt den zufälligen DEK (AES-KW-frei: AES-GCM wrapKey mit AAD).
   AAD bindet magic/ver/KDF-Parameter/Salt + Rolle (wrap|body) — aus DEKODIERTEN Werten kanonisch
   erzeugt, auf Lese- UND Schreibpfad identisch. */
const MAGIC='AIPV1', FILE_VER=1;
const KDF_DEFAULT={m:65536,t:3,p:1};
const KDF_BOUNDS={mMin:8192,mMax:262144,tMin:1,tMax:16,pMin:1,pMax:4,budget:786432};
const KDF_CONFIRM_M=131072;
const MAX_FILE_BYTES=20*1024*1024, MAX_ENTRIES=10000;
function kdfOk(k){ const B=KDF_BOUNDS; return !!k && Number.isInteger(k.m)&&Number.isInteger(k.t)&&Number.isInteger(k.p)
  && k.m>=B.mMin&&k.m<=B.mMax && k.t>=B.tMin&&k.t<=B.tMax && k.p>=B.pMin&&k.p<=B.pMax && k.m*k.t<=B.budget; }
function aad(kdf, role){ return enc.encode(`${MAGIC}|${FILE_VER}|argon2id|${kdf.m}|${kdf.t}|${kdf.p}|${bufToB64(kdf.salt)}|${role}`); }
async function argon2Raw(pass, kdf){
  if(!kdfOk(kdf)) throw new Error('kdfbounds');
  const raw=await globalThis.hashwasm.argon2id({password:pass, salt:kdf.salt, parallelism:kdf.p, iterations:kdf.t, memorySize:kdf.m, hashLength:32, outputType:'binary'});
  if(pass instanceof Uint8Array) pass.fill(0);
  return raw;
}
async function deriveKek(pass, kdf){
  const raw=await argon2Raw(pass, kdf);
  const key=await crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['wrapKey','unwrapKey']);
  raw.fill(0); return key;
}
function newDek(){ return crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt','decrypt']); }
// Rolle 'wrap' = Passphrase-Slot in der Datei; 'bio' = Fingerabdruck-Slot (außerhalb der Datei, an denselben Header gebunden)
async function wrapDek(dek, kek, kdf, role){ const iv=rand(12); const ct=new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, {name:'AES-GCM', iv, additionalData:aad(kdf,role||'wrap')})); return {iv, ct}; }
function unwrapDek(wrap, kek, kdf, extractable, role){ return crypto.subtle.unwrapKey('raw', wrap.ct, kek, {name:'AES-GCM', iv:wrap.iv, additionalData:aad(kdf,role||'wrap')}, {name:'AES-GCM',length:256}, !!extractable, ['encrypt','decrypt']); }
/* Fingerabdruck-Slot: 32 Byte Zufall (nur der Android-Keystore gibt sie nach Fingerabdruck heraus) werden als nicht
   extrahierbarer Wrap-Schlüssel importiert; der Blob {iv,ct} liegt unter 'ai-pass-bio' und wird NIE exportiert. */
function bioKey(raw){ if(!(raw instanceof Uint8Array)||raw.length!==32) throw new Error('biokey'); return crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['wrapKey','unwrapKey']); }
// `w` = b64 des Passphrase-Wrap-Ciphertexts, für den der Slot erzeugt wurde: doBio übernimmt f.wrap nur, wenn es dazu passt —
// sonst könnte ein manipulierter wrap in der Datei per Fingerabdruck-Sitzung stillschweigend weitergeschrieben und in jedes Backup kopiert werden (Audit run-3 #3)
function parseBioBlob(raw){ if(typeof raw!=='string'||raw.length>512) return null; let o; try{ o=JSON.parse(raw); }catch(_){ return null; } if(!o||typeof o!=='object') return null; const iv=b64Bytes(o.iv), ct=b64Bytes(o.ct), w=b64Bytes(o.w); return (iv&&iv.length===12&&ct&&ct.length===48&&w&&w.length===48)?{iv,ct,w:o.w}:null; }
function serializeBioBlob(blob, wrapCt){ if(!(wrapCt instanceof Uint8Array)||wrapCt.length!==48) throw new Error('bioblob'); return JSON.stringify({iv:bufToB64(blob.iv), ct:bufToB64(blob.ct), w:bufToB64(wrapCt)}); }
async function encryptBody(obj, dek, kdf){ const iv=rand(12); const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(kdf,'body')}, dek, enc.encode(JSON.stringify(obj)))); return {iv,ct}; }
async function decryptBody(body, dek, kdf){ const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:body.iv,additionalData:aad(kdf,'body')}, dek, body.ct); return JSON.parse(dec.decode(pt)); }
function serializeFile(kdf, wrap, body){
  return JSON.stringify({magic:MAGIC, ver:FILE_VER,
    kdf:{name:'argon2id', m:kdf.m, t:kdf.t, p:kdf.p, salt:bufToB64(kdf.salt)},
    wrap:{iv:bufToB64(wrap.iv), ct:bufToB64(wrap.ct)},
    body:{iv:bufToB64(body.iv), ct:bufToB64(body.ct)}});
}
// Prüft Struktur + Grenzen VOR jeder KDF-Arbeit. Wirft Error('format'|'newer'|'kdfbounds'|'toolarge').
function parseFile(raw){
  if(typeof raw!=='string') throw new Error('format');
  if(raw.length>MAX_FILE_BYTES) throw new Error('toolarge');
  let f; try{ f=JSON.parse(raw); }catch(_){ throw new Error('format'); }
  if(!f||typeof f!=='object'||f.magic!==MAGIC) throw new Error('format');
  if(f.ver!==FILE_VER) throw new Error((Number.isInteger(f.ver)&&f.ver>FILE_VER)?'newer':'format');
  const k=f.kdf; if(!k||typeof k!=='object'||k.name!=='argon2id') throw new Error('format');
  const kdf={m:k.m, t:k.t, p:k.p, salt:b64Bytes(k.salt)};
  if(!kdf.salt||kdf.salt.length!==16) throw new Error('format');
  if(!kdfOk(kdf)) throw new Error('kdfbounds');
  const wrap={iv:b64Bytes(f.wrap&&f.wrap.iv), ct:b64Bytes(f.wrap&&f.wrap.ct)};
  const body={iv:b64Bytes(f.body&&f.body.iv), ct:b64Bytes(f.body&&f.body.ct)};
  if(!wrap.iv||wrap.iv.length!==12||!wrap.ct||wrap.ct.length!==48) throw new Error('format');
  if(!body.iv||body.iv.length!==12||!body.ct||body.ct.length<16) throw new Error('format');
  return {kdf, wrap, body};
}

/* ---------- Vault-Objekt, Sanitizer, Merge ---------- */
const VAULT_VERSION=1;
const SETTINGS_ALLOWED={autolock:[0,1,2,5,15], bgLock:[0,30,60,300], clipClear:[0,15,30,60]};
const SETTINGS_DEFAULT={autolock:2, bgLock:30, clipClear:30};
const TOMBSTONE_DAYS=365, MAX_TOMBSTONES=2000;   // Löschmarken zählen NICHT zum Eintrags-Cap, sind aber separat begrenzt
// Papierkorb (v1.5): Inhalt gelöschter Einträge bleibt TRASH_DAYS erhalten, höchstens MAX_TRASH Stück.
// TRASH_DAYS MUSS < TOMBSTONE_DAYS sein — sonst könnte purgeTombstones einen Papierkorb-Eintrag MIT Inhalt
// droppen, statt ihn vorher auf die Löschmarke zurückzuschneiden.
// MAX_TRASH ist die tragende Grenze, nicht Kosmetik: ein Eintrag kann ~22 KB tragen (notes 10k + pass 1k +
// url 2k + 8 Zusatzfelder), 2000 davon sprengten die localStorage-Quota.
const TRASH_DAYS=30, MAX_TRASH=200;
function emptyVault(){ return {version:VAULT_VERSION, entries:[], settings:Object.assign({},SETTINGS_DEFAULT), totp:null, meta:{lastBackup:null, lastBackupCount:0}}; }
const ID_RE=/^[0-9a-f]{16}$/;
const CAPS={title:200,user:200,pass:1000,url:2000,notes:10000,issuer:100,label:200,email:200,cat:40,holder:100,number:32,expiry:10,cvv:8,pin:12,iban:42,bic:11,bank:100,xname:40,xvalue:1000};
const EXTRA_MAX=8;   // Zusatzfelder je Eintrag (v1.4)
const ENTRY_TYPES=['login','note','card','bank'];
function str(v,cap){ return typeof v==='string' ? v.slice(0,cap) : ''; }
// Einzeilige Anzeigetexte (Titel, Kategorie): Steuer-, Nullbreiten- und Bidi-Zeichen raus, Whitespace auf ein Leerzeichen, getrimmt
const CTRL_RE=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;   // Tab/LF/CR bleiben für den Whitespace-Kollaps
function line(v,cap){ return str(v,cap).replace(CTRL_RE,'').replace(/\s+/g,' ').trim(); }
function entryType(t){ return ENTRY_TYPES.includes(t)?t:'login'; }
// Kartendaten: frisches Objekt mit festen Feldern; komplett leer → null
function sanitizeCard(c){ if(!c||typeof c!=='object'||Array.isArray(c)) return null;
  const o={holder:str(c.holder,CAPS.holder).trim(), number:str(c.number,CAPS.number).replace(/[^0-9 ]/g,'').trim(), expiry:str(c.expiry,CAPS.expiry).trim(), cvv:str(c.cvv,CAPS.cvv).trim(), pin:str(c.pin,CAPS.pin).trim()};
  return (o.holder||o.number||o.expiry||o.cvv||o.pin)?o:null; }
// Bankkonto (v1.3): Inhaber, IBAN/Kontonummer (nur Buchstaben/Ziffern/Leerzeichen, Großschreibung), BIC, Bank, PIN; komplett leer → null
function sanitizeBank(b){ if(!b||typeof b!=='object'||Array.isArray(b)) return null;
  const o={holder:line(b.holder,CAPS.holder), iban:str(b.iban,CAPS.iban).replace(/[^0-9A-Za-z ]/g,'').toUpperCase().replace(/\s+/g,' ').trim(), bic:str(b.bic,CAPS.bic).replace(/[^0-9A-Za-z]/g,'').toUpperCase(), bank:line(b.bank,CAPS.bank), pin:str(b.pin,CAPS.pin).trim()};
  return (o.holder||o.iban||o.bic||o.bank||o.pin)?o:null; }
// Zusatzfelder (v1.4): frei benannte, IMMER geheime Werte („App-PIN“, „Telefon-Kennwort“ …) — für alle Typen; Name über line(), Wert roh.
// Nur Paare mit Name UND Wert überleben, höchstens EXTRA_MAX, Reihenfolge bleibt; sonst leeres Array (nie null — Tombstone/Whitelist stabil).
function sanitizeExtra(list){ if(!Array.isArray(list)) return []; const out=[];
  for(const x of list){ if(!x||typeof x!=='object'||Array.isArray(x)) continue; const name=line(x.name,CAPS.xname), value=str(x.value,CAPS.xvalue); if(name&&value) out.push({name,value}); if(out.length>=EXTRA_MAX) break; }
  return out; }
// Dubletten-Schlüssel für Importe (Typ + identischer Inhalt der tragenden Felder)
// Kanonisch über alle tragenden Felder (nicht: id/Zeitstempel/fav/nowarn/cat — sonst würde ein umbenannter Proton-Tresor
// beim Re-Import jeden Eintrag verdoppeln); zwei Einträge, die sich nur in TOTP/URL/Notizen/Kartendaten unterscheiden, sind KEINE Dubletten.
function dupKey(e){ return canon({type:e.type, title:e.title, user:e.user, email:e.email||'', pass:e.pass, url:e.url, notes:e.notes, totp:e.totp, card:e.card, bank:e.bank, extra:e.extra||[]}); }
function isoOrNull(v){ if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)) return null; const t=Date.parse(v); return Number.isFinite(t)?new Date(t).toISOString():null; }
function parseOtpauth(uri){
  let u; try{ u=new URL(uri); }catch(_){ return null; }
  if(u.protocol!=='otpauth:'||u.host.toLowerCase()!=='totp') return null;
  let label=''; try{ label=decodeURIComponent(u.pathname.replace(/^\/+/,'')); }catch(_){ label=u.pathname.replace(/^\/+/,''); }
  const q=u.searchParams; let issuer=q.get('issuer')||''; if(!issuer&&label.includes(':')) issuer=label.split(':')[0];
  return {secret:q.get('secret')||'', algorithm:q.get('algorithm')||'SHA1', digits:q.get('digits')||6, period:q.get('period')||30, issuer, label};
}
// Normalisiert String (Base32 oder otpauth://) oder Objekt → {secret,algorithm,digits,period,issuer,label} | null
function normalizeTotp(v){
  let o=null;
  if(typeof v==='string'){ const s=v.trim(); if(!s) return null; o=/^otpauth:\/\//i.test(s)?parseOtpauth(s):{secret:s}; }
  else if(v&&typeof v==='object'&&!Array.isArray(v)) o={secret:v.secret, algorithm:v.algorithm, digits:v.digits, period:v.period, issuer:v.issuer, label:v.label};
  if(!o||typeof o.secret!=='string') return null;
  const secret=o.secret.toUpperCase().replace(/[\s=-]/g,'');
  if(!/^[A-Z2-7]{8,256}$/.test(secret)) return null;
  const alg=String(o.algorithm==null?'SHA1':o.algorithm).toUpperCase().replace('-','');
  if(!['SHA1','SHA256','SHA512'].includes(alg)) return null;
  const digits=o.digits==null||o.digits===''?6:Number(o.digits); if(![6,7,8].includes(digits)) return null;
  const period=o.period==null||o.period===''?30:Number(o.period); if(!Number.isInteger(period)||period<15||period>300) return null;
  return {secret, algorithm:alg, digits, period, issuer:str(o.issuer,CAPS.issuer), label:str(o.label,CAPS.label)};
}
function otpauthUri(t){ const lbl=encodeURIComponent(t.label||t.issuer||'Alien Pass'); let s=`otpauth://totp/${lbl}?secret=${t.secret}`; if(t.issuer) s+=`&issuer=${encodeURIComponent(t.issuer)}`; if(t.algorithm!=='SHA1') s+=`&algorithm=${t.algorithm}`; if(t.digits!==6) s+=`&digits=${t.digits}`; if(t.period!==30) s+=`&period=${t.period}`; return s; }
// Whitelist: baut ein frisches Objekt; ungültige ID → null (Aufrufer verwirft).
// Seit v1.5 laufen GELÖSCHTE Einträge durch dieselbe Whitelist wie lebende (Papierkorb) — sie behalten ihren Inhalt und
// verlieren ihn erst durch wipeTrash()/tombstone(). Ein Gerät mit v1.4 oder älter räumt sie beim Laden ab: gewollte,
// dokumentierte Degradation (Datenverlust nur bei bereits Gelöschtem — nie ein Wiederauferstehen).
function sanitizeEntry(e, now){
  if(!e||typeof e!=='object'||Array.isArray(e)) return null;
  const id=typeof e.id==='string'?e.id.toLowerCase():''; if(!ID_RE.test(id)) return null;
  now=now||Date.now(); const maxT=now+120000, EPOCH='1970-01-01T00:00:00.000Z';
  let created=isoOrNull(e.created), updated=isoOrNull(e.updated), deleted=e.deleted==null||e.deleted===false?null:isoOrNull(e.deleted);
  if(!updated) updated=EPOCH;
  if(!created) created=updated;
  const tc=Math.min(Date.parse(created),maxT); let tu=Math.min(Date.parse(updated),maxT); if(tu<tc) tu=tc;
  created=new Date(tc).toISOString(); updated=new Date(tu).toISOString();
  if(e.deleted&&!deleted) deleted=updated;                       // "gelöscht" ohne brauchbares Datum → Änderungsdatum
  // Löschdatum klemmen (stand bis v1.4 im Wipe-Zweig): eine fremde Datei darf die Papierkorb-Frist nicht in die Zukunft schieben.
  if(deleted) deleted=new Date(Math.min(Date.parse(deleted),maxT)).toISOString();
  // Typ bestimmt, welche Felder überhaupt tragen: login (user/pass/url/totp/nowarn), note (nur Notizen), card (Kartenobjekt), bank (Kontoobjekt)
  const type=entryType(e.type);
  const o={id, type, cat:line(e.cat,CAPS.cat), title:line(e.title,CAPS.title), user:'', email:'', pass:'', url:'', notes:str(e.notes,CAPS.notes),
           totp:null, card:null, bank:null, extra:sanitizeExtra(e.extra), nowarn:false, fav:e.fav===true, created, updated, deleted};   // extra gilt für jeden Typ
  if(type==='login'){ o.user=str(e.user,CAPS.user); o.email=line(e.email,CAPS.email); o.pass=str(e.pass,CAPS.pass); o.url=str(e.url,CAPS.url); o.totp=normalizeTotp(e.totp); o.nowarn=e.nowarn===true; }
  else if(type==='card'){ o.card=sanitizeCard(e.card); }
  else if(type==='bank'){ o.bank=sanitizeBank(e.bank); }
  return o;
}
// Kanonische Serialisierung ALLER Ebenen (Array-Replacer von JSON.stringify wäre nur eine Allowlist → totp:{})
function canon(v){ if(v===undefined||v===null||typeof v!=='object') return JSON.stringify(v===undefined?null:v); if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}'; }
const liveCount=list=>list.reduce((n,e)=>n+(e.deleted?0:1),0);
function ts(v){ const t=Date.parse(v); return Number.isFinite(t)?t:0; }
// Deterministischer Gewinner: neueres updated; Gleichstand → Tombstone; sonst größerer kanonischer JSON-String.
// Unter ZWEI Löschmarken gewinnt die gewipte. Nötig, weil canon() den inhaltsvollen Stand fast immer voranstellt
// ("pass":"pw" > "pass":"", "totp":{…} > "totp":null) — ohne die Regel machte ein Gerät, dessen Uhr abweicht, jeden
// Wipe wieder rückgängig, und der Re-Import derselben Datei wäre nicht mehr idempotent.
// NICHT über "kleinerer canon()" abkürzen: bei einem INHALTSLOSEN card-/bank-Eintrag ist die gewipte Gestalt die
// größere ("type":"card" < "type":"login"). Es braucht das explizite isWiped-Prädikat.
function winner(a,b){ const ta=ts(a.updated), tb=ts(b.updated); if(ta!==tb) return ta>tb?a:b;
  if(!!a.deleted!==!!b.deleted) return a.deleted?a:b;
  if(a.deleted&&b.deleted){ const wa=isWiped(a), wb=isWiped(b); if(wa!==wb) return wa?a:b; }
  return canon(a)>=canon(b)?a:b; }
function dedupeEntries(list){ const m=new Map(); for(const e of list){ const cur=m.get(e.id); m.set(e.id, cur?winner(cur,e):e); } return [...m.values()]; }
// Cap gilt nur für LIVE-Einträge; Tombstones werden gepurgt/gekappt statt gezählt (sonst könnte eine
// fremde Datei den Tresor mit unsichtbaren Löschmarken bis an den Cap füllen und der nächste eigene Eintrag brickt ihn).
function sanitizeEntries(list, now){ if(!Array.isArray(list)) return []; if(list.length>MAX_ENTRIES*4) throw new Error('toomany'); const out=[]; for(const e of list){ const s=sanitizeEntry(e,now); if(s) out.push(s); } const d=purgeTombstones(wipeTrash(dedupeEntries(out), now), now); if(liveCount(d)>MAX_ENTRIES) throw new Error('toomany'); return d; }
function sanitizeSettings(s){ const o={}; for(const k in SETTINGS_DEFAULT){ const v=s&&typeof s==='object'?Number(s[k]):NaN; o[k]=SETTINGS_ALLOWED[k].includes(v)?v:SETTINGS_DEFAULT[k]; } return o; }
function sanitizeVault(v, now){
  if(!v||typeof v!=='object') throw new Error('format');
  const meta=v.meta&&typeof v.meta==='object'?v.meta:{};
  return {version:VAULT_VERSION, entries:sanitizeEntries(v.entries, now), settings:sanitizeSettings(v.settings),
          totp:normalizeTotp(v.totp),                                   // Aegis-Hürde beim Entsperren (optional; nie aus Fremddateien übernommen)
          meta:{lastBackup:isoOrNull(meta.lastBackup), lastBackupCount:Number.isInteger(meta.lastBackupCount)?meta.lastBackupCount:0}};
}
// Merge (kommutativ, assoziativ, idempotent) — Ergebnis + Zähler. incoming ist bereits sanitisiert.
function mergeEntries(local, incoming){
  const map=new Map(); for(const e of local){ const c=map.get(e.id); map.set(e.id, c?winner(c,e):e); }   // local defensiv deduplizieren (Kommutativität)
  let added=0, updated=0, deleted=0;
  for(const inc of dedupeEntries(incoming)){
    const loc=map.get(inc.id);
    if(!loc){ map.set(inc.id,inc); if(!inc.deleted) added++; continue; }
    const w=winner(loc,inc); if(w===loc) continue;
    map.set(inc.id,inc); if(inc.deleted&&!loc.deleted) deleted++; else if(!inc.deleted) updated++;
  }
  return {entries:[...map.values()], added, updated, deleted, tombstonesIn:incoming.reduce((n,e)=>n+(e.deleted?1:0),0)};
}
function purgeTombstones(entries, now){ now=now||Date.now(); const kept=entries.filter(e=>!e.deleted || now-ts(e.deleted) < TOMBSTONE_DAYS*86400000);
  const tombs=kept.filter(e=>e.deleted); if(tombs.length<=MAX_TOMBSTONES) return kept;
  tombs.sort((a,b)=>ts(b.deleted)-ts(a.deleted)); const keep=new Set(tombs.slice(0,MAX_TOMBSTONES).map(e=>e.id)); return kept.filter(e=>!e.deleted||keep.has(e.id)); }
// Löschmarken-Gestalt zu einem Eintrag: inhaltsleer, Zeitstempel unverändert. Basis von tombstone(), isWiped() und wipeTrash().
function tombFrom(e){ return {id:e.id, type:'login', cat:'', title:'', user:'', email:'', pass:'', url:'', notes:'', totp:null, card:null, bank:null, extra:[], nowarn:false, fav:false, created:e.created, updated:e.updated, deleted:e.deleted}; }
// Sofortige, endgültige Löschmarke: Inhalt weg UND updated=jetzt — schlägt damit jeden älteren Stand auf anderen Geräten.
function tombstone(e, nowIso){ return tombFrom({id:e.id, created:e.created, updated:nowIso, deleted:nowIso}); }
// Gelöscht UND inhaltsleer. Stützt sich darauf, dass tombFrom() sanitizer-stabil ist (Test [22]).
function isWiped(e){ return !!e.deleted && canon(e)===canon(tombFrom(e)); }
// Papierkorb räumen: abgelaufene und überzählige Einträge auf die Löschmarke zurückschneiden — OHNE updated anzuheben.
// Sonst gälte der Wipe als Änderung (gewänne überall, und renderBackupHint() mahnte ohne Nutzeraktion).
// Der Merge braucht das nicht: winner() bevorzugt bei Gleichstand ohnehin die gewipte Gestalt.
// Rein und nicht-mutierend — die Aufrufer rollen über eine flache Array-Kopie zurück.
function wipeTrash(entries, now){ now=now||Date.now();
  const trash=entries.filter(e=>e.deleted&&!isWiped(e)); if(!trash.length) return entries;
  trash.sort((a,b)=>ts(b.deleted)-ts(a.deleted));                                     // jüngste Löschung zuerst — die ältesten weichen
  const wipe=new Set(trash.filter((e,i)=>i>=MAX_TRASH||now-ts(e.deleted)>=TRASH_DAYS*86400000).map(e=>e.id));
  return wipe.size?entries.map(e=>wipe.has(e.id)?tombFrom(e):e):entries; }

/* ---------- TOTP (RFC 6238; SHA1/256/512, 6–8 Stellen, Periode) ---------- */
async function totpCode(t, forTime){
  const counter=Math.floor((forTime==null?Date.now():forTime)/1000/t.period);
  const hash={SHA1:'SHA-1',SHA256:'SHA-256',SHA512:'SHA-512'}[t.algorithm];
  const k=await crypto.subtle.importKey('raw', base32Decode(t.secret), {name:'HMAC',hash}, false, ['sign']);
  const msg=new Uint8Array(8), dv=new DataView(msg.buffer); dv.setUint32(0,Math.floor(counter/4294967296)); dv.setUint32(4,counter>>>0);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',k,msg));
  const off=sig[sig.length-1]&0xf;
  const bin=((sig[off]&0x7f)<<24)|(sig[off+1]<<16)|(sig[off+2]<<8)|sig[off+3];
  return String(bin%Math.pow(10,t.digits)).padStart(t.digits,'0');
}
function totpRemaining(t, forTime){ const s=Math.floor((forTime==null?Date.now():forTime)/1000); return t.period-(s%t.period); }

/* ---------- Generator ---------- */
const SETS={upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower:'abcdefghijklmnopqrstuvwxyz', digits:'0123456789', symbols:'!@#$%&*()-_=+[]{}:,.?'};
const AMBIG=/[l1IO0]/g;
function genChars(len, opts){
  len=Math.min(64,Math.max(8,len|0)); const groups=[]; let pool='';
  for(const k of ['upper','lower','digits','symbols']) if(opts[k]){ let s=SETS[k]; if(opts.noamb) s=s.replace(AMBIG,''); pool+=s; groups.push(s); }
  if(!pool) return {pw:'', bits:0};
  for(let tries=0;tries<100;tries++){ let out=''; for(let i=0;i<len;i++) out+=pool[randInt(pool.length)];
    if(groups.every(g=>Array.from(out).some(c=>g.includes(c)))) return {pw:out, bits:genCharsBits(len,groups.map(g=>g.length))}; }
  return {pw:'', bits:0};
}
// Entropie des Zeichen-Modus: len·log2(pool) abzüglich der Verwerfungen (jede gewählte Gruppe muss vorkommen) —
// P(akzeptiert) per Inklusion-Exklusion über die Gruppen; bei 8 Zeichen/4 Gruppen ≈ 1 Bit, ab 16 Zeichen < 0,25 Bit.
function genCharsBits(len, sizes){ const pool=sizes.reduce((a,b)=>a+b,0); let pAcc=0;
  for(let mask=0;mask<(1<<sizes.length);mask++){ let excl=0, bits=0; for(let i=0;i<sizes.length;i++) if(mask&(1<<i)){ excl+=sizes[i]; bits++; } pAcc+=(bits%2?-1:1)*Math.pow((pool-excl)/pool,len); }
  return pAcc>0?Math.max(0,Math.round(len*Math.log2(pool)+Math.log2(pAcc))):0; }
function genWords(n, sep, cap, num){
  const W=globalThis.EFF_WORDS; if(!Array.isArray(W)||W.length!==7776) return {pw:'', bits:0};
  n=Math.min(10,Math.max(4,n|0)); const words=[];
  for(let i=0;i<n;i++){ let w=W[randInt(7776)]; if(cap) w=w[0].toUpperCase()+w.slice(1); words.push(w); }
  let bits=n*Math.log2(7776);
  if(num){ const pos=randInt(n); words[pos]+=String(randInt(10)); bits+=Math.log2(10*n); }
  return {pw:words.join(sep==null?'-':sep), bits:Math.round(bits)};
}
function passStrength(p){ const words=p.trim().split(/[\s\-_.,;]+/).filter(w=>w.length>=3).length, len=p.length; if(len<12) return 0; if(len>=24||(len>=18&&words>=4)) return 3; if(len>=16||words>=3) return 2; return 1; }

/* ---------- CSV (RFC 4180) + Import-Mapping ---------- */
function parseCsv(text, delim){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  delim=delim||','; const rows=[]; let row=[], field='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ field+='"'; i++; } else q=false; } else field+=c; }
    else if(c==='"'&&field===''){ q=true; }               // Anführungszeichen nur am Feldanfang öffnen, mitten im Feld literal
    else if(c===delim){ row.push(field); field=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(field); field=''; rows.push(row); row=[]; }
    else field+=c; }
  if(field!==''||row.length){ row.push(field); rows.push(row); }
  return rows.filter(r=>!(r.length===1&&r[0].trim()===''));
}
function csvMap(header){
  const h=header.map(x=>String(x).trim().toLowerCase()); const idx=n=>h.indexOf(n), has=n=>idx(n)>=0;
  if(has('login_username')&&has('login_password')) return {fmt:'bitwarden', title:idx('name'), user:idx('login_username'), pass:idx('login_password'), url:idx('login_uri'), notes:idx('notes'), totp:idx('login_totp'), type:idx('type'), fav:idx('favorite'), cat:idx('folder')};
  if(has('type')&&has('name')&&has('password')&&(has('email')||has('username'))) return {fmt:'proton', title:idx('name'), user:idx('username'), email:idx('email'), pass:idx('password'), url:idx('url'), notes:idx('note'), totp:idx('totp'), type:idx('type'), created:idx('createtime'), updated:idx('modifytime'), cat:idx('vault')};
  if(has('title')&&has('password')&&has('username')) return {fmt:'keepassxc', title:idx('title'), user:idx('username'), pass:idx('password'), url:idx('url'), notes:idx('notes'), totp:idx('totp'), cat:idx('group'), created:idx('created'), updated:idx('last modified')};
  const find=(...names)=>{ for(const n of names){ const i=idx(n); if(i>=0) return i; } return -1; };
  const m={fmt:'generic', title:find('title','name','account','site','titel','bezeichnung','konto'), user:find('username','user','login','email','login_name','benutzername','benutzer','anmeldename','e-mail'), pass:find('password','pass','login_password','passwort','kennwort'), url:find('url','website','uri','web site','login_uri','webseite','adresse'), notes:find('notes','note','comment','extra','notizen','notiz','kommentar'), totp:find('totp','otp','otpauth','login_totp','2fa')};
  if(m.title<0&&m.url>=0) m.title=m.url;                    // ohne Titelspalte dient die URL als Titel
  return (m.title>=0&&m.pass>=0)?m:null;
}
function csvDate(s, now){ s=String(s||'').trim(); if(!s) return new Date(now).toISOString(); if(/^\d{9,11}$/.test(s)) return new Date(Number(s)*1000).toISOString(); if(/^\d{12,14}$/.test(s)) return new Date(Number(s)).toISOString(); const t=Date.parse(s); return Number.isFinite(t)?new Date(t).toISOString():new Date(now).toISOString(); }
// Zeile → sanitisierter Eintrag (neue ID) oder null (Typ nicht übernommen / unbrauchbar)
function csvRowToEntry(m, row, now, stats){
  const g=i=>(i>=0&&i<row.length)?String(row[i]):'';
  let type='login';
  if(m.type>=0){ const t=g(m.type).trim().toLowerCase();
    if(m.fmt==='bitwarden'&&t!=='login'&&t!=='note') return null;
    if(m.fmt==='proton'&&!['login','note','alias'].includes(t)) return null;
    if(t==='note') type='note'; }
  let user=g(m.user), notes=g(m.notes), email='';
  if(m.fmt==='proton'){ const em=g(m.email); if(!user) user=em; else if(em&&em!==user) email=em; }   // zweite Adresse → eigenes E-Mail-Feld (v1.4), nicht mehr in die Notizen
  // Ordner/Gruppe/Tresor der Quelle → Kategorie (KeePassXC: Pfad „Root/Sub“ → letztes Segment; „Root“ allein = keine)
  let cat=m.cat>=0?g(m.cat).trim():''; if(m.fmt==='keepassxc'){ const seg=cat.split('/').filter(Boolean); cat=seg.length&&seg[seg.length-1]!=='Root'?seg[seg.length-1]:''; }
  const title=g(m.title).trim()||g(m.url).trim()||user.trim();
  if(!title) return null;
  if(stats&&notes.length>CAPS.notes) stats.truncated++;                 // Kürzung wird gemeldet, nie still
  const created=csvDate(m.created>=0?g(m.created):'', now), updated=csvDate(m.updated>=0?g(m.updated):'', now);
  return sanitizeEntry({id:cryptoId(), type, cat, title, user, email, pass:g(m.pass), url:g(m.url), notes, totp:g(m.totp)||null,
    fav:m.fav>=0&&g(m.fav).trim()==='1', created, updated, deleted:null}, now);
}
/* ---------- Proton-Pass-Export (JSON aus ZIP / PGP) → Einträge ----------
   Struktur (Proton WebClients, packages/pass/lib/export): {version, userId?, vaults:{shareId:{name, items:[...]}}}.
   Item: {data:{type, metadata:{name,note}, content:{...}, extraFields:[{fieldName,type,data}]}, state (2 = Papierkorb),
   aliasEmail, createTime/modifyTime (Unix-Sekunden), pinned}. Nur Strings werden übernommen, alles läuft durch sanitizeEntry. */
function concatBytes(list){ let n=0; for(const b of list) n+=b.length; const out=new Uint8Array(n); let p=0; for(const b of list){ out.set(b,p); p+=b.length; } return out; }
function pStr(v){ return typeof v==='string'?v:''; }
function protonTime(v, now){ return (typeof v==='number'&&Number.isFinite(v)&&v>0&&v<4102444800)?new Date(v*1000).toISOString():new Date(now).toISOString(); }
function protonFieldLines(list){ // extraFields / sectionFields → "Name: Wert"-Zeilen (Text, Hidden, TOTP-URI, Zeitstempel)
  if(!Array.isArray(list)) return []; const out=[];
  for(const f of list){ if(!f||typeof f!=='object') continue; const name=pStr(f.fieldName).trim(); const d=f.data&&typeof f.data==='object'?f.data:f;
    let val=''; if(f.type==='totp') val=pStr(d.totpUri); else if(f.type==='timestamp') val=d.timestamp!=null&&typeof d.timestamp!=='object'?String(d.timestamp):''; else val=pStr(d.content);
    if(name||val) out.push((name?name+': ':'')+val); }
  return out;
}
function protonSectionLines(sections){ if(!Array.isArray(sections)) return []; const out=[]; for(const s of sections){ if(!s||typeof s!=='object') continue; const name=pStr(s.sectionName).trim(); if(name) out.push('['+name+']'); out.push(...protonFieldLines(s.sectionFields)); } return out; }
function protonItemToEntry(item, vaultName, now, stats){
  if(!item||typeof item!=='object'||item.state===2) return null;                     // Papierkorb nicht übernehmen
  const d=item.data&&typeof item.data==='object'?item.data:null; if(!d) return null;
  const md=d.metadata&&typeof d.metadata==='object'?d.metadata:{}, c=d.content&&typeof d.content==='object'?d.content:{};
  const t=pStr(d.type)||'login'; const title=pStr(md.name).trim(); if(!title) return null;
  const lines=[]; const note=pStr(md.note);                            // Freitext kommt ZULETZT — bei Kürzung bleiben die Geheimnisse
  const ent={id:cryptoId(), type:'login', cat:pStr(vaultName).trim(), title, user:'', email:'', pass:'', url:'', notes:'', totp:null, card:null, bank:null, extra:[], nowarn:false,
             fav:item.pinned===true, created:protonTime(item.createTime,now), updated:protonTime(item.modifyTime,now), deleted:null};
  const extra=Array.isArray(d.extraFields)?d.extraFields:[];
  if(t==='login'){
    const email=pStr(c.itemEmail).trim(), user=pStr(c.itemUsername).trim(); ent.user=user||email; if(user&&email&&email!==user) ent.email=email;   // beide vorhanden → eigenes Feld (v1.4)
    ent.pass=pStr(c.password); const urls=(Array.isArray(c.urls)?c.urls:[]).filter(u=>typeof u==='string'&&u.trim()); ent.url=urls.length?urls[0].trim():'';
    for(const u of urls.slice(1)) lines.push('URL: '+u.trim());
    ent.totp=pStr(c.totpUri).trim()||null;
    if(!ent.totp){ const tf=extra.find(f=>f&&f.type==='totp'&&f.data&&pStr(f.data.totpUri)); if(tf) ent.totp=tf.data.totpUri; }
  }
  else if(t==='alias'){ ent.user=pStr(item.aliasEmail).trim(); lines.push('Alias (Proton)'); }
  else if(t==='note'){ ent.type='note'; }
  else if(t==='creditCard'){ ent.type='card'; ent.card={holder:pStr(c.cardholderName), number:pStr(c.number), expiry:pStr(c.expirationDate), cvv:pStr(c.verificationNumber), pin:pStr(c.pin)}; }
  else if(t==='wifi'){ ent.user=pStr(c.ssid); ent.pass=pStr(c.password); lines.push('WLAN'); lines.push(...protonSectionLines(c.sections)); }
  else if(t==='sshKey'){ ent.type='note'; if(pStr(c.publicKey)) lines.push('Public key: '+c.publicKey); if(pStr(c.privateKey)) lines.push('Private key:\n'+c.privateKey); lines.push(...protonSectionLines(c.sections)); }
  else if(t==='identity'){ ent.type='note'; for(const k of Object.keys(c)){ const v=c[k]; if(typeof v==='string'&&v.trim()) lines.push(k+': '+v.trim()); else if(Array.isArray(v)&&k!=='extraSections') lines.push(...protonFieldLines(v)); } lines.push(...protonSectionLines(c.extraSections)); }
  else { ent.type='note'; lines.push(...protonSectionLines(c.sections)); }   // custom + unbekannte Typen → Notiz
  // Versteckte Zusatzfelder (Proton „Hidden“) werden zu geheimen Zusatzfeldern (max. EXTRA_MAX, Rest wie bisher in die Notizen); Text/TOTP/Datum bleiben Notizzeilen
  const rest=[]; for(const f of extra){ const fd=f&&typeof f==='object'&&f.data&&typeof f.data==='object'?f.data:f; const hid=f&&f.type==='hidden'&&line(pStr(f.fieldName),CAPS.xname)&&pStr(fd&&fd.content);
    if(hid&&ent.extra.length<EXTRA_MAX) ent.extra.push({name:f.fieldName, value:fd.content}); else { if(hid&&stats) stats.hiddenOver++; rest.push(f); } }   // über dem Deckel → Notizen, gezählt und gemeldet (Audit run-4 #1)
  lines.push(...protonFieldLines(rest)); if(note) lines.push(note);
  ent.notes=lines.join('\n');
  if(stats&&ent.notes.length>CAPS.notes) stats.truncated++;             // Kürzung wird gemeldet, nie still
  return sanitizeEntry(ent, now);
}
// Gesamter Export → {entries, skipped, vaults}; wirft 'format' (keine Proton-Struktur) oder 'toomany'
function protonExportToEntries(obj, now){
  if(!obj||typeof obj!=='object'||!obj.vaults||typeof obj.vaults!=='object'||Array.isArray(obj.vaults)) throw new Error('format');
  now=now||Date.now(); const entries=[]; let skipped=0, vaults=0, total=0; const stats={truncated:0, hiddenOver:0};
  for(const key of Object.keys(obj.vaults)){ const v=obj.vaults[key]; if(!v||typeof v!=='object'||!Array.isArray(v.items)) continue; vaults++;
    total+=v.items.length; if(total>MAX_ENTRIES) throw new Error('toomany');
    for(const it of v.items){ const e=protonItemToEntry(it, v.name, now, stats); if(e) entries.push(e); else skipped++; } }
  if(!vaults) throw new Error('format');
  return {entries, skipped, vaults, truncated:stats.truncated, hiddenOver:stats.hiddenOver};
}

/* ---------- ZIP-Leser (nur Stored + Deflate, kein ZIP64) ---------- */
// Streamend mit Abbruch: die Ausgabegröße wird WÄHREND des Entpackens begrenzt (Deflate-Bombe → 'toolarge' bei ~0 zusätzlichem Speicher)
async function inflate(bytes, format){
  const ds=new DecompressionStream(format); const w=ds.writable.getWriter(); w.write(bytes).catch(()=>{}); w.close().catch(()=>{});
  const r=ds.readable.getReader(); const parts=[]; let n=0;
  for(;;){ const {value,done}=await r.read(); if(done) break; n+=value.length; if(n>MAX_FILE_BYTES){ await r.cancel().catch(()=>{}); throw new Error('toolarge'); } parts.push(value); }
  return concatBytes(parts);
}
function zipEntries(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength), n=u8.length; let eocd=-1;
  for(let i=n-22;i>=0&&i>=n-22-65535;i--){ if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error('zip');
  const count=dv.getUint16(eocd+10,true), cdOff=dv.getUint32(eocd+16,true); if(count===0xffff||cdOff===0xffffffff) throw new Error('zip64');
  const out=[]; let p=cdOff;
  for(let i=0;i<count;i++){ if(p+46>n||dv.getUint32(p,true)!==0x02014b50) throw new Error('zip');
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), usize=dv.getUint32(p+24,true), nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    if(csize===0xffffffff||usize===0xffffffff||off===0xffffffff) throw new Error('zip64');
    out.push({name:dec.decode(u8.subarray(p+46,p+46+nl)), method, csize, usize, off}); p+=46+nl+el+cl; }
  return out;
}
async function zipRead(u8, ent){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength); const p=ent.off; if(p+30>u8.length||dv.getUint32(p,true)!==0x04034b50) throw new Error('zip');
  const start=p+30+dv.getUint16(p+26,true)+dv.getUint16(p+28,true); if(start+ent.csize>u8.length) throw new Error('zip');
  const data=u8.subarray(start,start+ent.csize);
  if(ent.method===0) return data;
  if(ent.method===8){ const out=await inflate(data,'deflate-raw'); if(out.length!==ent.usize) throw new Error('zip'); return out; }
  throw new Error('zip');
}

/* ---------- OpenPGP, symmetrisch (RFC 4880): SKESK v4 + SEIPD v1 mit MDC, wie Protons Export ----------
   Bewusst minimal: kein Public-Key, kein AEAD/v6 (→ 'pgpAlgo'), falsche Passphrase → 'pgpPass', Struktur → 'pgp'.
   AES läuft in WebCrypto (Schlüssel nicht extrahierbar); CFB wird aus AES-CTR-Einzelblöcken gebaut (E_K(x) = CTR mit counter x auf Nullblock). */
function crc24(b){ let c=0xB704CE; for(let i=0;i<b.length;i++){ c^=b[i]<<16; for(let k=0;k<8;k++){ c<<=1; if(c&0x1000000) c^=0x1864CFB; } } return c&0xFFFFFF; }
function pgpDearmor(text){
  const m=/-----BEGIN PGP MESSAGE-----\r?\n([\s\S]*?)-----END PGP MESSAGE-----/.exec(text); if(!m) throw new Error('pgp');
  const lines=m[1].split(/\r?\n/); let i=0;
  if(lines.length&&/^[A-Za-z-]+:\s/.test(lines[0])){ while(i<lines.length&&lines[i].trim()!=='') i++; }   // Armor-Header (Version:, Comment:) bis Leerzeile
  let b64='', crc=null; for(;i<lines.length;i++){ const l=lines[i].trim(); if(!l) continue; if(l[0]==='='){ crc=l.slice(1); continue; } b64+=l; }
  const bytes=b64Bytes(b64); if(!bytes||!bytes.length) throw new Error('pgp');
  if(crc!==null){ const w=b64Bytes(crc); if(!w||w.length!==3||crc24(bytes)!==((w[0]<<16)|(w[1]<<8)|w[2])) throw new Error('pgp'); }
  return bytes;
}
function pgpPackets(u8){ // alte + neue Paketköpfe, Partial-Body-Längen, „unbestimmte“ Länge (Rest)
  const out=[]; let p=0; const n=u8.length, u32=q=>u8[q]*16777216+(u8[q+1]<<16)+(u8[q+2]<<8)+u8[q+3];
  while(p<n){ const ctb=u8[p++]; if(!(ctb&0x80)) throw new Error('pgp'); let tag; const chunks=[];
    if(ctb&0x40){ tag=ctb&0x3f;
      for(;;){ if(p>=n) throw new Error('pgp'); const b=u8[p++]; let len, partial=false;
        if(b<192) len=b; else if(b<224){ if(p>=n) throw new Error('pgp'); len=((b-192)<<8)+u8[p++]+192; } else if(b===255){ if(p+4>n) throw new Error('pgp'); len=u32(p); p+=4; } else { len=1<<(b&0x1f); partial=true; }
        // Partial-Body: erste Teillänge ≥ 512 (RFC 4880 4.2.2.4) und höchstens 4096 Teilstücke je Paket — sonst erzeugt ein 20-KB-ZIP
        // Millionen 1-Byte-Ansichten und lässt die WebView mit Speichermangel abstürzen (Audit run-3 #4)
        if(partial&&!chunks.length&&len<512) throw new Error('pgp'); if(chunks.length>=4096) throw new Error('pgp');
        if(p+len>n) throw new Error('pgp'); chunks.push(u8.subarray(p,p+len)); p+=len; if(!partial) break; } }
    else { tag=(ctb>>2)&0x0f; const lt=ctb&3; let len;
      if(lt===0){ if(p>=n) throw new Error('pgp'); len=u8[p++]; } else if(lt===1){ if(p+2>n) throw new Error('pgp'); len=(u8[p]<<8)|u8[p+1]; p+=2; } else if(lt===2){ if(p+4>n) throw new Error('pgp'); len=u32(p); p+=4; } else len=n-p;
      if(p+len>n) throw new Error('pgp'); chunks.push(u8.subarray(p,p+len)); p+=len; }
    out.push({tag, body:chunks.length===1?chunks[0]:concatBytes(chunks)}); if(out.length>64) throw new Error('pgp'); }
  return out;
}
const PGP_HASH={1:['MD5',0],2:['SHA-1',20],8:['SHA-256',32],9:['SHA-384',48],10:['SHA-512',64]};   // kein SHA-224 (11): WebCrypto kennt es nicht → würde als Formatfehler statt 'pgpAlgo' enden (Audit run-3)
const PGP_KEYLEN={7:16,8:24,9:32};
const MAX_SKESK=4;
// S2K (simple/salted/iterated) → Schlüssel der Länge keyLen; mehrere Kontexte mit Null-Präfix, falls der Hash kürzer ist
async function pgpS2K(pass, spec, keyLen){
  const h=PGP_HASH[spec.hash]; if(!h||!h[1]) throw new Error('pgpAlgo');
  const unit=spec.type===0?pass:concatBytes([spec.salt,pass]); const count=spec.type===3?Math.max(spec.count,unit.length):unit.length;
  const parts=[]; for(let ctx=0;parts.reduce((n,x)=>n+x.length,0)<keyLen;ctx++){
    const buf=new Uint8Array(ctx+count); for(let i=0;i<count;i+=unit.length) buf.set(unit.subarray(0,Math.min(unit.length,count-i)), ctx+i);
    parts.push(new Uint8Array(await crypto.subtle.digest(h[0], buf))); buf.fill(0); }
  const key=concatBytes(parts).slice(0,keyLen); parts.forEach(x=>x.fill(0)); return key;
}
/* AES-Blockchiffre (nur Verschlüsselungsrichtung, FIPS-197) für den OpenPGP-CFB-Keystream. Bewusst eigener Code:
   WebCrypto kennt weder ECB noch CFB, und ein AES-CTR-Aufruf je 16-Byte-Block kostete ~900 MB und 5 s je 20 MB.
   Nur für Import-Schlüssel (S2K/Session-Key, kurzlebig, danach genullt) — nie für den Tresor-DEK. Test: FIPS-Vektoren + WebCrypto-Abgleich. */
const AES_SBOX=Uint8Array.from(('637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b27509832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16').match(/../g),h=>parseInt(h,16));
const AES_XT=new Uint8Array(256); for(let i=0;i<256;i++) AES_XT[i]=((i<<1)^((i&0x80)?0x1b:0))&0xff;
function aesExpand(key){ if(!(key instanceof Uint8Array)||![16,24,32].includes(key.length)) throw new Error('pgp'); const Nk=key.length>>2, Nr=Nk+6, w=new Uint8Array(16*(Nr+1)); w.set(key); let rcon=1;
  for(let i=Nk;i<4*(Nr+1);i++){ let t0=w[4*i-4],t1=w[4*i-3],t2=w[4*i-2],t3=w[4*i-1];
    if(i%Nk===0){ const u=t0; t0=AES_SBOX[t1]^rcon; t1=AES_SBOX[t2]; t2=AES_SBOX[t3]; t3=AES_SBOX[u]; rcon=AES_XT[rcon]; }
    else if(Nk>6&&i%Nk===4){ t0=AES_SBOX[t0]; t1=AES_SBOX[t1]; t2=AES_SBOX[t2]; t3=AES_SBOX[t3]; }
    const b=4*(i-Nk); w[4*i]=w[b]^t0; w[4*i+1]=w[b+1]^t1; w[4*i+2]=w[b+2]^t2; w[4*i+3]=w[b+3]^t3; }
  return {w, Nr}; }
function aesEncryptBlock(ks, inp, inOff, out, outOff){ const w=ks.w, s=new Uint8Array(16), t=new Uint8Array(16);
  for(let i=0;i<16;i++) s[i]=inp[inOff+i]^w[i];
  for(let r=1;r<=ks.Nr;r++){
    for(let c=0;c<4;c++) for(let row=0;row<4;row++) t[row+4*c]=AES_SBOX[s[row+4*((c+row)&3)]];   // SubBytes + ShiftRows
    if(r<ks.Nr){ for(let c=0;c<4;c++){ const a0=t[4*c],a1=t[4*c+1],a2=t[4*c+2],a3=t[4*c+3], x=a0^a1^a2^a3;   // MixColumns
      t[4*c]=a0^x^AES_XT[a0^a1]; t[4*c+1]=a1^x^AES_XT[a1^a2]; t[4*c+2]=a2^x^AES_XT[a2^a3]; t[4*c+3]=a3^x^AES_XT[a3^a0]; } }
    for(let i=0;i<16;i++) s[i]=t[i]^w[16*r+i]; }
  for(let i=0;i<16;i++) out[outOff+i]=s[i]; }
// OpenPGP-CFB (IV = Nullblock, kein Resync — gilt für ESK und SEIPD v1): Klartext = Chiffrat XOR E_K(vorheriger Chiffratblock)
function pgpCfbDecrypt(keyBytes, ct){ const ks=aesExpand(keyBytes); const n=ct.length, pt=new Uint8Array(n), buf=new Uint8Array(16); let prev=new Uint8Array(16);
  for(let i=0;i<n;i+=16){ aesEncryptBlock(ks, prev,0, buf,0); const m=Math.min(16,n-i); for(let j=0;j<m;j++) pt[i+j]=ct[i+j]^buf[j]; if(m===16) prev=ct.subarray(i,i+16); }
  ks.w.fill(0); buf.fill(0); return pt; }
function pgpParseSkesk(body){
  if(body.length<4||body[0]!==4) throw new Error('pgpAlgo');                       // v5/v6 (AEAD) nicht unterstützt
  const cipher=body[1], type=body[2], hash=body[3]; let p=4; const spec={type, hash};
  if(type===1||type===3){ if(body.length<p+8) throw new Error('pgp'); spec.salt=body.subarray(p,p+8); p+=8; }
  if(type===3){ if(body.length<p+1) throw new Error('pgp'); const c=body[p++]; spec.count=(16+(c&15))<<((c>>4)+6); }
  if(type!==0&&type!==1&&type!==3) throw new Error('pgpAlgo');                       // 4 = Argon2 (RFC 9580)
  if(!PGP_KEYLEN[cipher]) throw new Error('pgpAlgo');
  return {cipher, spec, esk:body.length>p?body.subarray(p):null};
}
async function pgpUnpackLiteral(u8, depth){
  for(const pk of pgpPackets(u8)){
    if(pk.tag===11){ const b=pk.body; if(b.length<6) throw new Error('pgp'); const fl=b[1]; if(b.length<6+fl) throw new Error('pgp'); return b.subarray(6+fl); }
    if(pk.tag===8){ if((depth||0)>2) throw new Error('pgp'); const a=pk.body[0], rest=pk.body.subarray(1); let plain;
      if(a===0) plain=rest; else if(a===1) plain=await inflate(rest,'deflate-raw'); else if(a===2) plain=await inflate(rest,'deflate'); else throw new Error('pgpAlgo');
      return pgpUnpackLiteral(plain,(depth||0)+1); }
    // Signaturen/One-Pass-Signaturen/MDC/Marker überspringen
  }
  throw new Error('pgp');
}
// Armierte oder binäre OpenPGP-Nachricht + Passphrase → Literal-Daten (Bytes). Fehler: 'pgp' | 'pgpAlgo' | 'pgpPass' | 'toolarge'
async function pgpDecryptSymmetric(data, passphrase){
  let u8=data; if(u8.length>MAX_FILE_BYTES) throw new Error('toolarge');
  if(u8[0]===0x2d) u8=pgpDearmor(dec.decode(u8));
  const pks=pgpPackets(u8); const skesks=pks.filter(p=>p.tag===3);
  if(pks.some(p=>p.tag===20||p.tag===1)) throw new Error('pgpAlgo');               // AEAD (v5) bzw. Public-Key-verschlüsselt
  const sed=pks.find(p=>p.tag===18); if(!sed||!skesks.length||pks.some(p=>p.tag===9)) throw new Error(pks.some(p=>p.tag===9)?'pgpAlgo':'pgp');
  if(sed.body.length<1+18+22||sed.body[0]!==1) throw new Error(sed.body.length&&sed.body[0]>1?'pgpAlgo':'pgp');
  if(skesks.length>MAX_SKESK) throw new Error('pgp');                               // Proton nutzt genau eine Passphrase; Verstärker abweisen
  const pass=passBytes(passphrase); const body=sed.body.subarray(1);
  try{ return await pgpTrySkesks(skesks, pass, body); } finally{ pass.fill(0); }      // Passphrase-Bytes auch auf dem Fehlerpfad nullen (Audit run-3)
}
async function pgpTrySkesks(skesks, pass, body){
  for(const sk of skesks){                                                             // mehrere Passphrasen möglich: jede probieren
    let parsed; try{ parsed=pgpParseSkesk(sk.body); }catch(e){ if(skesks.length===1) throw e; continue; }
    const raw=await pgpS2K(pass, parsed.spec, PGP_KEYLEN[parsed.cipher]);
    let sessionKey=raw, cipher=parsed.cipher;
    if(parsed.esk){ const dsk=pgpCfbDecrypt(raw, parsed.esk); raw.fill(0); cipher=dsk[0]; sessionKey=dsk.subarray(1); if(!PGP_KEYLEN[cipher]||sessionKey.length!==PGP_KEYLEN[cipher]){ dsk.fill(0); continue; } }
    // Quick-Check auf den ersten zwei Blöcken (Bytes 14/15 == 16/17) — erst danach der einzige Volltext-Durchlauf
    const head=pgpCfbDecrypt(sessionKey, body.subarray(0,32));
    if(head[14]!==head[16]||head[15]!==head[17]){ sessionKey.fill(0); continue; }
    const pt=pgpCfbDecrypt(sessionKey, body); sessionKey.fill(0); const n=pt.length;
    // Quick-Check bestanden, MDC-Kopf oder -Hash falsch: bei EINER Passphrase ist die Datei manipuliert (nicht „falsche Passphrase“, Audit run-3)
    if(pt[n-22]!==0xD3||pt[n-21]!==0x14){ if(skesks.length===1) throw new Error('pgpMdc'); continue; }
    const want=new Uint8Array(await crypto.subtle.digest('SHA-1', pt.subarray(0,n-20))); let diff=0; for(let i=0;i<20;i++) diff|=want[i]^pt[n-20+i];
    if(diff){ if(skesks.length===1) throw new Error('pgpMdc'); continue; }
    return pgpUnpackLiteral(pt.subarray(18,n-22));
  }
  throw new Error('pgpPass');
}

/* ---------- Proton-Export erkennen und laden ---------- */
// → {kind:'json'|'pgp', payload:Uint8Array}; ZIPs werden bis zu data.json / data.pgp aufgelöst. Fehler: 'format' | 'zip' | 'zip64' | 'toolarge'
async function protonProbe(u8){
  if(!(u8 instanceof Uint8Array)||!u8.length) throw new Error('format'); if(u8.length>MAX_FILE_BYTES) throw new Error('toolarge');
  if(u8[0]===0x50&&u8[1]===0x4b){ const ents=zipEntries(u8); const pick=suffix=>ents.find(e=>e.name.toLowerCase().endsWith(suffix)&&e.usize<=MAX_FILE_BYTES);
    const pgp=pick('data.pgp'), json=pick('data.json'); if(!pgp&&!json) throw new Error('format');
    return pgp?{kind:'pgp', payload:await zipRead(u8,pgp)}:{kind:'json', payload:await zipRead(u8,json)}; }
  if(u8[0]===0xEF&&u8[1]===0xBB&&u8[2]===0xBF) return {kind:'json', payload:u8};       // UTF-8-BOM → JSON
  if(u8[0]===0x2d||(u8[0]&0x80)) return {kind:'pgp', payload:u8};                   // Armor oder binäres Paket
  return {kind:'json', payload:u8};
}
async function protonLoad(probe, passphrase){
  const bytes=probe.kind==='pgp'?await pgpDecryptSymmetric(probe.payload, passphrase):probe.payload;
  if(bytes.length>MAX_FILE_BYTES) throw new Error('toolarge');
  let obj; try{ obj=JSON.parse(dec.decode(bytes)); }catch(_){ throw new Error('format'); }
  return obj;
}
/* === VAULT-FORMAT END === */

/* ============================================================
   App
   ============================================================ */
const App = (function(){
  let DEK=null, KDF=null, WRAP=null, VAULT=null;      // Sitzungszustand — auf lock() alles null
  let editId=null, currentId=null, genValue='', search='', catFilter=null, formType='login';
  // Generator-Einstellungen: EIN Zustand für Generator-Tab und Formular-Panel (v1.4); nur Sitzung, nie im Tresor. Controls tragen data-gen=<key>.
  const GEN_DEFAULT={mode:'chars',len:20,wc:6,upper:true,lower:true,digits:true,symbols:true,noamb:false,sep:'-',cap:false,num:false};
  let GEN=Object.assign({},GEN_DEFAULT);
  let totpTimer=null, lastCode='', clipTimer=null, clipOwnedAt=0, failCount=0, lockedUntil=0, pendingImport=null, kdfTouched=false;
  let pendingUnlock=null, pendingSecret=null, pendingOtpauth='', pendingProton=null;   // Aegis-Hürde / 2FA-Setup / Proton-Import

  const $ = id => document.getElementById(id);
  const show = id => $(id).classList.remove('hidden');
  const hide = id => $(id).classList.add('hidden');
  function screen(name){ ['setup','lock','totp','app'].forEach(s=>$('screen-'+s).classList.add('hidden')); $('screen-'+name).classList.remove('hidden'); }
  function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.add('hidden'),2600); }
  function err(id,msg){ const e=$(id); if(!msg){ e.classList.add('hidden'); e.textContent=''; return; } e.textContent=msg; e.classList.remove('hidden'); }
  function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
  const nowIso=()=>new Date().toISOString();
  const live=()=>VAULT?VAULT.entries.filter(e=>!e.deleted):[];
  const byId=id=>VAULT?VAULT.entries.find(e=>e.id===id&&!e.deleted):null;
  // Papierkorb: gelöscht, aber noch mit Inhalt. Gewipte Löschmarken gehören NICHT dazu — dort ist nichts wiederherzustellen.
  const trash=()=>VAULT?VAULT.entries.filter(e=>e.deleted&&!isWiped(e)).sort((a,b)=>ts(b.deleted)-ts(a.deleted)):[];
  const trashById=id=>VAULT?VAULT.entries.find(e=>e.id===id&&e.deleted&&!isWiped(e)):null;
  const fmtDate=iso=>{ const t=ts(iso); return t?new Date(t).toLocaleDateString(LANG==='de'?'de-DE':'en-GB'):'—'; };

  /* ---------- persistence ---------- */
  // Gesperrt während des await → dieser Blob gehört zu einer toten Sitzung. Aufrufer erkennen das an .locked
  // und überspringen ihren Rollback (VAULT ist längst null, ein Rollback schriebe nur einen toten Stand zurück).
  function lockedErr(){ const e=new Error('locked'); e.locked=true; return e; }
  // Rollback-Helfer für die Aufrufer: Snapshot zurückspielen, außer die Sitzung ist zwischendurch gesperrt worden.
  const rollback=snap=>e=>{ if(e&&e.locked) return; if(VAULT) VAULT.entries=snap; };
  async function persist(){
    const dek=DEK, kdf=KDF, wrap=WRAP, vault=VAULT;          // Schlüssel-Generation pinnen (lock/changePass während des await)
    if(!dek||!vault) throw lockedErr();
    const entries=purgeTombstones(wipeTrash(vault.entries));   // Wipe/Purge erst NACH erfolgreichem Schreiben committen
    const body=await encryptBody(Object.assign({},vault,{entries}), dek, kdf);
    // Nachprüfen: das Pinnen allein genügt nicht, der Stand kann während des await veraltet sein (Querfund Sachwert-Tresor v2.9.1).
    if(!DEK||VAULT!==vault) throw lockedErr();                 // zwischenzeitlich gesperrt → NICHT mehr schreiben
    if(DEK!==dek||KDF!==kdf||WRAP!==wrap) return persist();    // Passphrase gewechselt → mit dem neuen Schlüssel neu verschlüsseln,
                                                               // sonst überschriebe dieser alte Blob den frischen von changePass
    const s=serializeFile(kdf, wrap, body);
    try{ localStorage.setItem(LS_KEY, s); }
    catch(e){ toast(tr('err.saveFailed')); throw e; }
    if(VAULT===vault) vault.entries=entries;
  }
  function fileErrMsg(e){ const c=e&&e.message; return tr(c==='newer'?'err.fileNewer':c==='kdfbounds'?'err.fileBounds':c==='toolarge'?'err.fileLarge':c==='toomany'?'err.tooMany':'err.fileFormat'); }

  /* ---------- boot / setup / unlock / lock ---------- */
  function boot(){
    loadLockState(); dropQrFile(); syncCombos();   // Knopfbeschriftungen der Auswahlfelder aus den Selects setzen
    const raw=localStorage.getItem(LS_KEY);
    if(!raw){ screen('setup'); setTimeout(()=>$('setup-pass1').focus(),100); benchKdf(); bioDrop(true); }   // ohne Tresor kein Fingerabdruck-Slot
    else { screen('lock'); setTimeout(()=>$('lock-pass').focus(),100); bioProbe(bioAuto); }   // bioAuto wird erst von afterGate() wieder gesetzt (nach „Jetzt sperren“ kein Auto-Prompt bis zur nächsten Entsperrung, Audit run-3)
    const soft=document.documentElement.getAttribute('data-theme')==='soft';
    $('th-dark').classList.toggle('on',!soft); $('th-soft').classList.toggle('on',soft);
  }
  async function benchKdf(){
    if(benchKdf._done) return; benchKdf._done=true;
    $('setup-bench').textContent=tr('bench.run');
    await new Promise(r=>setTimeout(r,250));
    try{
      const t0=performance.now();
      await argon2Raw(passBytes('alien-pass-benchmark'), {m:KDF_DEFAULT.m,t:KDF_DEFAULT.t,p:KDF_DEFAULT.p,salt:rand(16)});
      const ms=Math.round(performance.now()-t0);
      let key='bench.done';
      if(!kdfTouched){ if(ms>2500){ $('setup-kdf').value='32768'; key='bench.light'; } else if(ms<400){ $('setup-kdf').value='131072'; key='bench.strong'; } syncCombo('setup-kdf'); }
      $('setup-bench').textContent=tr(key,{ms});
    }catch(_){ $('setup-bench').textContent=''; }
  }
  async function doSetup(){
    if(doSetup._busy) return; err('setup-err');
    const p1=$('setup-pass1').value, p2=$('setup-pass2').value;
    if(p1.length<12) return err('setup-err',tr('err.setupShort'));
    if(p1!==p2) return err('setup-err',tr('err.setupMismatch'));
    const btn=$('setup-btn'), orig=btn.textContent; doSetup._busy=true; btn.disabled=true; btn.textContent=tr('busy.creating');
    try{
      const m=parseInt($('setup-kdf').value,10);
      const kdf={m:[32768,65536,131072].includes(m)?m:KDF_DEFAULT.m, t:KDF_DEFAULT.t, p:KDF_DEFAULT.p, salt:rand(16)};
      const kek=await deriveKek(passBytes(p1), kdf);
      const dekX=await newDek(); const wrap=await wrapDek(dekX, kek, kdf);
      const dek=await unwrapDek(wrap, kek, kdf, false);            // Sitzungsschlüssel nicht extrahierbar
      DEK=dek; KDF=kdf; WRAP=wrap; VAULT=emptyVault();
      await persist();
    }catch(e){ DEK=KDF=WRAP=VAULT=null; return err('setup-err',tr('err.setupFailed')); }
    finally{ doSetup._busy=false; btn.disabled=false; btn.textContent=orig; }
    $('setup-pass1').value=$('setup-pass2').value=''; $('setup-meter').textContent='';
    enterApp(); toast(tr('toast.vaultCreated'));
  }
  async function doUnlock(){
    if(doUnlock._busy) return; err('lock-err');
    const now=Date.now(); if(now<lockedUntil) return err('lock-err',tr('err.wait',{s:Math.ceil((lockedUntil-now)/1000)}));
    const raw=localStorage.getItem(LS_KEY); if(!raw) return boot();
    let f; try{ f=parseFile(raw); }catch(e){ return err('lock-err',fileErrMsg(e)); }
    const btn=$('unlock-btn'), orig=btn.textContent; doUnlock._busy=true; btn.disabled=true; btn.textContent=tr('busy.decrypting'); renderBioGate();   // Fingerabdruck-Knopf solange aus
    const gen=bioGen;                                                                  // Generation: gewinnt zwischendurch der Fingerabdruck, verfällt dieses Ergebnis (Audit run-3 #1)
    try{
      const kek=await deriveKek(passBytes($('lock-pass').value), f.kdf);
      const dek=await unwrapDek(f.wrap, kek, f.kdf, false);
      const dekX=(bioNeedsRearm&&BIO&&bioMarker())?await unwrapDek(f.wrap, kek, f.kdf, true):null;   // nur zum Neu-Bewaffnen des Fingerabdruck-Slots nach Neustart
      const obj=await decryptBody(f.body, dek, f.kdf);
      const v=sanitizeVault(obj);                                     // auch lokal: Whitelist beim Unlock
      if(gen!==bioGen||DEK||pendingUnlock){ $('lock-pass').value=''; maskInputs('#screen-lock'); return; }   // eine andere Pforte hat die Sitzung schon geöffnet: nichts überschreiben
      if(v.totp){ pendingUnlock={dek, kdf:f.kdf, wrap:f.wrap, vault:v}; }   // Aegis-Hürde: Schlüssel erst nach Code-Prüfung in die Sitzung
      else { DEK=dek; KDF=f.kdf; WRAP=f.wrap; VAULT=v; failCount=0; lockedUntil=0; saveLockState(); }
      bioRearmDek=dekX;
    }catch(e){
      if(gen!==bioGen||DEK||pendingUnlock){ $('lock-pass').value=''; maskInputs('#screen-lock'); return; }   // verspäteter Fehlversuch darf keine offene Sitzung stören
      failCount++; if(failCount>=3) lockedUntil=Date.now()+Math.min(30,(failCount-2)*2)*1000; saveLockState();
      $('lock-pass').value=''; maskInputs('#screen-lock');                    // Fehlversuch: Eingabe nie stehen lassen (Audit run-2 #1)
      return err('lock-err', e&&e.message==='toomany'?tr('err.tooMany'):tr('err.wrongPass'));
    }finally{ doUnlock._busy=false; btn.disabled=false; btn.textContent=orig; renderBioGate(); }
    afterGate();
  }
  // Gemeinsamer Abschluss von Passphrase- und Fingerabdruck-Pfad: Eingaben leeren, Aegis-Wartestellung oder App
  function afterGate(){
    $('lock-pass').value=''; maskInputs('#screen-lock'); bioMsg(''); bioAuto=true; setBioHold(false);   // Passphrase eingegeben: Riegel gelöst
    if(pendingUnlock){ screen('totp'); $('totp-code').value=''; err('totp-err'); resetIdle(); setTimeout(()=>$('totp-code').focus(),100); return; }   // Idle-Sperre gilt auch in der Wartestellung
    enterApp();
  }
  async function doTotp(){
    if(doTotp._busy||!pendingUnlock) return; err('totp-err');
    const now=Date.now(); if(now<lockedUntil) return err('totp-err',tr('err.wait',{s:Math.ceil((lockedUntil-now)/1000)}));
    const code=$('totp-code').value.trim(); if(!/^\d{6,8}$/.test(code)) return err('totp-err',tr('err.totp6'));
    doTotp._busy=true;
    try{
      const p=pendingUnlock; if(!(await totpValid(p.vault.totp, code))){ failCount++; if(failCount>=3) lockedUntil=Date.now()+Math.min(30,(failCount-2)*2)*1000; saveLockState(); return err('totp-err',tr('err.totpSetupBad')); }
      if(pendingUnlock!==p) return;                                   // zwischendurch gesperrt
      DEK=p.dek; KDF=p.kdf; WRAP=p.wrap; VAULT=p.vault; pendingUnlock=null; failCount=0; lockedUntil=0; saveLockState();
    }finally{ doTotp._busy=false; $('totp-code').value=''; }
    enterApp();
  }
  function cancelTotp(){ clearIdle(); pendingUnlock=null; bioRearmDek=null; bioGen++; bioAuto=false; $('totp-code').value=''; err('totp-err'); boot(); }   // bioAuto=false: sonst Prompt-Schleife Fingerabdruck → Hürde → Abbruch → Fingerabdruck
  // Fehlversuchs-Bremse überlebt einen Neustart (außerhalb des verschlüsselten Tresors, enthält nichts Geheimes)
  const LOCK_KEY='ai-pass-lock';
  function saveLockState(){ try{ if(failCount>=3&&lockedUntil>Date.now()) localStorage.setItem(LOCK_KEY, JSON.stringify({f:failCount,u:lockedUntil})); else localStorage.removeItem(LOCK_KEY); }catch(_){} }
  function loadLockState(){ try{ const o=JSON.parse(localStorage.getItem(LOCK_KEY)||'null'); if(o&&Number.isInteger(o.f)&&Number.isFinite(o.u)&&o.u>Date.now()&&o.u<Date.now()+60000){ failCount=o.f; lockedUntil=o.u; } }catch(_){} }
  // Sperr-/Setup-/Import-Eingaben leeren und maskieren — beim Verstecken der App und nach jedem Fehlversuch
  function clearGateInputs(){ ['lock-pass','setup-pass1','setup-pass2','import-pass','proton-pass','totp-code','bio-pass','cp-cur','cp1','cp2'].forEach(id=>{ const n=$(id); if(n) n.value=''; }); maskInputs('#screen-lock'); maskInputs('#screen-setup'); maskInputs('#tab-settings'); err('lock-err'); }   // auch die Passphrase-Felder in den Einstellungen (Audit run-3)
  // data-showpass-Schalter innerhalb eines Bereichs zurücksetzen (Feld wieder type=password)
  function maskInputs(scope){ document.querySelectorAll((scope||'')+' input[data-showpass]').forEach(cb=>{ cb.checked=false; cb.dataset.showpass.split(',').forEach(id=>{ const f=$(id); if(f) f.type='password'; }); }); }
  // Code mit ±1 Zeitfenster prüfen (Uhrenabweichung)
  async function totpValid(t, code){ const now=Date.now(); for(const d of [-1,0,1]){ if(await totpCode(t, now+d*t.period*1000)===code) return true; } return false; }
  function enterApp(){ screen('app'); tab('list'); renderAll(); resetIdle();
    if(bioRearmDek){ const d=bioRearmDek; bioRearmDek=null; bioArm(d, KDF, WRAP.ct, true).then(ok=>{ if(ok) toast(tr('bio.rearmed')); renderSettings(); }); } }   // nach Neustart: Slot mit frischem Zufall neu bewaffnen
  function lock(){
    clearIdle(); stopTotp(); clearClip();
    DEK=null; KDF=null; WRAP=null; VAULT=null; editId=null; currentId=null; genValue=''; pendingImport=null; search=''; catFilter=null;
    pendingUnlock=null; pendingSecret=null; pendingOtpauth=''; pendingProton=null;
    bioGen++; bioRearmDek=null; bioArmed=false; bioNeedsRearm=false;   // laufende Fingerabdruck-Vorgänge verfallen (Generation)
    clearRendered(); boot();
  }
  // Nach dem Sperren darf nichts Entschlüsseltes im DOM oder in Formularfeldern bleiben
  function clearRendered(){
    ['entry-list','health','backup-hint','d-body','gen-out','gen-ent','f-meter','cp-meter','setup-meter','cat-chips','cat-menu','trash-list'].forEach(id=>{ const n=$(id); if(n) n.replaceChildren(); });
    ['d-title','d-meta','bk-msg','import-msg','csv-msg','proton-msg','about-line','totp-secret','trash-msg','trash-n'].forEach(id=>{ const n=$(id); if(n) n.textContent=''; });
    ['f-title','f-cat','f-user','f-email','f-pass','f-url','f-totp','f-notes','f-holder','f-number','f-expiry','f-cvv','f-pin','f-bholder','f-iban','f-bic','f-bank','f-bpin','search','import-pass','proton-pass','cp-cur','cp1','cp2','bio-pass','lock-pass','setup-pass1','setup-pass2','totp-code','totp-verify','vault-file','csv-file','proton-file'].forEach(id=>{ const n=$(id); if(n) n.value=''; });
    $('f-fav').checked=false; $('f-nowarn').checked=false; clearExtraRows(); fgClose(); genReset(); setEntryType('login'); err('add-err'); err('cp-err'); err('lock-err'); err('setup-err'); err('totp-err'); err('totp-setup-err'); err('bio-err'); bioMsg('');
    maskInputs(''); dropQrFile(); closeMenus();
    clearQrCanvas();
    hide('detail-overlay'); hide('help-overlay'); hide('import-pass-box'); hide('proton-pass-box'); hide('totp-setup');
    doImportVault._busy=false; const ib=$('import-btn'); if(ib){ ib.disabled=false; }
    doImportProton._busy=false; const pb=$('proton-btn'); if(pb){ pb.disabled=false; }
    tab('list');   // sonst stünde nach dem Entsperren die (leere) Papierkorb-Ansicht offen
  }

  /* ---------- Auto-Lock: Idle + Hintergrund (unabhängig voneinander) ---------- */
  let idleTimer=null, lastActivity=0, hiddenAt=0;
  const settings=()=>VAULT?VAULT.settings:(pendingUnlock?pendingUnlock.vault.settings:SETTINGS_DEFAULT);
  function clearIdle(){ if(idleTimer){ clearTimeout(idleTimer); idleTimer=null; } }
  function resetIdle(){ clearIdle(); if(!DEK&&!pendingUnlock) return; const mins=settings().autolock; if(!mins) return; idleTimer=setTimeout(()=>{ clearIdle(); lock(); toast(tr('toast.autolocked')); }, mins*60000); }
  function activity(){ if(!DEK&&!pendingUnlock) return; const n=Date.now(); if(n-lastActivity<5000) return; lastActivity=n; resetIdle(); }
  ['click','keydown','touchstart','scroll','mousemove'].forEach(ev=>document.addEventListener(ev, activity, {passive:true}));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ hiddenAt=Date.now(); clearGateInputs(); if((DEK||pendingUnlock)&&settings().bgLock===0){ lock(); } return; }   // immer: getippte Passphrasen (auch in den Einstellungen) nie stehen lassen   // gesperrt: keine getippte Passphrase stehen lassen
    const away=hiddenAt?Date.now()-hiddenAt:0; hiddenAt=0;
    if(clipOwnedAt&&(clipDue||(settings().clipClear>0&&Date.now()-clipOwnedAt>=settings().clipClear*1000))) clearClip();
    dropQrFile();
    if(!DEK&&!pendingUnlock){ if(bioArmed&&bioAuto&&!$('screen-lock').classList.contains('hidden')) doBio(); return; }   // zurück auf dem Sperrbildschirm: Fingerabdruck anbieten
    // die Hürde-Wartestellung hält entschlüsselte Daten → gleiche Sperrregeln
    const s=settings();
    if((s.bgLock>0&&away>s.bgLock*1000)||(s.autolock>0&&away>s.autolock*60000)){ lock(); toast(tr('toast.autolocked')); }
    else resetIdle();
  });

  /* ---------- Zwischenablage (synchron im Klick-Handler aufrufen!) ---------- */
  function fallbackCopy(text){ let ta=null; try{ ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); return document.execCommand('copy'); }catch(_){ return false; } finally{ if(ta){ ta.value=''; ta.remove(); } } }
  let clipDue=false, clipTries=0;   // Löschen war fällig, konnte aber (Hintergrund/kein Fokus) noch nicht ausgeführt werden
  const CLIP_MAX_TRIES=600;          // ~10 min Wiederholung im Vordergrund, dann aufgeben (Android leert spätestens nach 1 h selbst)
  function armClip(){ if(clipTimer){ clearTimeout(clipTimer); clipTimer=null; } clipOwnedAt=Date.now(); clipDue=false; clipTries=0; const s=settings().clipClear; if(s>0) clipTimer=setTimeout(clearClip, s*1000); }
  // Besitz erst aufgeben, wenn der Write bestätigt ist. Chromium lehnt writeText ohne Fokus ab (Document is not focused),
  // Android blockt Hintergrund-Writes → dann nur vormerken und beim Zurückkehren / nächsten Tick erneut versuchen.
  function clearClip(){
    if(clipTimer){ clearTimeout(clipTimer); clipTimer=null; }
    if(!clipOwnedAt) return; clipDue=true;
    const bg=document.hidden||(typeof document.hasFocus==='function'&&!document.hasFocus());
    if(bg&&!SC){ clipTimer=setTimeout(clearClip,1000); return; }     // Web-API braucht Fokus → vertagen; nativ (Android) darf ohne Fokus schreiben
    if(!bg&&++clipTries>CLIP_MAX_TRIES){ clipOwnedAt=0; clipDue=false; return; }   // Versuche nur im Vordergrund zählen (Audit run-1 #2)
    const ok=()=>{ clipOwnedAt=0; clipDue=false; clipTries=0; };
    const retry=()=>{ if(!bg&&fallbackCopy(' ')) ok(); else clipTimer=setTimeout(clearClip,1000); };
    let p=null; try{ p=SC?SC.clear():(navigator.clipboard&&navigator.clipboard.writeText(' ')); }catch(_){ p=null; }
    if(p&&p.then) p.then(ok,retry); else retry();
  }
  function copyText(text, whatKey){
    if(!text) return toast(tr('copy.empty'));
    const what=tr(whatKey), s=settings().clipClear;
    const done=()=>{ if(!DEK){ clipOwnedAt=Date.now(); clearClip(); return; } armClip(); toast(s>0?tr('copy.done',{what,s}):tr('copy.doneNoClear',{what})); };
    const web=()=>{ let p=null; try{ p=navigator.clipboard&&navigator.clipboard.writeText(text); }catch(_){ p=null; }
      if(p&&p.then) p.then(done).catch(()=>{ fallbackCopy(text)?done():toast(tr('copy.manual')); });
      else fallbackCopy(text)?done():toast(tr('copy.manual')); };
    // Nativ (Android): als „sensibel“ markiert → keine System-Vorschau des Inhalts (API 33+); Fallback Web-API
    if(SC){ let p=null; try{ p=SC.write({text}); }catch(_){ p=null; } if(p&&p.then){ p.then(done).catch(web); return; } }
    web();
  }

  /* ---------- tabs ---------- */
  const TAB_ACTIVE={trash:'list'};   // Ansichten ohne eigenen Tab-Knopf: welcher Knopf markiert bleibt
  function tab(name){
    if(name!=='add'&&editId){ editId=null; resetForm(); }   // sonst überschreibt „Neu“ später still den zuletzt bearbeiteten Eintrag
    const mark=TAB_ACTIVE[name]||name;
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===mark));
    document.querySelectorAll('.tabview').forEach(v=>v.classList.toggle('hidden',v.id!=='tab-'+name));
    if(name==='gen'&&!genValue) genNew();
    if(name==='trash') renderTrash();
    if(name==='list') renderList();
    if(name==='settings') renderSettings();
    if(name==='backup') renderBackupMsg();
  }

  /* ---------- Einträge: Liste, Gesundheit ---------- */
  function health(){
    // Kein Alters-Flag mehr (v1.3): ein starkes Zufallspasswort wird durch Alter nicht schwächer, Zwangsrotation ist Anti-Muster (NIST 800-63B, BSI 2020)
    const r=new Set(), w=new Set(), byPass=new Map();
    for(const e of live()){ if(e.type!=='login'||!e.pass) continue; if(!byPass.has(e.pass)) byPass.set(e.pass,[]); byPass.get(e.pass).push(e.id); if(e.pass.length<12&&!e.nowarn) w.add(e.id); }
    for(const ids of byPass.values()) if(ids.length>1) ids.forEach(id=>r.add(id));
    return {r,w};
  }
  const cats=()=>[...new Set(live().map(e=>e.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
  const maskNumber=n=>{ const d=(n||'').replace(/\s/g,''); return d?'•••• '+d.slice(-4):''; };
  /* ---------- Eigene Auswahl-/Vorschlagsfelder (v1.5) ----------
     Das native <select> bleibt als Wertspeicher im DOM (nur unsichtbar) — so gelten alle bestehenden Leseseiten
     weiter: $('fg-sep').value, genSync() über [data-gen], die data-change-Delegation, der Listener auf setup-kdf.
     Grund für den Umbau: die aufgeklappte System-Liste ist grau und nicht gestaltbar (option{background} ist alles,
     was CSS erreicht). Kategorienamen sind Nutzerdaten → ausschließlich textContent, nie innerHTML. */
  function closeMenus(){ document.querySelectorAll('.combo-menu').forEach(m=>{ m.classList.add('hidden'); m.replaceChildren(); }); }
  function comboOpt(label, action, arg, on, selId){ const b=el('button','combo-opt'+(on?' on':''),label); b.dataset.action=action; b.dataset.arg=arg; if(selId) b.dataset.sel=selId; return b; }
  // --- Auswahlfeld mit fester Optionsliste (sechs Stück) ---
  function syncCombo(id){ const sel=$(id), lab=$('cb-'+id); if(!sel||!lab) return; const o=sel.options[sel.selectedIndex]; lab.textContent=o?o.textContent:''; }
  function syncCombos(){ document.querySelectorAll('.combo-native').forEach(sel=>syncCombo(sel.id)); }
  function toggleCombo(id){ const menu=$('cm-'+id), sel=$(id); if(!menu||!sel) return;
    const wasOpen=!menu.classList.contains('hidden'); closeMenus(); if(wasOpen) return;
    for(const o of sel.options) menu.appendChild(comboOpt(o.textContent,'chooseOpt',o.value,o.value===sel.value,id));
    menu.classList.remove('hidden'); }
  function chooseOpt(value, elx){ const sel=$(elx&&elx.dataset.sel); closeMenus(); if(!sel) return;
    sel.value=value; syncCombo(sel.id);
    sel.dispatchEvent(new Event('change',{bubbles:true})); }   // die bestehende change-Delegation übernimmt von hier
  // --- Kategorie: freies Textfeld mit Vorschlägen ---
  function renderCatMenu(all){ const menu=$('cat-menu'), inp=$('f-cat'); if(!menu||!inp) return false;
    menu.replaceChildren(); const q=all?'':(inp.value||'').trim().toLowerCase();
    const items=cats().filter(c=>!q||c.toLowerCase().includes(q));
    if(!items.length){ menu.classList.add('hidden'); return false; }
    for(const c of items) menu.appendChild(comboOpt(c,'pickCat',c,c===inp.value.trim()));
    menu.classList.remove('hidden'); return true; }
  function openCatMenu(){ closeMenus(); renderCatMenu(); }
  function toggleCatMenu(){ const menu=$('cat-menu'); const wasOpen=menu&&!menu.classList.contains('hidden');
    closeMenus(); if(wasOpen) return;
    renderCatMenu(true); }   // der Pfeil zeigt ALLE Kategorien, ohne das Getippte zu verwerfen
  function catInput(){ if(!$('cat-menu')) return; renderCatMenu(); }
  function pickCat(v){ const inp=$('f-cat'); if(inp) inp.value=v; closeMenus(); }
  function renderChips(all){
    const box=$('cat-chips'); box.replaceChildren(); const cs=cats(); if(!cs.length){ catFilter=null; return; }
    const hasNone=all.some(e=>!e.cat);
    if(catFilter!==null&&(catFilter===''?!hasNone:!cs.includes(catFilter))) catFilter=null;   // Filter auf verschwundene Kategorie zurücksetzen
    const mk=(label,val)=>{ const b=el('button','chip'+((catFilter===val)?' on':''),label); if(val===null) b.dataset.action='clearCatFilter'; else { b.dataset.action='setCatFilter'; b.dataset.arg=val; } box.appendChild(b); };
    mk(tr('chip.all'),null); for(const c of cs) mk(c,c); if(hasNone) mk(tr('chip.none'),'');
  }
  function setCatFilter(v){ catFilter=typeof v==='string'?v:null; renderList(); }
  function clearCatFilter(){ catFilter=null; renderList(); }
  function renderList(){
    if(!VAULT) return;
    search=($('search').value||'').trim().toLowerCase();
    const list=$('entry-list'); list.replaceChildren();
    const all=live().sort((a,b)=>(b.fav-a.fav)||a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));
    renderChips(all); renderTrashBtn();
    let items=catFilter===null?all:all.filter(e=>e.cat===catFilter);
    if(search) items=items.filter(e=>(e.title+'\n'+e.user+'\n'+(e.email||'')+'\n'+e.url+'\n'+e.cat+'\n'+(e.extra||[]).map(x=>x.name).join('\n')).toLowerCase().includes(search));   // Zusatzfeld-Namen ja, Werte nie
    const h=health(); const hEl=$('health'); const bad=h.r.size+h.w.size;
    hEl.textContent=all.length?(bad?tr('health.bad',{r:h.r.size,w:h.w.size}):tr('health.ok')):''; hEl.classList.toggle('bad',bad>0);
    renderBackupHint();
    if(!items.length){ list.appendChild(el('div','empty',all.length?tr('list.noMatch'):tr('list.empty'))); return; }
    for(const e of items){
      const row=el('div','entry'); row.dataset.action='openDetail'; row.dataset.arg=e.id;
      row.appendChild(el('div','av',(e.title.trim()[0]||'?').toUpperCase()));
      const main=el('div','main'); main.appendChild(el('div','t',e.title));
      const sub=e.type==='card'?[e.card&&e.card.holder,e.card&&maskNumber(e.card.number)].filter(Boolean).join(' · '):e.type==='bank'?[e.bank&&e.bank.bank,e.bank&&maskNumber(e.bank.iban)].filter(Boolean).join(' · '):e.type==='note'?'':(e.user||e.email||e.url||'');
      main.appendChild(el('div','u',sub)); row.appendChild(main);
      const badges=el('div','badges');
      if(e.fav) badges.appendChild(el('span','pill fav','★'));
      if(e.type!=='login') badges.appendChild(el('span','pill type',tr('pill.'+e.type)));
      if(e.cat&&catFilter===null) badges.appendChild(el('span','pill cat',e.cat));
      if(e.totp) badges.appendChild(el('span','pill totp','TOTP'));
      if(h.r.has(e.id)) badges.appendChild(el('span','pill bad',tr('badge.reused')));
      if(h.w.has(e.id)) badges.appendChild(el('span','pill bad',tr('badge.weak')));
      row.appendChild(badges); list.appendChild(row);
    }
  }
  function renderBackupHint(){
    const box=$('backup-hint'); box.replaceChildren(); if(!VAULT||!live().length) return;
    const lb=VAULT.meta.lastBackup; let msg='';
    if(!lb) msg=tr('bk.none');
    else { const days=Math.floor((Date.now()-ts(lb))/86400000); const n=VAULT.entries.filter(e=>ts(e.updated)>ts(lb)).length; if(n>0&&days>=7) msg=tr('bk.stale',{d:days,n}); }
    if(msg){ const w=el('div','warn',msg); w.style.marginBottom='12px'; box.appendChild(w); }
  }

  /* ---------- Formular: neu / bearbeiten / speichern ---------- */
  function setEntryType(t){ formType=entryType(t); closeMenus(); if(formType!=='login') fgClose(); ENTRY_TYPES.forEach(x=>$('ft-'+x).classList.toggle('on',x===formType)); $('grp-login').classList.toggle('hidden',formType!=='login'); $('grp-card').classList.toggle('hidden',formType!=='card'); $('grp-bank').classList.toggle('hidden',formType!=='bank'); }
  // Typwechsel per Segment: beim Bearbeiten gehen die Felder des alten Typs verloren → benennen und rückfragen (Audit run-2 #2)
  function changeEntryType(t){ t=entryType(t); if(t===formType) return;
    const lost=(formType==='login'?['f-user','f-email','f-pass','f-url','f-totp']:formType==='card'?['f-holder','f-number','f-expiry','f-cvv','f-pin']:formType==='bank'?['f-bholder','f-iban','f-bic','f-bank','f-bpin']:[]).filter(id=>$(id).value);
    if(lost.length&&!confirm(tr('confirm.typeChange',{f:lost.map(id=>tr('lostf.'+id)).join(', ')}))) return;
    setEntryType(t); }
  function resetForm(){ ['f-title','f-cat','f-user','f-email','f-pass','f-url','f-totp','f-notes','f-holder','f-number','f-expiry','f-cvv','f-pin','f-bholder','f-iban','f-bic','f-bank','f-bpin'].forEach(id=>$(id).value=''); $('f-fav').checked=false; $('f-nowarn').checked=false; $('f-meter').textContent=''; clearExtraRows(); fgClose(); closeMenus(); err('add-err'); setEntryType('login'); maskInputs('#tab-add'); }
  function newEntry(){ editId=null; resetForm(); if(catFilter) $('f-cat').value=catFilter; $('add-title').textContent=tr('add.titleNew'); tab('add'); setTimeout(()=>$('f-title').focus(),80); }
  function editCurrent(){ const e=byId(currentId); if(!e) return toast(tr('toast.noEntry')); closeDetail(); editId=e.id; resetForm(); setEntryType(e.type);
    $('f-title').value=e.title; $('f-cat').value=e.cat; $('f-user').value=e.user; $('f-email').value=e.email||''; $('f-pass').value=e.pass; $('f-url').value=e.url; $('f-notes').value=e.notes; $('f-fav').checked=e.fav; $('f-nowarn').checked=e.nowarn;
    $('f-totp').value=e.totp?((e.totp.algorithm!=='SHA1'||e.totp.digits!==6||e.totp.period!==30||e.totp.issuer||e.totp.label)?otpauthUri(e.totp):e.totp.secret):'';
    const c=e.card||{}; $('f-holder').value=c.holder||''; $('f-number').value=c.number||''; $('f-expiry').value=c.expiry||''; $('f-cvv').value=c.cvv||''; $('f-pin').value=c.pin||'';
    const k=e.bank||{}; $('f-bholder').value=k.holder||''; $('f-iban').value=k.iban||''; $('f-bic').value=k.bic||''; $('f-bank').value=k.bank||''; $('f-bpin').value=k.pin||'';
    (e.extra||[]).forEach(x=>pushExtraRow(x.name,x.value));
    $('add-title').textContent=tr('add.titleEdit'); meterForm(); tab('add'); }
  function cancelEdit(){ editId=null; resetForm(); tab('list'); }
  function saveEntry(){
    if(!VAULT||saveEntry._busy) return; err('add-err');
    const title=$('f-title').value.trim(); if(!title) return err('add-err',tr('err.titleReq'));
    const totpIn=formType==='login'?$('f-totp').value.trim():''; const totp=totpIn?normalizeTotp(totpIn):null; if(totpIn&&!totp) return err('add-err',tr('err.totpBad'));
    const xr=readExtraRows(); const half=xr.find(x=>!!line(x.name,CAPS.xname)!==!!x.value); if(half) return err('add-err',tr('err.extraHalf',{n:half.i+1}));   // halbe Zeile → nie still verwerfen
    const now=nowIso();
    const draft={id:editId||cryptoId(), type:formType, extra:xr.filter(x=>x.name&&x.value), cat:$('f-cat').value, title, user:$('f-user').value, email:$('f-email').value, pass:$('f-pass').value, url:$('f-url').value.trim(), notes:$('f-notes').value, totp,
      card:{holder:$('f-holder').value, number:$('f-number').value, expiry:$('f-expiry').value, cvv:$('f-cvv').value, pin:$('f-pin').value},
      bank:{holder:$('f-bholder').value, iban:$('f-iban').value, bic:$('f-bic').value, bank:$('f-bank').value, pin:$('f-bpin').value}, nowarn:$('f-nowarn').checked,
      fav:$('f-fav').checked, created:now, updated:now, deleted:null};
    const idx=editId?VAULT.entries.findIndex(e=>e.id===editId):-1; const before=idx>=0?VAULT.entries[idx]:null;
    if(before) draft.created=before.created;
    const entry=sanitizeEntry(draft); if(!entry) return err('add-err',tr('err.titleReq'));
    if(idx<0&&liveCount(VAULT.entries)>=MAX_ENTRIES) return err('add-err',tr('err.tooMany'));
    const snapshot=VAULT.entries.slice();
    if(idx>=0) VAULT.entries[idx]=entry; else VAULT.entries.push(entry);
    saveEntry._busy=true; $('add-btn').disabled=true;
    persist().then(()=>{ toast(tr('toast.saved')); editId=null; resetForm(); tab('list'); })
      .catch(rollback(snapshot))
      .finally(()=>{ saveEntry._busy=false; $('add-btn').disabled=false; });
  }
  function meterForm(){ renderMeter('f-pass','f-meter'); }
  // Zusatzfelder im Formular (v1.4): dynamische Zeilen Bezeichnung + geheimer Wert; ein gemeinsamer „anzeigen“-Schalter, dessen
  // data-showpass-Liste mit den Zeilen mitwächst (maskInputs/Delegation bleiben unverändert). Typwechsel lässt sie stehen (typunabhängig).
  let extraSeq=0;
  function extraRows(){ return Array.from($('f-extra').querySelectorAll('.xrow')); }
  function syncExtraShow(){ const rows=extraRows(), cb=$('f-xshow'); cb.dataset.showpass=rows.map(r=>r.dataset.v).join(','); $('f-xshow-wrap').classList.toggle('hidden',!rows.length); if(!rows.length) cb.checked=false;   // sonst käme die nächste Zeile unmaskiert (Audit run-4 #2)
    $('f-xadd').disabled=rows.length>=EXTRA_MAX; const t=cb.checked?'text':'password'; rows.forEach(r=>{ $(r.dataset.v).type=t; }); }
  function pushExtraRow(name, value){ if(extraRows().length>=EXTRA_MAX) return null; const k=++extraSeq, row=el('div','xrow'); row.id='f-x-'+k; row.dataset.n='f-xn-'+k; row.dataset.v='f-xv-'+k;
    const mk=(id,type,cap,ph)=>{ const i=el('input'); i.id=id; i.type=type; i.maxLength=cap; i.placeholder=ph; i.autocomplete='off'; i.setAttribute('autocapitalize','none'); i.spellcheck=false; return i; };
    const ni=mk(row.dataset.n,'text',CAPS.xname,tr('f.extraName')); ni.value=name||''; const vi=mk(row.dataset.v,'password',CAPS.xvalue,tr('f.extraVal')); vi.value=value||'';
    const del=el('button','btn sm ghost','✕'); del.type='button'; del.dataset.action='removeExtraRow'; del.dataset.arg=String(k); del.title=tr('f.extraDel'); del.setAttribute('aria-label',tr('f.extraDel'));
    row.append(ni,vi,del); $('f-extra').appendChild(row); syncExtraShow(); return row; }
  function addExtraRow(){ const row=pushExtraRow('',''); if(!row) return toast(tr('err.extraMax',{n:EXTRA_MAX})); $(row.dataset.n).focus(); }
  function removeExtraRow(k){ const r=$('f-x-'+k); if(!r) return; r.remove(); syncExtraShow(); }
  function clearExtraRows(){ $('f-extra').replaceChildren(); $('f-xshow').checked=false; syncExtraShow(); }
  function readExtraRows(){ return extraRows().map((r,i)=>({name:$(r.dataset.n).value, value:$(r.dataset.v).value, i})); }
  function relabelExtraRows(){ extraRows().forEach(r=>{ $(r.dataset.n).placeholder=tr('f.extraName'); $(r.dataset.v).placeholder=tr('f.extraVal'); const b=r.querySelector('button'); b.title=tr('f.extraDel'); b.setAttribute('aria-label',tr('f.extraDel')); }); }

  /* ---------- Detail ---------- */
  // Wert eines Detail-/Kopierfelds (login: user/pass/url/notes; card: holder/number/expiry/cvv/pin; bank: holder/iban/bic/bank/pin — der Typ bestimmt das Objekt)
  function fieldValue(e, which){ if(!e) return ''; const mx=/^x(\d+)$/.exec(which||''); if(mx) return e.extra&&e.extra[+mx[1]]?e.extra[+mx[1]].value:''; if(e.type==='bank'&&['holder','iban','bic','bank','pin'].includes(which)) return e.bank?e.bank[which]||'':''; if(['holder','number','expiry','cvv','pin'].includes(which)) return e.card?e.card[which]||'':''; return typeof e[which]==='string'?e[which]:''; }
  function kv(label, value, opts){
    const box=el('div','kv'); box.appendChild(el('div','k',label));
    const vrow=el('div','vrow'); const v=el('div','v'+(opts&&opts.secret?' secret masked':'')); v.textContent=opts&&opts.secret?'••••••••••••':value; const key=opts&&(opts.copy||opts.id); if(key) v.id='d-'+key; vrow.appendChild(v);
    if(opts&&opts.secret){ const b=el('button','btn sm ghost',tr('d.show')); b.dataset.action='toggleReveal'; b.dataset.arg=opts.copy; b.id='d-reveal-'+opts.copy; vrow.appendChild(b); }
    if(opts&&opts.copy){ const c=el('button','btn sm ghost',tr('d.copy')); c.dataset.action='copyField'; c.dataset.arg=opts.copy; vrow.appendChild(c); }
    box.appendChild(vrow); return box;
  }
  function openDetail(id){
    const e=byId(id); if(!e) return; currentId=id; stopTotp();
    $('d-title').textContent=e.title; const b=$('d-body'); b.replaceChildren();
    if(e.cat) b.appendChild(kv(tr('d.cat'), e.cat, {id:'cat'}));
    if(e.type==='card'&&e.card){ const c=e.card;
      if(c.holder) b.appendChild(kv(tr('d.holder'), c.holder, {copy:'holder'}));
      if(c.number) b.appendChild(kv(tr('d.number'), '', {secret:true, copy:'number'}));
      if(c.expiry) b.appendChild(kv(tr('d.expiry'), c.expiry, {copy:'expiry'}));
      if(c.cvv) b.appendChild(kv(tr('d.cvv'), '', {secret:true, copy:'cvv'}));
      if(c.pin) b.appendChild(kv(tr('d.pin'), '', {secret:true, copy:'pin'})); }
    if(e.type==='bank'&&e.bank){ const k=e.bank;   // IBAN/BIC im Klartext (werden zum Überweisen gebraucht, stehen auf jeder Rechnung), PIN nur nach Reveal
      if(k.holder) b.appendChild(kv(tr('d.bholder'), k.holder, {copy:'holder'}));
      if(k.iban) b.appendChild(kv(tr('d.iban'), k.iban, {copy:'iban'}));
      if(k.bic) b.appendChild(kv(tr('d.bic'), k.bic, {copy:'bic'}));
      if(k.bank) b.appendChild(kv(tr('d.bank'), k.bank, {copy:'bank'}));
      if(k.pin) b.appendChild(kv(tr('d.pin'), '', {secret:true, copy:'pin'})); }
    if(e.user) b.appendChild(kv(tr('d.user'), e.user, {copy:'user'}));
    if(e.email) b.appendChild(kv(tr('d.email'), e.email, {copy:'email'}));   // v1.4: zweite Adresse im Klartext, wie der Nutzername
    if(e.pass) b.appendChild(kv(tr('d.pass'), '', {secret:true, copy:'pass'}));
    if(e.url) b.appendChild(kv(tr('d.url'), e.url, {copy:'url'}));   // bewusst Text, kein Link (kein Netz in der App)
    if(e.totp){ const box=el('div','kv'); box.appendChild(el('div','k',tr('d.totp')+(e.totp.issuer?' · '+e.totp.issuer:'')));
      const vrow=el('div','vrow'); const code=el('div','v totp-box','------'); code.id='d-totp'; vrow.appendChild(code);
      const c=el('button','btn sm ghost',tr('d.copy')); c.dataset.action='copyField'; c.dataset.arg='totp'; vrow.appendChild(c); box.appendChild(vrow);
      const bar=el('div','totp-bar'); bar.id='d-totp-bar'; bar.appendChild(el('i')); box.appendChild(bar); b.appendChild(box); startTotp(e.totp); }
    (e.extra||[]).forEach((x,i)=>b.appendChild(kv(x.name, '', {secret:true, copy:'x'+i})));   // Zusatzfelder: immer geheim, eigener Reveal/Kopieren
    if(e.notes) b.appendChild(kv(tr('d.notes'), e.notes, {copy:'notes'}));
    $('d-meta').textContent=tr('d.meta',{c:fmtDate(e.created),u:fmtDate(e.updated)});
    $('d-fav-btn').textContent=e.fav?tr('d.unfav'):tr('d.fav');
    show('detail-overlay'); $('detail-overlay').scrollTop=0;
  }
  function closeDetail(){ stopTotp(); hide('detail-overlay'); const b=$('d-body'); b.replaceChildren(); $('d-title').textContent=''; $('d-meta').textContent=''; currentId=null; }
  function toggleReveal(which){ which=which||'pass'; const e=byId(currentId), v=$('d-'+which), btn=$('d-reveal-'+which); if(!e||!v) return; const masked=v.classList.contains('masked'); v.textContent=masked?fieldValue(e,which):'••••••••••••'; v.classList.toggle('masked',!masked); if(btn) btn.textContent=masked?tr('d.hide'):tr('d.show'); }
  function copyField(which){ if(which==='gen') return copyText(genValue,'what.gen'); const e=byId(currentId); if(!e) return toast(tr('toast.noEntry')); const val=which==='totp'?lastCode:fieldValue(e,which); copyText(val,/^x\d+$/.test(which)?'what.extra':'what.'+which); }
  function toggleFavCurrent(){ const e=byId(currentId); if(!e) return; const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice(); const upd=Object.assign({},e,{fav:!e.fav,updated:nowIso()}); VAULT.entries[idx]=upd; persist().then(()=>{ openDetail(e.id); renderList(); }).catch(rollback(snapshot)); }
  function deleteCurrent(){ const e=byId(currentId); if(!e) return; if(!confirm(tr('confirm.delete',{t:e.title,d:TRASH_DAYS}))) return;
    const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice(), iso=nowIso();
    VAULT.entries[idx]=Object.assign({},e,{updated:iso, deleted:iso});     // in den Papierkorb — der Inhalt bleibt TRASH_DAYS erhalten
    persist().then(()=>{ closeDetail(); renderList(); toast(tr('toast.trashed',{d:TRASH_DAYS})); }).catch(rollback(snapshot)); }

  /* ---------- Papierkorb (v1.5) ---------- */
  // Zähler am Symbol in der Suchzeile; leer bleibt das Symbol sichtbar (nur gedimmt), damit man es findet, bevor man es braucht.
  function renderTrashBtn(){ const b=$('trash-btn'), n=$('trash-n'); if(!b||!n) return; const c=trash().length;
    n.textContent=c?String(c):''; b.classList.toggle('ghost',c===0); b.title=b.ariaLabel=tr('trash.btn'); }
  function openTrash(){ tab('trash'); }
  // BEWUSST nur Titel, Typ und Löschdatum: kein Aufdecken, kein Kopieren. Wer den Inhalt braucht, stellt erst wieder her —
  // sonst wäre ein per fremder .vault eingeschleuster Eintrag mit vertrautem Titel ein bequemer Phishing-Weg.
  function renderTrash(){
    if(!VAULT) return;
    const list=$('trash-list'); list.replaceChildren();
    const items=trash();
    $('trash-msg').textContent=items.length?tr('trash.count',{n:items.length,d:TRASH_DAYS}):'';
    $('trash-empty-btn').classList.toggle('hidden',!items.length);
    renderTrashBtn();
    if(!items.length){ list.appendChild(el('div','empty',tr('trash.empty'))); return; }
    for(const e of items){
      const row=el('div','entry');
      row.appendChild(el('div','av',(e.title.trim()[0]||'?').toUpperCase()));
      const main=el('div','main'); main.appendChild(el('div','t',e.title||tr('trash.untitled')));
      main.appendChild(el('div','u',tr('trash.deletedOn',{d:fmtDate(e.deleted)}))); row.appendChild(main);
      const badges=el('div','badges');
      if(e.type!=='login') badges.appendChild(el('span','pill type',tr('pill.'+e.type)));
      row.appendChild(badges);
      list.appendChild(row);
      const acts=el('div','row'); acts.style.margin='0 0 12px';
      const r=el('button','btn sm',tr('trash.restore')); r.dataset.action='restoreEntry'; r.dataset.arg=e.id;
      const d=el('button','btn sm danger',tr('trash.purge')); d.dataset.action='purgeEntry'; d.dataset.arg=e.id;
      acts.appendChild(r); acts.appendChild(d); list.appendChild(acts);
    }
  }
  function restoreEntry(id){ const e=trashById(id); if(!e) return toast(tr('toast.noEntry'));
    if(liveCount(VAULT.entries)>=MAX_ENTRIES) return toast(tr('err.tooMany'));
    const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice();
    VAULT.entries[idx]=Object.assign({},e,{updated:nowIso(), deleted:null});   // neueres updated ⇒ schlägt die Löschmarke auf anderen Geräten
    persist().then(()=>{ renderTrash(); renderList(); toast(tr('toast.restored')); }).catch(rollback(snapshot)); }
  function purgeEntry(id){ const e=trashById(id); if(!e) return; if(!confirm(tr('confirm.purge',{t:e.title||tr('trash.untitled')}))) return;
    const idx=VAULT.entries.indexOf(e), snapshot=VAULT.entries.slice();
    VAULT.entries[idx]=tombstone(e, nowIso());                                 // updated=jetzt ⇒ der leere Stand gewinnt überall
    persist().then(()=>{ renderTrash(); renderList(); toast(tr('toast.purged')); }).catch(rollback(snapshot)); }
  function emptyTrash(){ if(!VAULT) return; const t=trash(); if(!t.length) return;
    if(!confirm(tr('confirm.emptyTrash',{n:t.length}))) return;
    const snapshot=VAULT.entries.slice(), iso=nowIso(), ids=new Set(t.map(e=>e.id));
    VAULT.entries=VAULT.entries.map(e=>ids.has(e.id)?tombstone(e,iso):e);
    persist().then(()=>{ renderTrash(); renderList(); toast(tr('toast.trashEmptied')); }).catch(rollback(snapshot)); }
  function startTotp(t){ stopTotp(); let lastCounter=-1; const tick=async()=>{ if(!DEK) return stopTotp(); const now=Date.now(), counter=Math.floor(now/1000/t.period), rem=totpRemaining(t,now);
      if(counter!==lastCounter){ lastCounter=counter; try{ lastCode=await totpCode(t,now); }catch(_){ lastCode=''; } const c=$('d-totp'); if(c) c.textContent=lastCode?lastCode.replace(/(\d{3})(?=\d)/g,'$1 '):'—'; }
      const bar=$('d-totp-bar'); if(bar){ bar.firstChild.style.width=(rem/t.period*100)+'%'; bar.classList.toggle('low',rem<=5); } };
    tick(); totpTimer=setInterval(tick,1000); }
  function stopTotp(){ if(totpTimer){ clearInterval(totpTimer); totpTimer=null; } lastCode=''; }

  /* ---------- Generator ---------- */
  function genOpts(){ return {upper:GEN.upper, lower:GEN.lower, digits:GEN.digits, symbols:GEN.symbols, noamb:GEN.noamb}; }
  // Zustand → beide Panels (Controls, Zähler, Segmente, Sichtbarkeit der Optionsblöcke)
  function genSync(){ document.querySelectorAll('[data-gen]').forEach(c=>{ const k=c.dataset.gen; if(!Object.prototype.hasOwnProperty.call(GEN_DEFAULT,k)) return; if(c.type==='checkbox') c.checked=GEN[k]; else c.value=String(GEN[k]); });
    [['gen-len-v',GEN.len],['fg-len-v',GEN.len],['gen-wc-v',GEN.wc],['fg-wc-v',GEN.wc]].forEach(([id,v])=>{ const n=$(id); if(n) n.textContent=v; });
    const w=GEN.mode==='words'; [['gm-chars',!w],['gm-words',w],['fgm-chars',!w],['fgm-words',w]].forEach(([id,on])=>{ const n=$(id); if(n) n.classList.toggle('on',on); });
    [['gen-chars-opts',w],['fg-chars-opts',w],['gen-words-opts',!w],['fg-words-opts',!w]].forEach(([id,h])=>{ const n=$(id); if(n) n.classList.toggle('hidden',h); });
    syncCombos(); }   // Knopfbeschriftungen der Trenner-Auswahl nachziehen
  function genReset(){ GEN=Object.assign({},GEN_DEFAULT); genSync(); }
  function inFormPanel(elx){ return !!(elx&&elx.closest&&elx.closest('#fg-panel')); }
  // Control geändert (beide Panels): Wert in den Zustand, beide Panels angleichen, dort neu erzeugen, wo geändert wurde
  function genChanged(v, elx){ if(!elx||!elx.dataset||!Object.prototype.hasOwnProperty.call(GEN_DEFAULT,elx.dataset.gen)) return; const k=elx.dataset.gen;
    GEN[k]=elx.type==='checkbox'?elx.checked:(elx.type==='range'?(parseInt(elx.value,10)||GEN_DEFAULT[k]):String(elx.value)); genSync(); inFormPanel(elx)?fgGen():genNew(); }
  function setGenMode(m, elx){ GEN.mode=m==='words'?'words':'chars'; genSync(); inFormPanel(elx)?fgGen():genNew(); }
  function genMake(){ if(GEN.mode==='words'){ const r=genWords(GEN.wc,GEN.sep,GEN.cap,GEN.num); if(!r.pw) toast(tr('toast.wordsMissing')); return r; } return genChars(GEN.len,genOpts()); }
  function genNew(){ genSync();
    const r=genMake(); if(!r.pw){ $('gen-out').textContent=''; $('gen-ent').textContent=GEN.mode==='chars'?tr('gen.noset'):''; genValue=''; return; }
    genValue=r.pw; $('gen-out').textContent=r.pw; $('gen-ent').textContent=tr('gen.bits',{b:r.bits});
    $('gen-use').classList.toggle('hidden', false);
  }
  // Formular-Panel: erzeugt direkt ins Passwortfeld (sichtbar, solange das Panel offen ist)
  function fgGen(){ genSync(); const r=genMake(); if(!r.pw){ $('fg-ent').textContent=GEN.mode==='chars'?tr('gen.noset'):''; return; }
    $('f-pass').value=r.pw; $('fg-ent').textContent=tr('gen.bits',{b:r.bits}); meterForm(); }   // Sichtbarkeit bleibt, wie der Nutzer sie gesetzt hat (Audit run-4 #3)
  function fgClose(){ $('fg-panel').classList.add('hidden'); $('fg-ent').textContent=''; maskInputs('#grp-login'); }
  function genCopy(){ copyText(genValue,'what.gen'); }
  function genUse(){ if(!genValue) return; if(!editId&&!$('f-title').value) { editId=null; resetForm(); $('add-title').textContent=tr('add.titleNew'); } if(formType!=='login') setEntryType('login'); $('f-pass').value=genValue; meterForm(); tab('add'); }
  function genIntoForm(){ $('fg-panel').classList.remove('hidden'); $('f-pass').type='text'; const cb=document.querySelector('input[data-showpass="f-pass"]'); if(cb) cb.checked=true; fgGen(); }   // „Generieren“: Panel auf, EINMAL aufdecken, erzeugen
  function suggestPass(){ const r=genWords(6,'-',false,false); if(!r.pw) return toast(tr('toast.wordsMissing')); $('setup-pass1').value=r.pw; $('setup-pass2').value=r.pw; $('setup-pass1').type=$('setup-pass2').type='text'; $('setup-show').checked=true; meterSetup(); toast(tr('toast.suggest')); }
  function renderMeter(inId,outId){ const p=$(inId).value, o=$(outId); if(!p){ o.textContent=''; return; } const st=passStrength(p); const col=['var(--red)','var(--orange)','var(--text-mid)','var(--neon)'][st]; o.replaceChildren(); const s=el('span',null,'▮'.repeat(st+1)+'▯'.repeat(3-st)+' '+tr('pass.s'+st)); s.style.color=col; o.appendChild(s); }
  function meterSetup(){ renderMeter('setup-pass1','setup-meter'); }
  function meterCp(){ renderMeter('cp1','cp-meter'); }

  /* ---------- Backup export / import ---------- */
  const CAP = window.Capacitor || null;
  const isNative = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  const SC = (isNative && CAP.Plugins && CAP.Plugins.SecureClip) ? CAP.Plugins.SecureClip : null;   // eigenes Mini-Plugin (patch-hardening.mjs)
  const BIO = (isNative && CAP.Plugins && CAP.Plugins.Biometric) ? CAP.Plugins.Biometric : null;   // Fingerabdruck-Plugin (patch-hardening.mjs), Web: kein Slot
  async function nativeSaveAndShare(name, content, dir, shareText){
    const FS=CAP.Plugins&&CAP.Plugins.Filesystem; if(!FS) throw new Error('Filesystem-Plugin fehlt');
    const w=await FS.writeFile({path:name, data:content, directory:dir||'DOCUMENTS', encoding:'utf8', recursive:true});
    try{ const SH=CAP.Plugins&&CAP.Plugins.Share; if(SH) await SH.share({title:name, text:shareText||'Alien Pass Backup', url:w.uri}); }catch(_){}
    return w.uri;
  }
  function downloadFile(name, content, type){ const blob=new Blob([content],{type:type||'application/octet-stream'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function renderBackupMsg(){ const m=$('bk-msg'); const lb=VAULT&&VAULT.meta.lastBackup; m.textContent=lb?(LANG==='de'?'Letztes Backup: ':'Last backup: ')+fmtDate(lb):''; }
  async function exportVault(){
    if(!VAULT||exportVault._busy) return; exportVault._busy=true;
    try{
      const raw=localStorage.getItem(LS_KEY); const name='alien-pass-'+new Date().toISOString().slice(0,10)+'.vault';
      // Erst die Datei schreiben — der Backup-Stempel darf nur nach Erfolg gesetzt werden
      try{ if(isNative){
             try{ await nativeSaveAndShare(name, raw, 'DOCUMENTS', 'Alien Pass Backup'); $('bk-msg').textContent=tr('bk.doneNative',{n:name}); }
             catch(e1){ await nativeSaveAndShare(name, raw, 'CACHE', 'Alien Pass Backup'); $('bk-msg').textContent=tr('bk.doneShare',{n:name}); }   // ältere Androids ohne Documents-Zugriff: nur via Teilen
           } else { downloadFile(name, raw, 'application/octet-stream'); $('bk-msg').textContent=tr('bk.done',{n:name}); } }
      catch(e){ $('bk-msg').textContent=tr('bk.failed',{e:String(e&&e.message||e)}); return; }
      if(!VAULT) return;
      const before={lastBackup:VAULT.meta.lastBackup,lastBackupCount:VAULT.meta.lastBackupCount};
      VAULT.meta.lastBackup=nowIso(); VAULT.meta.lastBackupCount=VAULT.entries.length;
      try{ await persist(); }catch(e){ if(!(e&&e.locked)&&VAULT) Object.assign(VAULT.meta,before); }
      renderBackupHint();
    }finally{ exportVault._busy=false; }
  }
  function pickFile(id){ const n=$(id); if(n) n.click(); }
  function importVault(ev){
    const f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f) return; const input=ev.target; $('import-msg').textContent='';
    const r=new FileReader(); r.onerror=()=>{ $('import-msg').textContent=tr('bk.readErr'); input.value=''; };
    r.onload=()=>{ input.value=''; try{ pendingImport=parseFile(String(r.result)); }catch(e){ pendingImport=null; $('import-msg').textContent=fileErrMsg(e); return; }
      show('import-pass-box'); setTimeout(()=>$('import-pass').focus(),80); };
    if(f.size>MAX_FILE_BYTES){ $('import-msg').textContent=tr('err.fileLarge'); input.value=''; return; }
    r.readAsText(f);
  }
  function cancelImport(){ pendingImport=null; $('import-pass').value=''; hide('import-pass-box'); }
  async function doImportVault(){
    if(doImportVault._busy||!pendingImport||!VAULT) return; const f=pendingImport;
    if(f.kdf.m>KDF_CONFIRM_M && !confirm(tr('confirm.bigKdf',{m:Math.round(f.kdf.m/1024)}))) return;
    const btn=$('import-btn'), orig=btn.textContent; doImportVault._busy=true; btn.disabled=true; btn.textContent=tr('busy.decrypting');
    try{
      let incoming;
      try{ const kek=await deriveKek(passBytes($('import-pass').value), f.kdf); const dek=await unwrapDek(f.wrap,kek,f.kdf,false); const obj=await decryptBody(f.body,dek,f.kdf); incoming=sanitizeVault(obj).entries; }
      catch(e){ $('import-pass').value=''; if(VAULT) $('import-msg').textContent=e&&e.message==='toomany'?tr('err.tooMany'):tr('bk.mergeFail'); return; }
      if(!VAULT||!DEK) return;                                   // während des Argon2-Laufs gesperrt → sauber abbrechen
      const before=VAULT.entries.slice(); const m=mergeEntries(VAULT.entries, incoming);
      if(liveCount(m.entries)>MAX_ENTRIES){ $('import-msg').textContent=tr('err.tooMany'); return; }
      VAULT.entries=m.entries;
      try{ await persist(); if(!VAULT) return; $('import-msg').textContent=tr('bk.merged',{a:m.added,u:m.updated,d:m.deleted,t:m.tombstonesIn}); cancelImport(); renderList(); }
      catch(e){ if(!(e&&e.locked)&&VAULT) VAULT.entries=before; }
    }finally{ doImportVault._busy=false; btn.disabled=false; btn.textContent=orig; }
  }
  function importCsv(ev){
    const f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f||!VAULT) return; const input=ev.target; $('csv-msg').textContent='';
    if(f.size>MAX_FILE_BYTES){ $('csv-msg').textContent=tr('err.fileLarge'); input.value=''; return; }
    const r=new FileReader(); r.onerror=()=>{ $('csv-msg').textContent=tr('bk.readErr'); input.value=''; };
    r.onload=()=>{ input.value=''; if(!VAULT||!DEK) return; const text=String(r.result);   // währenddessen gesperrt → abbrechen
      let rows=parseCsv(text,','); if(rows.length&&rows[0].length<2&&text.indexOf(';')>=0) rows=parseCsv(text,';');
      if(rows.length<2){ $('csv-msg').textContent=tr('csv.empty'); return; }
      const map=csvMap(rows[0]); if(!map){ $('csv-msg').textContent=tr('csv.unknown'); return; }
      const now=Date.now(); const existing=new Set(live().map(dupKey)); const stats={truncated:0};
      const added=[]; let skipped=0, bad=0;
      for(const row of rows.slice(1)){ const e=csvRowToEntry(map,row,now,stats); if(!e){ bad++; continue; } const key=dupKey(e); if(existing.has(key)){ skipped++; continue; } existing.add(key); added.push(e); }
      if(liveCount(VAULT.entries)+added.length>MAX_ENTRIES){ $('csv-msg').textContent=tr('err.tooMany'); return; }
      const before=VAULT.entries.slice(); VAULT.entries=VAULT.entries.concat(added);
      persist().then(()=>{ if(!VAULT) return; $('csv-msg').textContent=tr('csv.done',{n:added.length,f:tr('fmt.'+map.fmt),s:skipped,b:bad})+(stats.truncated?' '+tr('imp.truncated',{t:stats.truncated}):''); renderList(); })
        .catch(rollback(before)); };
    r.readAsText(f);
  }

  /* ---------- Proton-Pass-Export (PGP / ZIP / JSON) ---------- */
  function protonErr(e){ const c=e&&e.message; return tr(c==='pgpPass'?'pt.wrongPass':c==='pgpMdc'?'pt.mdc':c==='pgpAlgo'?'pt.algo':c==='zip64'?'pt.zip64':c==='toolarge'?'err.fileLarge':c==='toomany'?'err.tooMany':'pt.bad'); }
  function importProton(ev){
    const f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(!f||!VAULT) return; const input=ev.target; $('proton-msg').textContent=''; cancelProton();
    if(f.size>MAX_FILE_BYTES){ $('proton-msg').textContent=tr('err.fileLarge'); input.value=''; return; }
    const r=new FileReader(); r.onerror=()=>{ $('proton-msg').textContent=tr('bk.readErr'); input.value=''; };
    r.onload=async()=>{ input.value=''; if(!VAULT) return;
      let probe; try{ probe=await protonProbe(new Uint8Array(r.result)); }catch(e){ $('proton-msg').textContent=protonErr(e); return; }
      if(!VAULT) return; pendingProton=probe;
      if(probe.kind==='pgp'){ $('proton-msg').textContent=tr('pt.needPass'); show('proton-pass-box'); setTimeout(()=>$('proton-pass').focus(),80); }
      else doImportProton(); };
    r.readAsArrayBuffer(f);
  }
  function cancelProton(){ pendingProton=null; $('proton-pass').value=''; hide('proton-pass-box'); }
  async function doImportProton(){
    if(doImportProton._busy||!pendingProton||!VAULT) return; const probe=pendingProton;
    const btn=$('proton-btn'), orig=btn.textContent; doImportProton._busy=true; btn.disabled=true; btn.textContent=tr(probe.kind==='pgp'?'busy.decrypting':'busy.importing');
    try{
      let res;
      try{ const obj=await protonLoad(probe, $('proton-pass').value); res=protonExportToEntries(obj, Date.now()); }
      catch(e){ if(VAULT) $('proton-msg').textContent=protonErr(e); return; }
      if(!VAULT||!DEK||pendingProton!==probe) return;              // währenddessen gesperrt/abgebrochen
      const existing=new Set(live().map(dupKey)); const added=[]; let skipped=0;
      for(const e of res.entries){ const k=dupKey(e); if(existing.has(k)){ skipped++; continue; } existing.add(k); added.push(e); }
      if(liveCount(VAULT.entries)+added.length>MAX_ENTRIES){ $('proton-msg').textContent=tr('err.tooMany'); return; }
      const before=VAULT.entries.slice(); VAULT.entries=VAULT.entries.concat(added);
      try{ await persist(); if(!VAULT) return; $('proton-msg').textContent=tr('pt.done',{n:added.length,v:res.vaults,s:skipped,k:res.skipped})+(res.truncated?' '+tr('imp.truncated',{t:res.truncated}):'')+(res.hiddenOver?' '+tr('imp.hiddenOver',{n:res.hiddenOver,m:EXTRA_MAX}):''); cancelProton(); renderList(); }
      catch(e){ if(!(e&&e.locked)&&VAULT) VAULT.entries=before; }
    }finally{ doImportProton._busy=false; btn.disabled=false; btn.textContent=orig; $('proton-pass').value=''; }
  }

  /* ---------- Aegis-Hürde (TOTP beim Entsperren) ---------- */
  function totpStart(){
    if(!VAULT) return; pendingSecret=base32Encode(rand(20));
    pendingOtpauth=`otpauth://totp/Alien-Pass:Tresor?secret=${pendingSecret}&issuer=Alien-Pass&algorithm=SHA1&digits=6&period=30`;
    $('totp-secret').textContent=pendingSecret; drawQR($('totp-qr'), pendingOtpauth);
    hide('totp-off'); show('totp-setup'); hide('totp-on'); $('totp-verify').value=''; err('totp-setup-err'); setTimeout(()=>$('totp-verify').focus(),80);
  }
  function drawQR(canvas, text){
    if(typeof qrMatrix!=='function'){ canvas.style.display='none'; return; }
    let m; try{ m=qrMatrix(text); }catch(_){ canvas.style.display='none'; return; }
    canvas.style.display=''; const quiet=4, n=m.size, scale=8, dim=(n+quiet*2)*scale; canvas.width=dim; canvas.height=dim;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,dim,dim); ctx.fillStyle='#000';
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(m.modules[r][c]) ctx.fillRect((c+quiet)*scale,(r+quiet)*scale,scale,scale);
  }
  // Die geteilte QR-PNG (Aegis-Schlüssel) ist transient: an Lebenszyklus-Punkten best-effort löschen (Share-Promise ist kein verlässliches Signal)
  function dropQrFile(){ if(!isNative) return; try{ const FS=CAP.Plugins&&CAP.Plugins.Filesystem; if(FS) FS.deleteFile({path:'alien-pass-aegis-qr.png',directory:'CACHE'}).catch(()=>{}); }catch(_){} }
  function clearQrCanvas(){ const q=$('totp-qr'); if(q&&q.width){ q.getContext('2d').clearRect(0,0,q.width,q.height); q.width=q.height=0; } }
  function blobToBase64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]||''); r.onerror=rej; r.readAsDataURL(blob); }); }
  function saveQR(){
    const c=$('totp-qr'); if(!pendingSecret||!c||c.style.display==='none'||!c.width) return toast(tr('toast.noQr'));
    c.toBlob(async blob=>{ const fname='alien-pass-aegis-qr.png';
      if(isNative){ try{ const b64=await blobToBase64(blob); const FS=CAP.Plugins&&CAP.Plugins.Filesystem; const w=await FS.writeFile({path:fname,data:b64,directory:'CACHE',recursive:true});   // app-intern, nur transient via Teilen
          const SH=CAP.Plugins&&CAP.Plugins.Share; if(SH) await SH.share({title:fname,url:w.uri}); toast(tr('toast.qrSaved')); }catch(_){ toast(tr('toast.qrSaveFail')); } }
      else { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fname; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast(tr('toast.qrSaved')); }
    },'image/png');
  }
  function copySecret(){ if(pendingSecret) copyText(pendingSecret,'what.secret'); }
  function copyOtpauth(){ if(pendingOtpauth) copyText(pendingOtpauth,'what.otpauth'); }
  async function totpConfirm(){
    if(!VAULT||!pendingSecret||totpConfirm._busy) return; err('totp-setup-err'); totpConfirm._busy=true;
    try{
      const t=normalizeTotp(pendingSecret); const code=$('totp-verify').value.trim();
      if(!/^\d{6}$/.test(code)||!(await totpValid(t, code))) return err('totp-setup-err',tr('err.totpSetupBad'));
      if(!VAULT) return; const before=VAULT.totp; VAULT.totp=t;
      try{ await persist(); }catch(e){ if(!(e&&e.locked)&&VAULT) VAULT.totp=before; return; }
      pendingSecret=null; pendingOtpauth=''; $('totp-verify').value=''; $('totp-secret').textContent=''; clearQrCanvas(); dropQrFile(); renderSettings(); toast(tr('toast.totpOn'));
    }finally{ totpConfirm._busy=false; }
  }
  function totpCancel(){ pendingSecret=null; pendingOtpauth=''; $('totp-verify').value=''; $('totp-secret').textContent=''; clearQrCanvas(); dropQrFile(); renderSettings(); }
  async function totpDisable(){ if(!VAULT||!VAULT.totp||!confirm(tr('confirm.totpDisable'))) return; const before=VAULT.totp; VAULT.totp=null; try{ await persist(); }catch(e){ if(!(e&&e.locked)&&VAULT) VAULT.totp=before; return; } renderSettings(); toast(tr('toast.totpOff')); }

  /* ---------- Fingerabdruck-Entsperren (nur Android-App) ----------
     Der DEK wird zusätzlich unter einem 32-Byte-Zufallsschlüssel verpackt (Rolle 'bio', Blob in localStorage, nie in der .vault).
     Den Zufallsschlüssel verwahrt der Android-Keystore, gebunden an einen starken Fingerabdruck (Freigabe pro Nutzung; ein neu
     eingerichteter Fingerabdruck macht ihn ungültig). Nach einem Neustart verweigert das Plugin den Keystore-Teil: Passphrase-Pflicht,
     danach wird der Slot mit frischem Zufall neu bewaffnet. Ehrlich: Regel im Code, keine kryptografische Garantie — siehe Hilfe. */
  const BIO_KEY='ai-pass-bio', BIO_REARM_KEY='ai-pass-bio-rearm', BIO_HOLD_KEY='ai-pass-bio-hold';   // Marker (keine Geheimnisse): Neu-Bewaffnung nach Neustart / bewusster Riegel
  let bioArmed=false, bioNeedsRearm=false, bioRearmDek=null, bioGen=0, bioAuto=true;
  function bioBlob(){ try{ return parseBioBlob(localStorage.getItem(BIO_KEY)); }catch(_){ return null; } }
  function bioMarker(){ try{ return localStorage.getItem(BIO_REARM_KEY)==='1'; }catch(_){ return false; } }
  function setBioMarker(on){ try{ if(on) localStorage.setItem(BIO_REARM_KEY,'1'); else localStorage.removeItem(BIO_REARM_KEY); }catch(_){} }
  // Riegel: „Jetzt sperren“ = bewusst gesperrt → beim nächsten Start nur die Passphrase (kein Knopf, kein Prompt); Schlüsselmaterial bleibt,
  // nach der Passphrase gilt der Fingerabdruck ohne Neu-Aktivierung wieder. Überlebt App-Neustart (localStorage).
  function bioHold(){ try{ return localStorage.getItem(BIO_HOLD_KEY)==='1'; }catch(_){ return false; } }
  function setBioHold(on){ try{ if(on) localStorage.setItem(BIO_HOLD_KEY,'1'); else localStorage.removeItem(BIO_HOLD_KEY); }catch(_){} }
  function bioMsg(t){ const n=$('bio-msg'); if(!n) return; n.textContent=t||''; n.classList.toggle('hidden',!t); }
  function renderBioGate(){ const b=$('bio-btn'); if(b){ b.classList.toggle('hidden',!bioArmed||bioHold()); b.disabled=!!doUnlock._busy; } }   // Riegel: Knopf verborgen
  // Slot verwerfen: JS-Blob + Marker immer, Keystore-Teil auf Wunsch (bei ungültigem Schlüssel hat das Plugin ihn schon selbst gelöscht).
  // bioGen++ lässt laufende enroll/unlock-Vorgänge verfallen (Audit run-3)
  function bioDrop(native){ try{ localStorage.removeItem(BIO_KEY); }catch(_){} setBioMarker(false); setBioHold(false); bioArmed=false; bioNeedsRearm=false; bioRearmDek=null; bioGen++; if(native&&BIO){ try{ BIO.disable().catch(()=>{}); }catch(_){} } renderBioGate(); }
  // Sperrbildschirm: nativen Zustand abgleichen. auto = Prompt sofort zeigen (nicht nach manuellem Sperren, nie im Hintergrund)
  async function bioProbe(auto){
    bioArmed=false; renderBioGate();
    if(!BIO){ if(bioBlob()||bioMarker()) bioDrop(false); return; }                     // Web-Build: kein Slot, Reste wegräumen
    const gen=bioGen, blob=bioBlob(), marker=bioMarker();
    let st; try{ st=await BIO.status(); }catch(_){ st={enabled:false,reason:'error'}; }
    if(gen!==bioGen||DEK||pendingUnlock) return;
    const reason=st&&st.reason;
    if(reason==='reboot'||(!blob&&marker&&reason==='none')){                             // Neustart: Slot JETZT verwerfen (Keystore + Blob), nur der Marker bleibt (Audit run-3 #6)
      if(blob||reason==='reboot') bioDrop(true); setBioMarker(true); bioNeedsRearm=true; bioMsg(tr('bio.afterReboot')); return; }
    if(!blob){ if(st&&st.enabled){ try{ BIO.disable().catch(()=>{}); }catch(_){} } setBioMarker(false); setBioHold(false); return; }   // Keystore-Rest ohne JS-Blob: aufräumen
    if(st&&st.enabled&&bioHold()){ bioArmed=true; bioNeedsRearm=false; setBioMarker(false); renderBioGate(); bioMsg(tr('bio.held')); return; }   // Riegel: Slot gilt (Einstellungen zeigen „aktiv“), aber kein Knopf, kein Prompt
    if(st&&st.enabled){ bioArmed=true; bioNeedsRearm=false; setBioMarker(false); renderBioGate(); if(auto&&!document.hidden) doBio(); return; }
    if(reason==='unavailable'||reason==='error'){ bioMsg(tr('bio.naNow')); return; }     // vorübergehend (Keystore beschäftigt): Slot behalten, Passphrase
    bioDrop(false); bioMsg(tr('bio.reset'));                                              // neuer Fingerabdruck / Schlüssel weg: bewusst neu aktivieren
  }
  // Slot (neu) bewaffnen: braucht einen EXTRAHIERBAREN DEK-Handle (WebCrypto-Objekt, nie Rohbytes), der danach fallen gelassen wird;
  // wrapCt bindet den Slot an den Passphrase-Slot der Datei (Audit run-3 #3)
  async function bioArm(dekX, kdf, wrapCt, rearm){
    const gen=bioGen, secret=rand(32);
    try{
      const key=await bioKey(secret); const blob=await wrapDek(dekX, key, kdf, 'bio'); const ser=serializeBioBlob(blob, wrapCt);
      await BIO.enroll({secret:bufToB64(secret), title:tr('bio.promptTitle'), subtitle:tr(rearm?'bio.promptRearm':'bio.promptEnroll'), negative:tr('btn.cancel')});
      if(gen!==bioGen||!VAULT){ try{ BIO.disable().catch(()=>{}); }catch(_){} toast(tr('bio.aborted')); return false; }   // zwischendurch gesperrt / Passphrase gewechselt: nichts hinterlassen
      localStorage.setItem(BIO_KEY, ser); setBioMarker(false); bioArmed=true; bioNeedsRearm=false; return true;
    }catch(e){ const c=e&&e.message; bioDrop(true); toast(tr(c==='cancel'?'bio.cancelled':c==='lockout'?'bio.lockout':'bio.failed')); return false; }
    finally{ secret.fill(0); }
  }
  // Sperrbildschirm: Fingerabdruck → Keystore gibt den Zufallsschlüssel heraus → DEK auspacken → gleicher Weg wie die Passphrase
  async function doBio(){
    if(doBio._busy||doUnlock._busy||!BIO||!bioArmed||bioHold()||DEK||pendingUnlock) return; err('lock-err');   // Riegel: Passphrase-Pflicht
    const raw=localStorage.getItem(LS_KEY); if(!raw) return boot();
    let f; try{ f=parseFile(raw); }catch(e){ return err('lock-err',fileErrMsg(e)); }
    const blob=bioBlob(); if(!blob){ bioDrop(true); return; }
    if(blob.w!==bufToB64(f.wrap.ct)){ bioArmed=false; renderBioGate(); return bioMsg(tr('bio.wrapMismatch')); }   // fremder/veränderter Passphrase-Slot: nie übernehmen, Blob behalten (Backup-Restore heilt)
    const gen=bioGen; doBio._busy=true; let secret=null;
    try{
      const r=await BIO.unlock({title:tr('bio.promptTitle'), subtitle:tr('bio.promptUnlock'), negative:tr('bio.usePass')});
      secret=b64Bytes(r&&r.secret); if(!secret||secret.length!==32) throw new Error('invalid');
      const key=await bioKey(secret); secret.fill(0);
      const dek=await unwrapDek(blob, key, f.kdf, false, 'bio');
      const obj=await decryptBody(f.body, dek, f.kdf); const v=sanitizeVault(obj);
      if(gen!==bioGen||DEK||pendingUnlock) return;                        // zwischendurch gesperrt oder anders entsperrt
      if(v.totp){ pendingUnlock={dek, kdf:f.kdf, wrap:f.wrap, vault:v}; }
      else { DEK=dek; KDF=f.kdf; WRAP=f.wrap; VAULT=v; failCount=0; lockedUntil=0; saveLockState(); }
    }catch(e){
      const c=e&&e.message; if(gen!==bioGen) return;
      if(c==='cancel') return; if(c==='lockout') return err('lock-err',tr('bio.lockout'));
      if(c==='reboot'){ bioDrop(true); setBioMarker(true); bioNeedsRearm=true; return bioMsg(tr('bio.afterReboot')); }
      bioDrop(c!=='invalidated'&&c!=='none'); return bioMsg(tr('bio.reset'));   // ungültiger Schlüssel, alter/fremder Blob, Manipulation
    }finally{ doBio._busy=false; if(secret) secret.fill(0); }
    afterGate();
  }
  // Einstellungen: aktivieren (Passphrase bestätigen → extrahierbarer DEK-Handle nur für das Verpacken) / deaktivieren
  async function bioEnable(){
    if(bioEnable._busy||!VAULT||!BIO) return; err('bio-err');
    if(changePass._busy) return err('bio-err',tr('bio.busy'));
    const btn=$('bio-btn-on'), orig=btn.textContent; bioEnable._busy=true; btn.disabled=true; btn.textContent=tr('busy.checking');   // Guard VOR dem ersten await
    try{
      let av; try{ av=await BIO.available(); }catch(_){ av={ok:false,reason:'error'}; }
      if(!av||!av.ok) return err('bio-err',tr(av&&av.reason==='noneEnrolled'?'bio.naEnrolled':(av&&(av.reason==='noHardware'||av.reason==='noStrong'))?'bio.naHardware':'bio.naNow'));
      const pass=$('bio-pass').value; if(!pass) return err('bio-err',tr('err.cpWrong'));
      let dekX; try{ const kek=await deriveKek(passBytes(pass), KDF); dekX=await unwrapDek(WRAP, kek, KDF, true); }catch(_){ return err('bio-err',tr('err.cpWrong')); }
      if(!VAULT||!DEK) return; $('bio-pass').value='';
      if(await bioArm(dekX, KDF, WRAP.ct, false)) toast(tr('bio.on'));
    }finally{ bioEnable._busy=false; btn.disabled=false; btn.textContent=orig; $('bio-pass').value=''; maskInputs('#bio-card'); renderSettings(); }
  }
  function bioDisable(){ if(!VAULT||!bioArmed||!confirm(tr('confirm.bioDisable'))) return; bioDrop(true); toast(tr('bio.off')); renderSettings(); }
  function lockNow(){ if(BIO&&(bioArmed||bioBlob())) setBioHold(true); bioAuto=false; lock(); }   // bewusst gesperrt: Riegel, nächster Start nur mit Passphrase

  /* ---------- Einstellungen ---------- */
  function renderSettings(){ if(!VAULT) return; const s=VAULT.settings; $('set-autolock').value=String(s.autolock); $('set-bglock').value=String(s.bgLock); $('set-clip').value=String(s.clipClear); syncCombos();
    const on=!!VAULT.totp; $('totp-off').classList.toggle('hidden',on||!!pendingSecret); $('totp-on').classList.toggle('hidden',!on); $('totp-setup').classList.toggle('hidden',!pendingSecret);
    const bc=$('bio-card'); if(bc){ bc.classList.toggle('hidden',!BIO); $('bio-off').classList.toggle('hidden',bioArmed); $('bio-on').classList.toggle('hidden',!bioArmed); }
    const soft=document.documentElement.getAttribute('data-theme')==='soft'; $('th-dark').classList.toggle('on',!soft); $('th-soft').classList.toggle('on',soft);
    $('about-line').textContent=tr('about',{v:APP_VERSION,m:Math.round(KDF.m/1024),t:KDF.t,p:KDF.p}); }
  function setSetting(key, v){ if(!VAULT) return; const n=Number(v); if(!SETTINGS_ALLOWED[key].includes(n)) return; const before=VAULT.settings[key]; VAULT.settings[key]=n; persist().then(()=>{ resetIdle(); }).catch(e=>{ if(e&&e.locked) return; if(VAULT){ VAULT.settings[key]=before; renderSettings(); } }); }
  const setAutolock=v=>setSetting('autolock',v), setBgLock=v=>setSetting('bgLock',v), setClipClear=v=>setSetting('clipClear',v);
  function theme(t){ try{ if(t==='soft'){ document.documentElement.setAttribute('data-theme','soft'); localStorage.setItem('alien-theme','soft'); } else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('alien-theme','dark'); } }catch(_){} renderSettings(); }
  async function changePass(){
    if(changePass._busy||!VAULT) return; err('cp-err');
    if(bioEnable._busy) return err('cp-err',tr('bio.busy'));                 // nicht parallel zum Fingerabdruck-Aktivieren (Audit run-3 #5)
    const cur=$('cp-cur').value, p1=$('cp1').value, p2=$('cp2').value;
    if(p1.length<12) return err('cp-err',tr('err.cpShort'));
    if(p1!==p2) return err('cp-err',tr('err.cpMismatch'));
    const btn=$('cp-btn'), orig=btn.textContent; changePass._busy=true; btn.disabled=true; btn.textContent=tr('busy.changing');
    const old={DEK,KDF,WRAP};
    try{
      try{ const kOld=await deriveKek(passBytes(cur), KDF); await unwrapDek(WRAP,kOld,KDF,false); }   // alte Passphrase real prüfen
      catch(_){ return err('cp-err',tr('err.cpWrong')); }
      const kdf={m:KDF.m,t:KDF.t,p:KDF.p,salt:rand(16)};
      const kNew=await deriveKek(passBytes(p1), kdf);
      const dekX=await newDek(); const wrap=await wrapDek(dekX,kNew,kdf); const dek=await unwrapDek(wrap,kNew,kdf,false);   // DEK-Rotation
      if(!VAULT||!DEK) return;                                   // zwischenzeitlich gesperrt → nichts wiederbeleben
      DEK=dek; KDF=kdf; WRAP=wrap;
      // Bei .locked NICHT zurückrollen: die Sitzung ist zwischendurch gesperrt worden, die alten Schlüssel wiederherzustellen
      // würde eine gesperrte Sitzung wiederbeleben (DEK/KDF/WRAP sind bereits genullt).
      try{ await persist(); }catch(e){ if(!(e&&e.locked)){ DEK=old.DEK; KDF=old.KDF; WRAP=old.WRAP; } return; }
      const hadBio=bioArmed||!!bioBlob()||bioMarker(); if(hadBio) bioDrop(true); bioGen++;   // neuer DEK/Salt: alter Slot passt nicht mehr → bewusst neu aktivieren; bioGen++ lässt auch einen laufenden enroll verfallen (Audit run-3 #5)
      $('cp-cur').value=$('cp1').value=$('cp2').value=''; $('cp-meter').textContent=''; toast(tr(hadBio?'toast.passChangedBio':'toast.passChanged')); renderSettings();
    }finally{ changePass._busy=false; btn.disabled=false; btn.textContent=orig; }
  }
  function wipeLocal(){ if(!confirm(tr('confirm.wipe'))) return; bioDrop(true); localStorage.removeItem(LS_KEY); lock(); }

  /* ---------- misc ---------- */
  function openHelp(){ show('help-overlay'); $('help-overlay').scrollTop=0; }
  function closeHelp(){ hide('help-overlay'); }
  function toggleLang(){ setLang(LANG==='de'?'en':'de'); }
  function relabel(){ if(!VAULT) return; $('add-title').textContent=editId?tr('add.titleEdit'):tr('add.titleNew'); relabelExtraRows(); renderList(); renderTrash(); renderSettings(); renderBackupMsg(); if(genValue) genNew(); if(currentId&&!$('detail-overlay').classList.contains('hidden')) openDetail(currentId); if(pendingProton&&pendingProton.kind==='pgp') $('proton-msg').textContent=tr('pt.needPass'); }
  function renderAll(){ renderList(); renderSettings(); renderBackupMsg(); }
  function kdfChanged(){ kdfTouched=true; }

  return {boot,doSetup,doUnlock,doTotp,cancelTotp,lock,tab,newEntry,saveEntry,cancelEdit,editCurrent,deleteCurrent,toggleFavCurrent,openDetail,closeDetail,toggleReveal,copyField,renderList,
    openTrash,renderTrash,restoreEntry,purgeEntry,emptyTrash,closeMenus,syncCombos,toggleCombo,chooseOpt,openCatMenu,toggleCatMenu,catInput,pickCat,
    setEntryType,changeEntryType,addExtraRow,removeExtraRow,setCatFilter,clearCatFilter,setGenMode,genChanged,genNew,genCopy,genUse,genIntoForm,fgGen,fgClose,suggestPass,exportVault,importVault,doImportVault,cancelImport,importCsv,pickFile,
    importProton,doImportProton,cancelProton,totpStart,totpConfirm,totpCancel,totpDisable,copySecret,copyOtpauth,saveQR,
    setAutolock,setBgLock,setClipClear,theme,changePass,wipeLocal,openHelp,closeHelp,toggleLang,relabel,meterSetup,meterCp,meterForm,kdfChanged,
    doBio,bioEnable,bioDisable,lockNow};
})();

/* ---------- Event-Delegation ----------
   CSP ohne 'unsafe-inline': KEINE Inline-Handler (auch nicht in dynamisch erzeugtem Markup) —
   alles läuft über data-Attribute + diese Listener. Die Funktion muss im App-Export stehen. */
document.addEventListener('click',ev=>{
  // Klick außerhalb eines Kombifelds schließt jedes offene Menü (es gibt keinen anderen globalen Schließ-Weg)
  if(!ev.target.closest('.combo')) App.closeMenus();
  const sp=ev.target.closest('[data-showpass]');
  if(sp){ const t=sp.checked?'text':'password'; sp.dataset.showpass.split(',').forEach(id=>{ const f=document.getElementById(id); if(f) f.type=t; }); return; }
  const elx=ev.target.closest('[data-action]'); if(!elx) return;
  const fn=App[elx.dataset.action];
  if(typeof fn==='function') fn(elx.dataset.arg, elx);
});
document.addEventListener('change',ev=>{
  const elx=ev.target.closest('[data-change]'); if(!elx) return;
  const a=elx.dataset.change; const fn=App[a]; if(typeof fn!=='function') return;
  if(a==='importCsv'||a==='importVault'||a==='importProton') return fn(ev);
  fn(elx.value, elx);
});
document.addEventListener('input',ev=>{
  const elx=ev.target.closest('[data-input]'); if(!elx) return;
  const fn=App[elx.dataset.input]; if(typeof fn==='function') fn(elx.value, elx);
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){ App.closeMenus(); App.closeDetail(); App.closeHelp(); return; }
  if(ev.key!=='Enter') return;
  const elx=ev.target.closest('[data-enter]'); if(!elx) return;
  const fn=App[elx.dataset.enter]; if(typeof fn==='function') fn();
});

window.addEventListener('DOMContentLoaded',()=>{
  const ok=window.crypto&&crypto.subtle&&typeof WebAssembly!=='undefined'&&window.hashwasm&&typeof hashwasm.argon2id==='function';
  if(!ok){ const c=document.querySelector('.container'); c.replaceChildren(); const d=document.createElement('div'); d.className='card warn'; d.textContent=tr('nocrypto'); c.appendChild(d); return; }
  const k=document.getElementById('setup-kdf'); if(k) k.addEventListener('change',App.kdfChanged);
  applyI18n();
  App.boot();
});
