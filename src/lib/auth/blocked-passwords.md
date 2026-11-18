# Local password blocklist

New-password screening is local. No submitted password, digest or employee identity is sent to a third party. The blocklist has finite, explicitly documented coverage; it cannot identify every password in every breach.

Source: SecLists `Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt`, pinned at commit `6b19c2f5088c45b5dadb4d8918d2ab4f7efb03a9` on November 17, 2026:
https://github.com/danielmiessler/SecLists/blob/6b19c2f5088c45b5dadb4d8918d2ab4f7efb03a9/Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt

This common-credential corpus derives from the xato breach compilation. The upstream MIT license is retained in `blocked-passwords.LICENSE`. Source SHA-256: `424a3e03a17df0a2bc2b3ca749d81b04e79d59cb7aeec8876a5a3f308d0caf51` (8,557,632 bytes; 1,000,000 lines).

Values shorter than the selected 15-character minimum already fail the length rule. Retain only values of at least 15 Unicode code points and at most 1,024 UTF-16 units, normalize NFC for screening, then store their sorted unique SHA-256 digests. There are 10,908 retained digests. Password hashing and existing credential verification retain their original byte semantics.

To reproduce, download the pinned source to an untracked scratch directory and run:

```sh
node scripts/password-blocklist.mjs /absolute/path/to/public-source.txt --check
```

Omit `--check` to regenerate. A different input hash is refused. Future refreshes require updating the reviewed source/hash, digest data and regression evidence together. Never feed application credentials into this importer. SHA-256 here is a lookup fingerprint, not the credential KDF; credentials still use the existing salted scrypt implementation.
