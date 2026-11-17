# Digest manifest scan correction

The initial all-artifact scan flagged ten SHA-256 digest values because JSON used
filenames containing the word secrets as keys. Every finding was verified to be
a file digest, not a credential. The redacted scan is retained. The manifest now
uses explicit file/sha256 fields per entry; scanner configuration and assertions
were not weakened or suppressed. The final staged scan passed.
