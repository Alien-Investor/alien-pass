// Injiziert die Android-Härtung idempotent in das (regenerierbare) android/-Projekt.
// Läuft in build-apk.sh nach `npx cap sync` — überlebt damit auch ein frisches `npx cap add android`.
//   1) AndroidManifest: allowBackup=false (keine ADB-/Cloud-Backups der Tresor-Daten)
//   2) AndroidManifest: INTERNET-Permission ENTFERNEN (App kann nachweisbar nicht funken)
//   3) MainActivity: FLAG_SECURE (kein Screenshot/Recording, keine Recents-Vorschau) + WebView vom Android-Autofill-Framework
//      ausgenommen (v1.12: fremde Autofill-Dienste wie ein anderer Passwort-Manager sehen die Passphrase-Felder sonst und bieten
//      an, sie zu speichern; autocomplete="off" im HTML hält das nicht auf)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
let m = readFileSync(MANIFEST, 'utf8');
const before = m;
m = m.replace(/android:allowBackup="true"/g, 'android:allowBackup="false"');
m = m.replace(/^\s*<uses-permission android:name="android\.permission\.INTERNET"\s*\/>\s*$/gm, '');
// 1b) Backup-Regeln: allowBackup=false greift seit targetSdk 31 NICHT mehr für Gerät-zu-Gerät-Transfer/Seedvault
//     (IGNORE_ALLOW_BACKUP_IN_D2D) — ohne dataExtractionRules würde app_webview (localStorage-Tresor) mitkopiert.
const XML_DIR = 'android/app/src/main/res/xml';
const RULES = `<?xml version="1.0" encoding="utf-8"?>
<!-- Alien Pass: nichts sichern — weder Cloud-Backup noch Geraet-zu-Geraet-Transfer (auch nicht verschluesselt). -->
<data-extraction-rules>
    <cloud-backup disableIfNoEncryptionCapabilities="true">
        <exclude domain="root"/><exclude domain="file"/><exclude domain="database"/><exclude domain="sharedpref"/><exclude domain="external"/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="root"/><exclude domain="file"/><exclude domain="database"/><exclude domain="sharedpref"/><exclude domain="external"/>
    </device-transfer>
</data-extraction-rules>
`;
if (!existsSync(XML_DIR)) mkdirSync(XML_DIR, { recursive: true });
writeFileSync(XML_DIR + '/data_extraction_rules.xml', RULES);
if (!/android:dataExtractionRules=/.test(m)) m = m.replace(/<application\b/, '<application android:dataExtractionRules="@xml/data_extraction_rules"');
// 1c) Einzige erlaubte Berechtigung: USE_BIOMETRIC (Fingerabdruck-Entsperren, v1.2) — normale Permission, kein Netz, kein Dateizugriff.
//     build-apk.sh prüft an der fertigen APK, dass NUR USE_BIOMETRIC (+ das von androidx.biometric gemergte USE_FINGERPRINT für API < 28) vorkommt.
if (!/android\.permission\.USE_BIOMETRIC/.test(m)) m = m.replace(/<\/manifest>\s*$/, '    <uses-permission android:name="android.permission.USE_BIOMETRIC" />\n</manifest>\n');
// USE_FINGERPRINT bringt androidx.biometric ohne maxSdkVersion mit; wir ersetzen es per tools:node="replace" durch die Variante bis API 27
// (nur dort nutzt die Bibliothek FingerprintManager) — so trägt die APK auf aktuellen Androids nur USE_BIOMETRIC (Audit run-3 #7).
if (!/xmlns:tools=/.test(m)) m = m.replace(/<manifest\b/, '<manifest xmlns:tools="http://schemas.android.com/tools"');
if (!/android\.permission\.USE_FINGERPRINT/.test(m)) m = m.replace(/<\/manifest>\s*$/, '    <uses-permission android:name="android.permission.USE_FINGERPRINT" android:maxSdkVersion="27" tools:node="replace" />\n</manifest>\n');
if (m !== before) writeFileSync(MANIFEST, m);
// Invarianten IMMER prüfen (nicht nur im No-op-Zweig) — sonst könnte ein gedriftetes Template
// still un-gehärtet durchrutschen: fehlt allowBackup ganz, defaultet Android auf true.
if (!/android:allowBackup="false"/.test(m) || /android\.permission\.INTERNET/.test(m) || !/android:dataExtractionRules="@xml\/data_extraction_rules"/.test(m) || !existsSync(XML_DIR + '/data_extraction_rules.xml') || !/android\.permission\.USE_BIOMETRIC/.test(m)) {
  console.error('FEHLER: Manifest-Härtung unvollständig (allowBackup!=false, INTERNET vorhanden, dataExtractionRules oder USE_BIOMETRIC fehlen) — Build abgebrochen!');
  process.exit(1);
}
console.log(m !== before ? 'Manifest gehärtet (allowBackup=false, INTERNET entfernt, dataExtractionRules gesetzt, USE_BIOMETRIC).' : 'Manifest bereits gehärtet.');

