# Test-Fixtures: Proton-Pass-Export (synthetisch)

Frei erfundene Beispieldaten im Format des Proton-Pass-JSON-Exports (`data.json`), dazu mit GnuPG
symmetrisch verschlüsselte Varianten und ZIP-Hüllen, wie sie `roundtrip-test.mjs` [12]–[14] prüft.
Passphrase aller `.pgp`-Dateien: `test-passphrase-alien`. Keine echten Zugangsdaten.

```
gpg --batch --passphrase 'test-passphrase-alien' --symmetric --cipher-algo AES256 --s2k-mode 3 \
    --s2k-digest-algo SHA256 --s2k-count 65011712 --armor -o data.pgp data.json            # komprimiert, Partial-Längen
gpg ... --compress-algo none --armor -o data-nocomp.pgp data.json                          # unkomprimiert, definite Länge
zip -0 data.zip "Proton Pass/data.json"; zip -0 data-pgp.zip "Proton Pass/data.pgp"; zip -9 data-deflate.zip "Proton Pass/data.json"
```
