# Backend merge resolutions

Candidate input9a35168 (coordinator4d469a4), backendda2a4e5. Both full conflict sides are preserved.

Coverage follows Wave A’s explicit ROUND instruction: its test blob18e3861 equals the pre-merge candidate file. Backend/candidate differences are screen-text assertions only; backend authority/locator/stale/save assertions remain. No7f75dc4 app code is merged.

Root layout applies the coordinator’s existing two-part resolution (async RootLayout plus development-only error hook, alongside the coordinator script). The coordinator’s current4d469a4 TEXT_SCALE_SCRIPT and comments are retained, including data-text-step introduced after the supplied older resolution text. The only changes from4d469a4 layout are async and the prescribed hook line; no older script snapshot is substituted.