// 2) Gradle: androidx.biometric für BiometricPrompt (System-Dialog + Keystore-Bindung). Einzige zusätzliche Abhängigkeit, idempotent.
const GRADLE = 'android/app/build.gradle';
const BIO_DEP = '    implementation "androidx.biometric:biometric:1.1.0"   // Alien Pass: Fingerabdruck-Entsperren (patch-hardening.mjs)\n';
let g = readFileSync(GRADLE, 'utf8');
if (!g.includes('androidx.biometric:biometric')) { g = g.replace(/^dependencies \{\n/m, 'dependencies {\n' + BIO_DEP); writeFileSync(GRADLE, g); console.log('build.gradle: androidx.biometric ergänzt.'); }
if (!readFileSync(GRADLE, 'utf8').includes('androidx.biometric:biometric:1.1.0')) { console.error('FEHLER: androidx.biometric fehlt in build.gradle — Build abgebrochen!'); process.exit(1); }

//   4) SecureClip-Plugin: Zwischenablage nativ schreiben/leeren, Inhalt als „sensibel“ markiert (keine System-Vorschau, API 33+)
const JAVA_DIR = 'android/app/src/main/java/org/alieninvestor/pass';
const MAIN = JAVA_DIR + '/MainActivity.java';
const MAIN_SRC = `package org.alieninvestor.pass;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Kein Android-Autofill, zweiter Hebel (v1.13): Chromiums WebView-Autofill holt sich den AutofillManager über den Context der
    // WebView — das ist diese Activity. Bekommt es keinen, legt es keine Autofill-Sitzung an und meldet kein Feld an den
    // systemweiten Dienst. setImportantForAutofill allein reichte nicht: Chromiums Provider prüft das Flag nicht, und der
    // Framework-Pfad für virtuelle Felder fragt die Wichtigkeit nicht ab (Gerätetest GrapheneOS 26.09.2026, Proton Pass bot sich
    // in v1.12 weiter an). Eigene Views nutzen den Manager nicht; ohne ihn verhalten sie sich wie ohne Autofill-Dienst.
    @Override
    public Object getSystemService(String name) {
        if ("autofill".equals(name)) return null;   // Dienstname des AutofillManager (API 26+, Konstante ist nicht öffentlich)
        return super.getSystemService(name);
    }

    // Gegenstück zum Hebel oben (v1.15, Diff-Review): Activity.restoreAutofillSaveUi() ruft getAutofillManager() OHNE Null-Prüfung, ausgelöst
    // allein durch diese Intent-Extras (finish/onBackPressed/onStop, Android 9+). Jede App könnte Alien Pass mit ihnen starten und beim Schließen
    // abstürzen lassen (NullPointerException) — deshalb vor super.onCreate/onNewIntent entfernen.
    private static void dropAutofillRestore(Intent i) {
        if (i == null) return;
        i.removeExtra("android.view.autofill.extra.RESTORE_SESSION_TOKEN");
        i.removeExtra("android.view.autofill.extra.RESTORE_CROSS_ACTIVITY");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        dropAutofillRestore(intent);
        super.onNewIntent(intent);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        dropAutofillRestore(getIntent());
        registerPlugin(SecureClipPlugin.class);
        registerPlugin(BiometricPlugin.class);
        super.onCreate(savedInstanceState);
        // Kein Screenshot/Screen-Recording, keine Vorschau im App-Switcher (Recents)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        // Kein Android-Autofill (API 26+): Die WebView meldet sonst jedes Passwortfeld an den systemweiten Autofill-Dienst — eine
        // fremde App, die den Inhalt zum Speichern anbieten könnte. autocomplete="off" im HTML hält das nicht auf. Die App hat
        // bewusst keinen eigenen Autofill-Dienst, darum braucht sie das Framework auch nicht.
        if (Build.VERSION.SDK_INT >= 26) {
            View webView = getBridge().getWebView();
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        }
    }
}
`;
const CLIP = JAVA_DIR + '/SecureClipPlugin.java';
const CLIP_SRC = `package org.alieninvestor.pass;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.os.PersistableBundle;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Zwischenablage ohne System-Vorschau: EXTRA_IS_SENSITIVE (Android 13+) maskiert den Inhalt im Clipboard-Overlay.
 *  Kein Lesen der Zwischenablage, keine weiteren Berechtigungen. */
@CapacitorPlugin(name = "SecureClip")
public class SecureClipPlugin extends Plugin {
    private ClipboardManager cm() { return (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE); }

    @PluginMethod
    public void write(PluginCall call) {
        String text = call.getString("text", "");
        try {
            ClipData clip = ClipData.newPlainText("", text);
            if (Build.VERSION.SDK_INT >= 33) {
                PersistableBundle extras = new PersistableBundle();
                extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
                clip.getDescription().setExtras(extras);
            }
            cm().setPrimaryClip(clip);
            call.resolve();
        } catch (Exception e) { call.reject("clip"); }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 28) cm().clearPrimaryClip();
            else cm().setPrimaryClip(ClipData.newPlainText("", " "));
            call.resolve();
        } catch (Exception e) { call.reject("clip"); }
    }
}
`;
//   5) Biometric-Plugin (v1.2): verwahrt 32 Byte Zufall aus dem JS im Android-Keystore, freigegeben nur nach starker Biometrie mit Bestätigung
//      (Android kennt keine „nur Fingerabdruck“-Bindung; ein Fingerabdrucksensor wird vorausgesetzt). Der Keystore-Schlüssel ist pro Nutzung
//      gebunden, wird bei neuem Fingerabdruck ungültig und liegt in der StrongBox, wenn vorhanden. Nach einem Neustart (Boot-Kennung, als AAD
//      mitauthentisiert) meldet status() „reboot“ und löscht Datei + Schlüssel → Passphrase-Pflicht (Regel im Code, keine Krypto-Garantie).
const BIO = JAVA_DIR + '/BiometricPlugin.java';
const BIO_SRC = `package org.alieninvestor.pass;

import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Fingerabdruck-Slot: 32 Byte Zufall (vom JS erzeugt, dort als Wrap-Schlüssel für den DEK benutzt) liegen AES-GCM-verschlüsselt
 *  unter einem Android-Keystore-Schlüssel, der nur nach einem starken Fingerabdruck nutzbar ist (Freigabe pro Nutzung, ungültig bei
 *  neu eingerichtetem Fingerabdruck, StrongBox falls vorhanden; Bestätigung im Prompt verlangt, Fingerabdrucksensor vorausgesetzt).
 *  Die Boot-Kennung ist als GCM-AAD mitauthentisiert; nach einem Neustart meldet status() "reboot" und löscht Datei + Schlüssel.
 *  Ausnahme seit v1.8: Wurde der Slot mit keep=true angelegt (Kästchen beim Aktivieren, ab Werk aus), gilt er über den Neustart hinaus;
 *  dann lautet die AAD boot+"|keep" statt boot — die Wahl ist damit mitauthentisiert und nur durch Neu-Aktivieren änderbar.
 *  Liest keine fremden Daten, braucht nur USE_BIOMETRIC (+ USE_FINGERPRINT bis API 27).
 *  Fehlercodes an JS: cancel | lockout | reboot | invalidated | tampered | none | unavailable | error. */
@CapacitorPlugin(name = "Biometric")
public class BiometricPlugin extends Plugin {
    private static final String ALIAS = "alien-pass-bio";
    /** Kanarien-Schlüssel (Tresor-Audit run-5 #1, identisch hier): gleiche Flags wie der Slot-Schlüssel, wird NIE benutzt und beim Neustart
     *  NICHT gelöscht. Er entsteht nur beim bewussten Aktivieren und wird ungültig, sobald ein Fingerabdruck neu registriert wird — so bleibt
     *  der Nachweis einer neuen Registrierung über den Neustart erhalten, obwohl der Slot selbst dort gelöscht wird. */
    private static final String CANARY = "alien-pass-bio-canary";
    private static final String FILE = "alien-pass-bio.json";
    private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_STRONG;

    private File file() { return new File(getContext().getFilesDir(), FILE); }

    /** Boot-Kennung, immer in der GCM-AAD des Slots (Audit run-8 #4): zuerst Settings.Global.BOOT_COUNT (API 24+, keine Berechtigung,
     *  monoton, unabhängig von /proc und von der Uhr) als "b:<n>", ersatzweise /proc boot_id ("id:"), zuletzt die Boot-Zeit in Sekunden
     *  ("t:", Toleranz beim Vergleich). Slots von v1.7 tragen "id:"/"t:" und melden nach dem Update einmal reboot → Neu-Bewaffnung nach der Passphrase. */
    private String bootTag() {
        try { int n = Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.BOOT_COUNT); if (n > 0) return "b:" + n; } catch (Exception ignored) {}
        try (BufferedReader r = new BufferedReader(new FileReader("/proc/sys/kernel/random/boot_id"))) {
            String s = r.readLine();
            if (s != null && s.trim().length() >= 8) return "id:" + s.trim();
        } catch (Exception ignored) {}
        return "t:" + ((System.currentTimeMillis() - SystemClock.elapsedRealtime()) / 1000L);
    }
    private boolean sameBoot(String stored) {
        if (stored == null || stored.length() < 3) return false;
        String now = bootTag();
        if (!stored.startsWith("t:") || !now.startsWith("t:")) return stored.equals(now);
        try { return Math.abs(Long.parseLong(stored.substring(2)) - Long.parseLong(now.substring(2))) <= 120; }
        catch (Exception e) { return false; }
    }

    private JSONObject readState() {
        File f = file();
        if (!f.exists()) return null;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder(); String line;
            while ((line = r.readLine()) != null) sb.append(line);
            JSONObject o = new JSONObject(sb.toString());
            if (!o.has("iv") || !o.has("ct") || !o.has("boot")) return null;
            return o;
        } catch (Exception e) { return null; }
    }
    private void writeState(JSONObject o) throws Exception {
        try (FileOutputStream out = new FileOutputStream(file())) { out.write(o.toString().getBytes(StandardCharsets.UTF_8)); }
    }
    private void wipe() {
        try { file().delete(); } catch (Exception ignored) {}
        deleteKey(ALIAS);
    }
    /** Slot UND Kanarie verwerfen: bewusstes Deaktivieren, ungültige Registrierung. */
    private void wipeAll() { wipe(); deleteKey(CANARY); }
    private static void deleteKey(String alias) {
        try { KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null); if (ks.containsAlias(alias)) ks.deleteEntry(alias); } catch (Exception ignored) {}
    }
    /** ok | invalidated (seit dem Anlegen wurde ein Fingerabdruck registriert) | missing | error (Keystore vorübergehend) */
    private static String canaryState() {
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
            SecretKey k = (SecretKey) ks.getKey(CANARY, null);
            if (k == null) return "missing";
            Cipher.getInstance("AES/GCM/NoPadding").init(Cipher.ENCRYPT_MODE, k);   // nur init: prüft die Gültigkeit, braucht keinen Fingerabdruck
            return "ok";
        } catch (KeyPermanentlyInvalidatedException e) { return "invalidated"; }
        catch (Exception e) { return "error"; }
    }

    private String availability() {
        if (Build.VERSION.SDK_INT < 23) return "noHardware";
        // Fingerabdrucksensor vorausgesetzt (Audit run-3 #2): der Keystore-Schlüssel gilt zwar für jede starke Biometrie, aber ein reines
        // Gesichtserkennungs-Gerät darf den „Fingerabdruck“-Slot nicht anlegen
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)) return "noHardware";
        switch (BiometricManager.from(getContext()).canAuthenticate(AUTH)) {
            case BiometricManager.BIOMETRIC_SUCCESS: return "ok";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE: return "noHardware";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED: return "noneEnrolled";
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED: return "noStrong";
            default: return "unavailable";
        }
    }

    private void createKey() throws Exception { createKey(ALIAS); }
    private void createKey(String alias) throws Exception {
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        boolean strongBox = Build.VERSION.SDK_INT >= 28 && getContext().getPackageManager().hasSystemFeature("android.hardware.strongbox_keystore");
        for (int attempt = 0; attempt < 2; attempt++) {
            KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256)
                .setRandomizedEncryptionRequired(true).setUserAuthenticationRequired(true);
            if (Build.VERSION.SDK_INT >= 24) b.setInvalidatedByBiometricEnrollment(true);
            if (Build.VERSION.SDK_INT >= 28 && strongBox && attempt == 0) b.setIsStrongBoxBacked(true);
            if (Build.VERSION.SDK_INT >= 30) b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
            try { kg.init(b.build()); kg.generateKey(); return; }
            catch (Exception e) { if (attempt == 0 && strongBox) continue; throw e; }   // StrongBox nicht nutzbar → TEE-Schlüssel
        }
    }
    private Cipher cipherFor(int mode, byte[] iv) throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        SecretKey k = (SecretKey) ks.getKey(ALIAS, null);
        if (k == null) throw new IllegalStateException("nokey");
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        if (mode == Cipher.ENCRYPT_MODE) c.init(mode, k); else c.init(mode, k, new GCMParameterSpec(128, iv));
        return c;
    }

    @PluginMethod
    public void available(PluginCall call) {
        String a = availability(); JSObject o = new JSObject(); o.put("ok", "ok".equals(a)); o.put("reason", a); call.resolve(o);
    }

    /** enabled = Slot vorhanden, gleicher Boot (oder keep gesetzt), Schlüssel gültig. reason: ok | none | reboot | invalidated | unavailable;
     *  bei enabled zusätzlich keep = gilt der Slot über einen Neustart hinaus (nur zur Anzeige im JS).
     *  Neustart löscht Datei + Schlüssel SOFORT (Audit run-3 #6; das JS merkt sich nur einen Marker und bewaffnet nach der Passphrase neu);
     *  ein ungültiger Schlüssel (neuer Fingerabdruck) wird gelöscht; ein vorübergehender Keystore-Fehler löscht NICHT (unavailable). */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject o = new JSObject();
        // Neue Registrierung schlägt Neustart (Tresor-Audit run-5 #1): Kanarie VOR der Boot-Prüfung und auch ohne Slot-Datei prüfen
        if ("invalidated".equals(canaryState())) { wipeAll(); o.put("enabled", false); o.put("reason", "invalidated"); call.resolve(o); return; }
        JSONObject st = readState();
        if (st == null) { o.put("enabled", false); o.put("reason", "none"); call.resolve(o); return; }
        final boolean keep = st.optBoolean("keep", false);   // v1.8: beim Aktivieren gewählt, in der AAD mitauthentisiert — der Neustart-Zwang entfällt nur dann
        if (!keep && !sameBoot(st.optString("boot", null))) { wipe(); o.put("enabled", false); o.put("reason", "reboot"); call.resolve(o); return; }
        try { cipherFor(Cipher.DECRYPT_MODE, Base64.decode(st.getString("iv"), Base64.NO_WRAP)); }
        catch (KeyPermanentlyInvalidatedException e) { wipe(); o.put("enabled", false); o.put("reason", "invalidated"); call.resolve(o); return; }
        catch (IllegalStateException e) { wipe(); o.put("enabled", false); o.put("reason", "none"); call.resolve(o); return; }   // Datei ohne Schlüssel
        catch (Exception e) { o.put("enabled", false); o.put("reason", "unavailable"); call.resolve(o); return; }
        // Übergang von ≤ v1.6 (Review v1.6.1 H2): Slot-Schlüssel gültig = seit dem Einrichten kein Finger registriert → eine jetzt angelegte
        // Kanarie ist gleichwertig. Wer die App vor dem nächsten Neustart öffnet, muss nach dem Update nichts neu aktivieren.
        if ("missing".equals(canaryState())) { try { createKey(CANARY); } catch (Exception ignored) {} }
        o.put("enabled", true); o.put("reason", "ok"); o.put("keep", keep); call.resolve(o);
    }

    @PluginMethod
    public void disable(PluginCall call) { wipeAll(); call.resolve(); }

    /** Frischen Keystore-Schlüssel anlegen, Fingerabdruck abfragen, Zufall verschlüsselt ablegen. Alter Slot wird vorher verworfen. */
    @PluginMethod
    public void enroll(PluginCall call) {
        byte[] secret;
        try { secret = Base64.decode(call.getString("secret", ""), Base64.NO_WRAP); } catch (Exception e) { secret = null; }
        if (secret == null || secret.length != 32) { call.reject("invalid"); return; }
        if (!"ok".equals(availability())) { call.reject("unavailable"); return; }
        final boolean rearm = Boolean.TRUE.equals(call.getBoolean("rearm", false));
        // v1.8: „Fingerabdruck auch nach Neustart“ (Kästchen beim Aktivieren, ab Werk aus). Eine automatische Neu-Einrichtung nach dem
        // Neustart gibt es nur für Slots OHNE keep — deshalb schließen sich rearm und keep aus.
        final boolean keep = Boolean.TRUE.equals(call.getBoolean("keep", false)) && !rearm;
        if (rearm) {
            // Automatische Neu-Einrichtung nach Neustart NUR mit gültiger Kanarie: sonst wurde seit dem bewussten Aktivieren ein
            // Fingerabdruck registriert (oder es gab nie ein bewusstes Aktivieren) → der Nutzer muss es in den Einstellungen selbst tun.
            String cs = canaryState();
            // missing = Slot aus der Zeit vor der Kanarie (Update von ≤ v1.6) oder nie bewusst aktiviert: ebenfalls nichts einrichten,
            // aber eigener Code — kein Alarm „fremder Finger“, nur die Bitte, bewusst neu zu aktivieren (Alien-Pass-Besonderheit)
            if (!"ok".equals(cs)) { if ("error".equals(cs)) { call.reject("unavailable"); } else { wipeAll(); call.reject("missing".equals(cs) ? "nocanary" : "invalidated"); } return; }
        }
        wipe();
        final Cipher c;
        try { if (!rearm) { deleteKey(CANARY); createKey(CANARY); } createKey(); c = cipherFor(Cipher.ENCRYPT_MODE, null); }   // bewusstes Aktivieren: frische Kanarie
        catch (Exception e) { wipeAll(); call.reject("error"); return; }
        final byte[] sec = secret;
        final String boot = bootTag();
        final String ad = keep ? boot + "|keep" : boot;                           // ohne keep exakt wie bisher → Slots von ≤ v1.7 laufen unverändert weiter
        prompt(call, c, cipher -> {
            aad(cipher, ad);                                                      // Boot-Kennung (+ keep-Wahl) mitauthentisiert (Audit run-3, v1.8)
            byte[] ct = cipher.doFinal(sec); Arrays.fill(sec, (byte) 0);
            JSONObject st = new JSONObject();
            st.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
            st.put("ct", Base64.encodeToString(ct, Base64.NO_WRAP));
            st.put("boot", boot);
            if (keep) st.put("keep", true);
            writeState(st);
            return new JSObject();
        }, true);
    }

    /** Fingerabdruck abfragen, Zufall entschlüsselt zurückgeben (JS packt damit den DEK aus und nullt die Bytes). */
    @PluginMethod
    public void unlock(PluginCall call) {
        if ("invalidated".equals(canaryState())) { wipeAll(); call.reject("invalidated"); return; }   // Tresor-Audit run-5 #1
        JSONObject st = readState();
        if (st == null) { call.reject("none"); return; }
        final boolean keep = st.optBoolean("keep", false);   // v1.8: nur ein mit keep angelegter Slot überlebt den Neustart
        if (!keep && !sameBoot(st.optString("boot", null))) { wipe(); call.reject("reboot"); return; }
        final byte[] ct; final Cipher c;
        try { ct = Base64.decode(st.getString("ct"), Base64.NO_WRAP); c = cipherFor(Cipher.DECRYPT_MODE, Base64.decode(st.getString("iv"), Base64.NO_WRAP)); }
        catch (KeyPermanentlyInvalidatedException e) { wipe(); call.reject("invalidated"); return; }
        catch (Exception e) { wipe(); call.reject("error"); return; }
        final String boot = st.optString("boot", "");
        final String ad = keep ? boot + "|keep" : boot;
        prompt(call, c, cipher -> {
            aad(cipher, ad);                                                      // gleiche AAD wie beim Anlegen; Klartext-Feld (boot ODER keep) manipuliert → GCM-Fehler
            byte[] pt = cipher.doFinal(ct);
            String s = Base64.encodeToString(pt, Base64.NO_WRAP); Arrays.fill(pt, (byte) 0);
            JSObject o = new JSObject(); o.put("secret", s); return o;
        }, false);
    }

    /** Boot-Kennung (+ keep) als GCM-AAD, IMMER — auch die Zeit-Rückfallform: unlock() nimmt den GESPEICHERTEN Wert, die Toleranz gilt nur
     *  in sameBoot, darum bricht die AAD nie an der Abweichung. Ohne AAD wäre keep im Klartext frei setzbar (Audit run-8 #4). */
    private static void aad(Cipher c, String boot) {
        if (boot != null && !boot.isEmpty()) c.updateAAD(boot.getBytes(StandardCharsets.UTF_8));
    }

    private interface Work { JSObject run(Cipher c) throws Exception; }
    private void prompt(final PluginCall call, final Cipher c, final Work work, final boolean wipeOnFail) {
        final FragmentActivity act = getActivity();
        if (act == null) { if (wipeOnFail) wipe(); call.reject("error"); return; }
        act.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo.Builder pb = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(call.getString("title", "Alien Pass")).setNegativeButtonText(call.getString("negative", "Cancel"))
                    .setAllowedAuthenticators(AUTH).setConfirmationRequired(true);   // passive Biometrie (Gesicht) braucht einen bewussten Tipp; Fingerabdruck unberührt (Audit run-3 #2)
                String sub = call.getString("subtitle", "");
                if (sub != null && !sub.isEmpty()) pb.setSubtitle(sub);
                BiometricPrompt bp = new BiometricPrompt(act, ContextCompat.getMainExecutor(act), new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                        try {
                            Cipher cc = r.getCryptoObject() != null ? r.getCryptoObject().getCipher() : null;
                            if (cc == null) throw new IllegalStateException("nocrypto");
                            call.resolve(work.run(cc));
                        } catch (javax.crypto.AEADBadTagException e) { call.reject("tampered"); }   // Klartext-Feld (boot/keep) der Slot-Datei verändert: nie „vorübergehend“, kein automatisches Wipe (Audit run-8 #16)
                        catch (Exception e) { if (wipeOnFail) wipe(); call.reject("error"); }
                    }
                    @Override public void onAuthenticationError(int code, CharSequence msg) {
                        if (wipeOnFail) wipe();
                        boolean cancel = code == BiometricPrompt.ERROR_USER_CANCELED || code == BiometricPrompt.ERROR_NEGATIVE_BUTTON || code == BiometricPrompt.ERROR_CANCELED;
                        boolean lockout = code == BiometricPrompt.ERROR_LOCKOUT || code == BiometricPrompt.ERROR_LOCKOUT_PERMANENT;
                        call.reject(cancel ? "cancel" : lockout ? "lockout" : "error");
                    }
                    // onAuthenticationFailed: einzelner Fehlversuch — der Prompt bleibt offen, das System zählt und sperrt selbst
                });
                bp.authenticate(pb.build(), new BiometricPrompt.CryptoObject(c));
            } catch (Exception e) { if (wipeOnFail) wipe(); call.reject("error"); }
        });
    }
}
`;
//   6) Tastatur-Bitte (v1.22, Vorlage Alien Notes 1.13; Entscheidung Nutzer 13.10.2026, alle drei Apps, ohne Schalter): jedes Eingabefeld bittet die Tastatur-App,
//      nichts daraus zu lernen (IME_FLAG_NO_PERSONALIZED_LEARNING, API 26; Gboard zeigt dann sein Inkognito-Symbol). Nur eine BITTE — mitlesen kann
//      die Tastatur trotzdem, und nicht jede beachtet sie. Chromium setzt das Flag nur für Inkognito-Profile, eine WebView ist nie eines; darum
//      ODER-t eine eigene Unterklasse es NACH super in die EditorInfo (vorher gesetzt würde es überschrieben). Eingehängt über ein App-Layout
//      gleichen Namens, das das Bibliotheks-Layout bridge_layout_main ersetzt (BridgeActivity.setContentView; Bridge sucht R.id.webview und
//      prüft instanceof CapacitorWebView → setBridge bleibt gültig). Die Konstante setzt javac als Zahl ein: unter API 26 ignoriert die Tastatur das Bit.
const WV = JAVA_DIR + '/NoLearnWebView.java';
const WV_SRC = `package org.alieninvestor.pass;

import android.content.Context;
import android.util.AttributeSet;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import com.getcapacitor.CapacitorWebView;

// Alien Pass (v1.22): bittet die Tastatur-App, aus keinem Feld der App zu lernen (patch-hardening.mjs, Abschnitt 6).
public class NoLearnWebView extends CapacitorWebView {

    public NoLearnWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        InputConnection ic = super.onCreateInputConnection(outAttrs);
        outAttrs.imeOptions |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;
        return ic;
    }
}
`;
const LAYOUT_DIR = 'android/app/src/main/res/layout';
const LAYOUT = LAYOUT_DIR + '/bridge_layout_main.xml';
const LAYOUT_SRC = `<?xml version="1.0" encoding="utf-8"?>
<!-- Alien Pass (v1.22, patch-hardening.mjs): ersetzt das gleichnamige Layout aus Capacitor; einzige Abweichung ist die eigene WebView-Klasse (Tastatur-Bitte). -->
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context="com.getcapacitor.BridgeActivity"
    >

    <org.alieninvestor.pass.NoLearnWebView
        android:id="@+id/webview"
        android:layout_width="fill_parent"
        android:layout_height="fill_parent" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>
`;
if (!existsSync(LAYOUT_DIR)) mkdirSync(LAYOUT_DIR, { recursive: true });

let changed = false;
for (const [file, src, label] of [[MAIN, MAIN_SRC, 'MainActivity (FLAG_SECURE + kein Autofill + Plugin-Registrierung)'], [CLIP, CLIP_SRC, 'SecureClipPlugin'], [BIO, BIO_SRC, 'BiometricPlugin'], [WV, WV_SRC, 'NoLearnWebView (Tastatur-Bitte)'], [LAYOUT, LAYOUT_SRC, 'bridge_layout_main.xml (eigene WebView)']]) {
  const cur = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (cur !== src) { writeFileSync(file, src); changed = true; console.log(label + ': geschrieben.'); }
}
if (!changed) console.log('MainActivity + SecureClipPlugin + BiometricPlugin + NoLearnWebView + Layout bereits aktuell.');
// v1.23 (17.10.2026, Querfund Sachwert-Tresor v3.11 run-11 b-1 + Alien Notes v1.14 run-12 c-1/c2-1/c3-1/c3-2, gemessen run-13 B1/B3–B6): onCreate-Rumpf,
// dropAutofillRestore, Fingerabdruck-Schlüssel, Abfrage-Dialog und SecureClip WÖRTLICH als zweite, unabhängige Kopie (nicht aus MAIN_SRC/BIO_SRC/CLIP_SRC
// abgeleitet) — bis v1.22 genügte das bloße Wort: ein `//` vor addFlags/registerPlugin, clearFlags danach, if/return davor, eine umgedrehte Null-Prüfung, ein
// auskommentiertes setUserAuthenticationRequired(true), Frist 300 s + Geräte-PIN, ein zweites setConfirmationRequired(false) oder eine gelöschte
// EXTRA_IS_SENSITIVE-Zeile (das Wort steht auch im Klassenkommentar) blieben grün (run-13 f1–f7, d1, k1–k4, p1/p2, w1, c1, r1). Abweichung zu Notes: zwei
// Plugins (SecureClip vor Biometric) und kein Laufzeit-Schalter (kein SecureScreen/VaultStore) — clearFlags/setFlags/setAttributes in KEINER Datei.
const ONCREATE_SRC = "    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        dropAutofillRestore(getIntent());\n        registerPlugin(SecureClipPlugin.class);\n        registerPlugin(BiometricPlugin.class);\n        super.onCreate(savedInstanceState);\n        // Kein Screenshot/Screen-Recording, keine Vorschau im App-Switcher (Recents)\n        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);\n        // Kein Android-Autofill (API 26+): Die WebView meldet sonst jedes Passwortfeld an den systemweiten Autofill-Dienst — eine\n        // fremde App, die den Inhalt zum Speichern anbieten könnte. autocomplete=\"off\" im HTML hält das nicht auf. Die App hat\n        // bewusst keinen eigenen Autofill-Dienst, darum braucht sie das Framework auch nicht.\n        if (Build.VERSION.SDK_INT >= 26) {\n            View webView = getBridge().getWebView();\n            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);\n        }\n    }\n";
const DROP_SRC = "    private static void dropAutofillRestore(Intent i) {\n        if (i == null) return;\n        i.removeExtra(\"android.view.autofill.extra.RESTORE_SESSION_TOKEN\");\n        i.removeExtra(\"android.view.autofill.extra.RESTORE_CROSS_ACTIVITY\");\n    }\n";
const CREATEKEY_SRC = "    private void createKey(String alias) throws Exception {\n        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, \"AndroidKeyStore\");\n        boolean strongBox = Build.VERSION.SDK_INT >= 28 && getContext().getPackageManager().hasSystemFeature(\"android.hardware.strongbox_keystore\");\n        for (int attempt = 0; attempt < 2; attempt++) {\n            KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)\n                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256)\n                .setRandomizedEncryptionRequired(true).setUserAuthenticationRequired(true);\n            if (Build.VERSION.SDK_INT >= 24) b.setInvalidatedByBiometricEnrollment(true);\n            if (Build.VERSION.SDK_INT >= 28 && strongBox && attempt == 0) b.setIsStrongBoxBacked(true);\n            if (Build.VERSION.SDK_INT >= 30) b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);\n            try { kg.init(b.build()); kg.generateKey(); return; }\n            catch (Exception e) { if (attempt == 0 && strongBox) continue; throw e; }   // StrongBox nicht nutzbar → TEE-Schlüssel\n        }\n    }\n";
const PROMPT_SRC = "                BiometricPrompt.PromptInfo.Builder pb = new BiometricPrompt.PromptInfo.Builder()\n                    .setTitle(call.getString(\"title\", \"Alien Pass\")).setNegativeButtonText(call.getString(\"negative\", \"Cancel\"))\n                    .setAllowedAuthenticators(AUTH).setConfirmationRequired(true);   // passive Biometrie (Gesicht) braucht einen bewussten Tipp; Fingerabdruck unberührt (Audit run-3 #2)\n";
const CLIPWRITE_SRC = "    @PluginMethod\n    public void write(PluginCall call) {\n        String text = call.getString(\"text\", \"\");\n        try {\n            ClipData clip = ClipData.newPlainText(\"\", text);\n            if (Build.VERSION.SDK_INT >= 33) {\n                PersistableBundle extras = new PersistableBundle();\n                extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);\n                clip.getDescription().setExtras(extras);\n            }\n            cm().setPrimaryClip(clip);\n            call.resolve();\n        } catch (Exception e) { call.reject(\"clip\"); }\n    }\n";
const CLEAR_SRC = "    @PluginMethod\n    public void clear(PluginCall call) {\n        try {\n            if (Build.VERSION.SDK_INT >= 28) cm().clearPrimaryClip();\n            else cm().setPrimaryClip(ClipData.newPlainText(\"\", \" \"));\n            call.resolve();\n        } catch (Exception e) { call.reject(\"clip\"); }\n    }\n";
// Kommentare in EINEM Durchlauf von links nach rechts wie javac (v1.23, Querfund Notes run-12 c3-3, run-13 B7 s1/s2): bis v1.22 prüfte jb den Rohtext, schon ein
// einfaches `//` vor der sameBoot-Zeile blieb grün; erst Block-, dann Zeilenkommentare zu entfernen läse `//*…*/ code` falsch. Zeichenketten und Zeichen bleiben stehen.
// Einzige Abweichung von javac: noComments kennt nur LF als Zeilenende, javac auch ein einzelnes CR (JLS 3.4) — `// x<CR> code` verbärge Code. Darum ist
// rohes CR in allen vier Java-Dateien verboten (unten, run-13 d-5), statt noComments umzubauen.
const noComments = (t) => t.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m[0] === '/' ? '' : m));
const jm = readFileSync(MAIN, 'utf8'), jb = readFileSync(BIO, 'utf8'), jc = readFileSync(CLIP, 'utf8'), jwr = readFileSync(WV, 'utf8');
const jbc = noComments(jb), jcc = noComments(jc);
if (!jm.includes('FLAG_SECURE') || !jm.includes('registerPlugin(SecureClipPlugin.class)') || !jm.includes('registerPlugin(BiometricPlugin.class)')
  || !jm.includes('setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS)')
  || !jm.includes('if ("autofill".equals(name)) return null;')
  || !jm.includes('dropAutofillRestore(getIntent());') || !jm.includes('dropAutofillRestore(intent);') || !jm.includes('i.removeExtra("android.view.autofill.extra.RESTORE_SESSION_TOKEN");')
  || /\/\/[^\n]*if \("autofill"\.equals/.test(jm) || !jm.includes('return super.getSystemService(name);')
  // v1.22 (Release-Audit run-12 b-2, Rückport Alien Notes): kein auskommentierter dropAutofillRestore-Aufruf, keine Blockkommentare, beide Restore-Extras
  || /\/\/[^\n]*dropAutofillRestore\(|\/\*|\*\//.test(jm) || !jm.includes('i.removeExtra("android.view.autofill.extra.RESTORE_CROSS_ACTIVITY");')
  // v1.23 (run-13 B1): FLAG_SECURE und beide Plugin-Registrierungen wörtlich und an ihrer Stelle, nichts davon hinter //, genau zwei registerPlugin, der ganze
  // onCreate-Rumpf wie ONCREATE_SRC und genau eine onCreate-Methode (auch `protected`/ohne Leerzeichen gezählt). setImportantForAutofill nur mit Klammer:
  // Pass nennt das Wort im Kommentar über getSystemService.
  || !jm.includes('\n        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);\n') || /clearFlags|setFlags|setAttributes/.test(jm)
  || /\/\/[^\n]*(FLAG_SECURE|registerPlugin\(|addFlags|setImportantForAutofill\()/.test(jm) || (jm.match(/registerPlugin\s*\(/g) || []).length !== 2
  || !jm.includes(ONCREATE_SRC) || (jm.match(/\bvoid\s+onCreate\s*\(/g) || []).length !== 1
  // v1.23 (run-13 B3): dropAutofillRestore wörtlich und genau einmal — eine umgedrehte Null-Prüfung öffnete den Absturz-Hebel aus v1.15 wieder
  || !jm.includes(DROP_SRC) || (jm.match(/\bvoid\s+dropAutofillRestore\s*\(/g) || []).length !== 1
  // v1.23 (run-13 B6): SecureClip write/clear wörtlich und je genau einmal, roh UND ohne Kommentare (EXTRA_IS_SENSITIVE steht auch im Javadoc, w1)
  || !readFileSync(CLIP, 'utf8').includes('EXTRA_IS_SENSITIVE')
  || !jcc.includes('extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);') || !jcc.includes('clip.getDescription().setExtras(extras);')
  || !jc.includes(CLIPWRITE_SRC) || [jc, jcc].some((t) => (t.match(/public\s+void\s+write\s*\(/g) || []).length !== 1)
  || !jc.includes(CLEAR_SRC) || [jc, jcc].some((t) => (t.match(/public\s+void\s+clear\s*\(/g) || []).length !== 1)
  // v1.23 (run-13 B4/B5, Notes r4-3): Zählungen auf dem Rohtext UND ohne Kommentare je genau 1 — sonst bestand eine wörtliche Kopie in /* … */ über einer
  // geänderten Methode; Bestätigung und Authenticator genau einmal (ein zweiter Setter NACH der Kette hob die Bestätigung auf, p2)
  || !jb.includes(CREATEKEY_SRC) || [jb, jbc].some((t) => (t.match(/KeyGenParameterSpec\.Builder\s*\(/g) || []).length !== 1 || (t.match(/void\s+createKey\s*\(\s*String\s/g) || []).length !== 1)
  || !jbc.includes('b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);')
  || [jb, jbc].some((t) => (t.match(/setConfirmationRequired\s*\(/g) || []).length !== 1 || (t.match(/setAllowedAuthenticators\s*\(/g) || []).length !== 1)
  || !jb.includes(PROMPT_SRC) || [jb, jbc].some((t) => (t.match(/PromptInfo\.Builder\(\)/g) || []).length !== 1)   // roh UND ohne Kommentare (run-13 d-7: vorher nur roh)
  // v1.23 (run-13 B7): keine Unicode-Escapes (auch \\uu…, JLS 3.3) und keine Textblöcke (noComments kennt sie nicht) in KEINER Java-Datei, auch NoLearnWebView;
  // FLAG_SECURE auch nicht über die LayoutParams (lp.flags &= ~FLAG_SECURE + updateViewLayout braucht kein clearFlags), nirgends clearFlags/setFlags/setAttributes
  || [jm, jb, jc, jwr].some((t) => /\\u+[0-9a-fA-F]{4}/.test(t) || t.includes('"""'))
  || [jm, jb, jc, jwr].some((t) => /updateViewLayout|\.flags\b|getAttributes\s*\(|onWindowAttributesChanged|LayoutParams\s*\(/.test(noComments(t)))
  || [jm, jb, jc, jwr].some((t) => /clearFlags|setFlags|setAttributes/.test(noComments(t)))
  // ab hier (bis v1.22 auf dem Rohtext jb) ohne Kommentare: ein `//` vor einer gepinnten Zeile ließ sie sonst weiter „gefunden“ (run-13 s2)
  || !jbc.includes('setUserAuthenticationRequired(true)') || !jbc.includes('setInvalidatedByBiometricEnrollment(true)') || !jbc.includes('BIOMETRIC_STRONG') || !jbc.includes('sameBoot(')
  || !jbc.includes('setConfirmationRequired(true)') || !jbc.includes('FEATURE_FINGERPRINT')
  // AAD wirklich ANGEWENDET (der private Helfer allein genügt nicht — Audit run-8 #5): beide Aufrufe in enroll() und unlock() zählen
  || (jbc.match(/aad\(cipher, ad\);/g) || []).length !== 2 || !jbc.includes('c.updateAAD(boot.getBytes(') || !jbc.includes('Settings.Global.BOOT_COUNT')
  || !jbc.includes('canaryState()') || !/if \("invalidated"\.equals\(canaryState\(\)\)\) \{ wipeAll\(\); o\.put/.test(jbc) || (jbc.match(/"invalidated"\.equals\(canaryState\(\)\)/g) || []).length !== 2
  || !jbc.includes('call.getBoolean("rearm", false)') || !jbc.includes('"nocanary"')
  // v1.8 „Fingerabdruck auch nach Neustart“: die Wahl kommt vom JS, steht im Slot und hängt in der AAD; der Neustart-Zweig gilt nur
  // ohne keep — und zwar in status() UND unlock(), darum beide Vorkommen zählen; Default false und der Rearm-Riegel sind gepinnt (run-8 #5)
  || !jbc.includes('call.getBoolean("keep", false)) && !rearm') || (jbc.match(/boot \+ "\|keep"/g) || []).length !== 2 || !jbc.includes('st.put("keep", true)')
  || (jbc.match(/optBoolean\("keep", false\)/g) || []).length !== 2
  || (jbc.match(/!keep && !sameBoot\(/g) || []).length !== 2 || !jbc.includes('AEADBadTagException e) { call.reject("tampered")')
  // sameBoot: nur wenn BEIDE Kennungen die Zeit-Form haben, gilt die Toleranz — fiele die Zeile auf die alte id:-Form zurück, liefe b:5 gegen b:6
  // per parseLong in die ±120-s-Toleranz und die Neustart-Regel wäre still aus (Tresor-Diff-Review v3.2 N1)
  || !jbc.includes('if (!stored.startsWith("t:") || !now.startsWith("t:")) return stored.equals(now);')
  // Kanarie VOR dem keep-/Boot-Zweig, in status() UND unlock(): bei einem keep-Slot hängt die Warnung „neuer Finger“ allein daran (Tresor-Diff-Review v3.2 H1)
  || !(() => { const before = (from) => { const c = jbc.indexOf('"invalidated".equals(canaryState())', from), k = jbc.indexOf('!keep && !sameBoot(', from); return c > 0 && k > 0 && c < k; };
       return before(jbc.indexOf('public void status(')) && before(jbc.indexOf('public void unlock(')); })()
  || !/USE_FINGERPRINT"\s+android:maxSdkVersion="27"\s+tools:node="replace"/.test(readFileSync(MANIFEST, 'utf8'))) {   // cap sync bricht die Zeile um
  console.error('FEHLER: Java-Härtung unvollständig — Build abgebrochen!'); process.exit(1);
}
// v1.23 Runde 1 (17.10.2026, Release-Audit run-13 d-1…d-6, Nachweis run-13/w5): auch die übrigen Hebel WÖRTLICH als unabhängige Zweitkopie — bis dahin
// blieben eine Versionsweiche um den getSystemService-Hebel, eine Bedingung vor dropAutofillRestore in onNewIntent, ein fester Boot-Zähler, beide aad()-Aufrufe
// als Zeichenkette, ein drittes Plugin über getBridge().registerPlugin*/registerPluginInstance, ein umbenannter Plugin-Name (app.js fiele STILL auf
// navigator.clipboard ohne IS_SENSITIVE zurück), ein `// x<CR>`-Versteck und Reflection grün. Mit den Bytecode-Pins in build-apk.sh nachziehen.
const GETSYS_SRC = "    @Override\n    public Object getSystemService(String name) {\n        if (\"autofill\".equals(name)) return null;   // Dienstname des AutofillManager (API 26+, Konstante ist nicht öffentlich)\n        return super.getSystemService(name);\n    }\n";
const NEWINTENT_SRC = "    @Override\n    protected void onNewIntent(Intent intent) {\n        dropAutofillRestore(intent);\n        super.onNewIntent(intent);\n    }\n";
const BOOTTAG_SRC = "    private String bootTag() {\n        try { int n = Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.BOOT_COUNT); if (n > 0) return \"b:\" + n; } catch (Exception ignored) {}\n        try (BufferedReader r = new BufferedReader(new FileReader(\"/proc/sys/kernel/random/boot_id\"))) {\n            String s = r.readLine();\n            if (s != null && s.trim().length() >= 8) return \"id:\" + s.trim();\n        } catch (Exception ignored) {}\n        return \"t:\" + ((System.currentTimeMillis() - SystemClock.elapsedRealtime()) / 1000L);\n    }\n";
const SAMEBOOT_SRC = "    private boolean sameBoot(String stored) {\n        if (stored == null || stored.length() < 3) return false;\n        String now = bootTag();\n        if (!stored.startsWith(\"t:\") || !now.startsWith(\"t:\")) return stored.equals(now);\n        try { return Math.abs(Long.parseLong(stored.substring(2)) - Long.parseLong(now.substring(2))) <= 120; }\n        catch (Exception e) { return false; }\n    }\n";
const AAD_SRC = "    private static void aad(Cipher c, String boot) {\n        if (boot != null && !boot.isEmpty()) c.updateAAD(boot.getBytes(StandardCharsets.UTF_8));\n    }\n";
const CLIPHEAD_SRC = "@CapacitorPlugin(name = \"SecureClip\")\npublic class SecureClipPlugin extends Plugin {\n";
const BIOHEAD_SRC = "@CapacitorPlugin(name = \"Biometric\")\npublic class BiometricPlugin extends Plugin {\n";
{
  const bad = [], cnt = (t, re) => (t.match(re) || []).length, all = [jm, jc, jb, jwr], jmc = noComments(jm);
  // Zeichenketteninhalt weg (auf dem Text ohne Kommentare): dort zählt nur noch Code — `String a = "aad(cipher, ad);";` erfüllte sonst die Zählung (d-4)
  const noStr = (t) => t.replace(/"(?:[^"\\\n]|\\.)*"/g, '""'), jbs = noStr(jbc);
  // d-5: rohes CR (javac: Zeilenende, noComments nicht) und Reflection (javac faltet "clear" + "Flags" zur Konstante, kein Methodenverweis im Bytecode)
  if (all.some((t) => t.includes('\r'))) bad.push('rohes CR');
  if (all.some((t) => /\bget(Declared)?(Method|Field|Constructor)s?\s*\(|\bforName\s*\(|java\.lang\.(reflect|invoke)|MethodHandle/.test(t))) bad.push('Reflection');
  // d-3: genau die vier Java-Dateien unter src/main/java (rekursiv, ein Symlink zählt als Datei), keine weitere .java/.kt unter src/main
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
  const want = [MAIN, CLIP, BIO, WV].sort().join('\n');
  if (walk('android/app/src/main/java').sort().join('\n') !== want || walk('android/app/src/main').filter((f) => /\.(java|kts?)$/.test(f)).sort().join('\n') !== want) bad.push('Java-Dateien');
  // d-3: Plugins nur über die zwei registerPlugin in onCreate (ONCREATE_SRC) — kein registerPluginInstance/registerPlugins/addPlugin*, keine dritte Plugin-Klasse
  if (cnt(jm, /registerPlugin\w*\s*\(/g) !== 2 || [jc, jb, jwr].some((t) => /registerPlugin\w*\s*\(/.test(t)) || all.some((t) => /addPlugin|NativePlugin|PluginHandle/.test(t))) bad.push('Plugin-Registrierung');
  if ([jc, jb].some((t) => cnt(t, /@CapacitorPlugin\b/g) !== 1 || cnt(t, /\bextends\s+Plugin\b/g) !== 1) || /@CapacitorPlugin\b|\bextends\s+Plugin\b/.test(jm + jwr)) bad.push('Plugin-Klassen');
  // d-6: Plugin-Name und Klassenkopf wörtlich (app.js sucht CAP.Plugins.SecureClip/Biometric), @PluginMethod genau an write/clear bzw. den fünf Biometric-Methoden
  if (!jc.includes(CLIPHEAD_SRC) || !jb.includes(BIOHEAD_SRC)) bad.push('Plugin-Name');
  const pm = (t, names) => [t, noComments(t)].every((x) => cnt(x, /@PluginMethod\b/g) === names.length) && names.every((n) => t.includes('    @PluginMethod\n    public void ' + n + '(PluginCall call) {'));
  if (!pm(jc, ['write', 'clear']) || !pm(jb, ['available', 'status', 'disable', 'enroll', 'unlock']) || /@PluginMethod\b/.test(jm + jwr)) bad.push('@PluginMethod');
  // d-1: Autofill-Hebel getSystemService und onNewIntent wörtlich, je genau eine Methode; d-2: setImportantForAutofill( genau einmal (eine Rücknahme in
  // onResume blieb sonst grün), genau drei @Override (getSystemService, onNewIntent, onCreate)
  if (!jm.includes(GETSYS_SRC) || [jm, jmc].some((t) => cnt(t, /\bgetSystemService\s*\(\s*String\b/g) !== 1)) bad.push('getSystemService');
  if (!jm.includes(NEWINTENT_SRC) || [jm, jmc].some((t) => cnt(t, /\bvoid\s+onNewIntent\s*\(/g) !== 1)) bad.push('onNewIntent');
  if ([jm, jmc].some((t) => cnt(t, /setImportantForAutofill\s*\(/g) !== 1 || cnt(t, /@Override\b/g) !== 3)) bad.push('Autofill/Override');
  // d-4: Neustart-Regel — bootTag, sameBoot und aad wörtlich, je genau eine Methode; die Code-Zählungen zusätzlich ohne Zeichenketteninhalt
  if (!jb.includes(BOOTTAG_SRC) || !jb.includes(SAMEBOOT_SRC) || !jb.includes(AAD_SRC)
      || [jb, jbc].some((t) => cnt(t, /\bString\s+bootTag\s*\(/g) !== 1 || cnt(t, /\bboolean\s+sameBoot\s*\(/g) !== 1 || cnt(t, /\bvoid\s+aad\s*\(/g) !== 1)) bad.push('Neustart-Regel');
  if (cnt(jbs, /\baad\(cipher, ad\);/g) !== 2 || cnt(jbs, /!keep && !sameBoot\(/g) !== 2 || cnt(jbs, /\bsameBoot\(/g) !== 3 || cnt(jbs, /\bbootTag\(\)/g) !== 3
      || cnt(jbs, /optBoolean\("", false\)/g) !== 2 || cnt(jbs, /\bboot \+ ""/g) !== 2 || !jbs.includes('c.updateAAD(boot.getBytes(') || !jbs.includes('Settings.Global.BOOT_COUNT')
      || !['setUserAuthenticationRequired(true)', 'setInvalidatedByBiometricEnrollment(true)', 'setConfirmationRequired(true)', 'BIOMETRIC_STRONG', 'FEATURE_FINGERPRINT', 'canaryState()'].every((s) => jbs.includes(s)))
    bad.push('Neustart-Regel/AAD ohne Zeichenketten');
  if (bad.length) { console.error('FEHLER: Java-Härtung unvollständig (' + bad.join(', ') + ') — Build abgebrochen!'); process.exit(1); }
}

// Tastatur-Bitte (v1.22, wortgleich Alien Notes 1.13): Reihenfolge und Form gepinnt — das ODER muss NACH super stehen (vorher gesetzt überschriebe Chromium es), darf nicht zur
// Zuweisung werden (löschte die Optionen des Feldes) und nicht auskommentiert sein; das Layout muss die eigene Klasse unter der ID webview tragen.
// Dazu Wächter gegen ein Capacitor-Update: ändert sich Layout-Name, ID, setContentView oder die Signatur, fiele die Bitte sonst STILL weg.
{
  const jw = readFileSync(WV, 'utf8'), lw = readFileSync(LAYOUT, 'utf8');
  const CAP_SRC = 'node_modules/@capacitor/android/capacitor/src/main';
  const capRead = (f) => { try { return readFileSync(CAP_SRC + '/' + f, 'utf8'); } catch (_) { return ''; } };
  const capLayout = capRead('res/layout/bridge_layout_main.xml'), capAct = capRead('java/com/getcapacitor/BridgeActivity.java');
  const capBridge = capRead('java/com/getcapacitor/Bridge.java'), capWv = capRead('java/com/getcapacitor/CapacitorWebView.java');
  const iSuper = jw.indexOf('InputConnection ic = super.onCreateInputConnection(outAttrs);'), iOr = jw.indexOf('outAttrs.imeOptions |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;');
  const bad = [];
  if (!jw.includes('public class NoLearnWebView extends CapacitorWebView {')) bad.push('Klasse');
  if (!jw.includes('public NoLearnWebView(Context context, AttributeSet attrs) {\n        super(context, attrs);')) bad.push('Konstruktor');
  if (iSuper < 0 || iOr < 0 || iOr < iSuper) bad.push('ODER nicht nach super');
  if (!/outAttrs\.imeOptions \|= EditorInfo\.IME_FLAG_NO_PERSONALIZED_LEARNING;\n        return ic;/.test(jw)) bad.push('return ic');
  // ganzer Methodenrumpf wörtlich (Release-Audit v1.13 b: eine Bedingung vor dem ODER kam sonst durch) und genau eine solche Methode
  if (!jw.includes('    @Override\n    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {\n        InputConnection ic = super.onCreateInputConnection(outAttrs);\n        outAttrs.imeOptions |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;\n        return ic;\n    }\n')
      || (jw.match(/onCreateInputConnection\(/g) || []).length !== 2 || /\b(if|else|switch|try|for|while|return null)\b/.test(jw.replace(/\/\/[^\n]*/g, ''))) bad.push('Methodenrumpf');
  if (/imeOptions\s*=[^=]/.test(jw) || /\/\*/.test(jw) || /\/\/[^\n]*(imeOptions|onCreateInputConnection|return ic)/.test(jw)) bad.push('Zuweisung oder auskommentiert');
  if ((jw.match(/imeOptions/g) || []).length !== 1) bad.push('imeOptions mehrfach');
  const lwCode = lw.replace(/<!--[\s\S]*?-->/g, '');   // nur Markup außerhalb von Kommentaren zählt
  if (!lwCode.includes('<org.alieninvestor.pass.NoLearnWebView\n        android:id="@+id/webview"') || /CapacitorWebView/.test(lwCode) || (lwCode.match(/[\w-]+:id\s*=/g) || []).length !== 1 || (lwCode.match(/<[A-Za-z]/g) || []).length !== 2) bad.push('Layout');
  if (!capLayout.includes('<com.getcapacitor.CapacitorWebView\n        android:id="@+id/webview"')) bad.push('Capacitor: Bibliotheks-Layout geändert');
  if (!capAct.includes('setContentView(R.layout.bridge_layout_main);')) bad.push('Capacitor: setContentView geändert');
  if (!capBridge.includes('findViewById(R.id.webview)') || !capBridge.includes('webView instanceof CapacitorWebView')) bad.push('Capacitor: Bridge sucht die WebView anders');
  if (!capWv.includes('public InputConnection onCreateInputConnection(EditorInfo outAttrs) {') || !capWv.includes('public CapacitorWebView(Context context, AttributeSet attrs) {')) bad.push('Capacitor: CapacitorWebView geändert');
  // captureInput: CapacitorWebView gäbe eine leere BaseInputConnection (TYPE_NULL) zurück und reichte Tastaturtext per evaluateJavascript weiter — nie setzen.
  // Geprüft wird die von `cap sync` ERZEUGTE Konfiguration im Asset (die CLI liest .ts/.js VOR .json; Release-Audit v1.13 b2), dazu keine .ts/.js-Konfiguration.
  { let cfg = null; try { cfg = JSON.parse(readFileSync('android/app/src/main/assets/capacitor.config.json', 'utf8')); } catch (_) { cfg = null; }
    if (!cfg || (cfg.android && 'captureInput' in cfg.android) || 'captureInput' in cfg || existsSync('capacitor.config.ts') || existsSync('capacitor.config.js')) bad.push('captureInput/Konfiguration'); }
  // Java ohne Kommentare und ohne Unicode-Escapes (javac löst \uXXXX VOR dem Parsen auf — ein \u000a beendete sonst einen Kommentar), genau eine Klasse;
  // seit v1.23 auch \uu…XXXX (JLS 3.3, wie Notes 1.14; run-13 B7 — vorher nur mit einem u)
  { const code = jw.replace(/\/\/[^\n]*/g, '');
    if (/\\u+[0-9a-fA-F]{4}/.test(jw) || (code.match(/\bclass\b/g) || []).length !== 1 || !code.includes('public class NoLearnWebView extends CapacitorWebView {')
        || !code.includes('outAttrs.imeOptions |= EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING;') || /\bEditorInfo\s+[A-Za-z_]\w*\s*[=;]|\bint\s+EditorInfo\b/.test(code)) bad.push('Java-Form'); }
  if (bad.length) { console.error('FEHLER: Tastatur-Bitte unvollständig (' + bad.join(', ') + ') — Build abgebrochen!'); process.exit(1); }
  console.log('Tastatur-Bitte (NoLearnWebView + Layout) geprüft.');
}
