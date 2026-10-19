# Hidden ancestor oracle correction

The first16 completed Home rows passed all assertions. Row17 (Chromium Employee landscape844×390/100%) falsely treated innerText from the entirely display:none extra ancestor as visible. Extra bounds are0×0, computed display is none, its sizing span is aria-hidden/visibility:hidden, and all geometry/CLS assertions pass. This is a harness oracle issue, not an app finding.

The16 valid rows are preserved. Only row17 is replayed using an explicit ancestor-display check; remaining63 matrix rows have not yet executed. The original script/transcript and all raw assertions are archived here; the row's existing crops are retained in home-responsive/. No prior failure is silently discarded.
