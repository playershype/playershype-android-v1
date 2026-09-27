# Reference audit and migration map

Baseline: 0739d3c35d4db3674da8d4b3cf487db6244b1b8f.
The delivered single-app Preview is retained on main; integration uses feature/two-app-ecosystem.

## Verified inputs

| Artifact | SHA-256 | Observed contents |
| --- | --- | --- |
| HypePredict-BETA.apk | b765cf621a77ec4bd406f89cba2ad169db7048d6b76b45af5794306e3fc9f004 | Public template, 7 cached cards, 4 tracks, PDF.js, scoped WebMessage export/sync adapter |
| ADM HypePredict-Android-0.1.0-preview-1.apk | e0ed9f9c32bfd5f02562a88c7599d6b18ba6ebd21d6bfd6582b8608985c25b2f | Original HUB, embedded workspace/cards/tracks, editing/import/export, Postmortem, Broadcast, Live publisher |
| PlayersHype-App-V1-Android.zip | See artifact manifest | Signed hardened Home Preview, build commit and signature/hash evidence |

The three newly pasted specifications exactly match the earlier specification (SHA-256 9ff5244a5c4f9a6f069df9e5b10381089f75ffa12ee46671950ebd16c3820589).

## Findings

- Both legacy APKs target API 36/min API 26 but are debuggable. Their native shell enables content access. Those settings must not replace the hardened current shell.
- The public template still includes admin import/publish/backup functions and private Postmortem logic. Hiding controls is insufficient: public code and data require a real projection.
- The public seed includes event.hypeScoreWeights, operationalNotes and postRaceCalibration. Raw legacy seeds must not be committed or shipped as public payloads.
- Legacy HypeNative uses AndroidX WebMessageListener scoped to the asset origin, not addJavascriptInterface. Preserve required export/import behavior through validated allowlisted messages only.
- The legacy Live publisher stores a permanent bearer in localStorage. This must be replaced with protected authenticated publication; no token is copied from the reference.
- Public feed refresh downloads the Track Hub and parses embedded JSON without executing fetched HTML. Preserve last-known-good semantics while moving to a versioned Core contract.
- Results Worker root responds `HypePredict Results ONLINE`; Live Worker root responds HTML. This does not prove that either implements the requested Core API, authentication, revision history or rollback.
- No Core source or identity-provider configuration has yet been supplied. Remote publishing remains blocked until those are verified.
- JADX recovered first-party shell/feed source for comparison; it reported errors in other code. Decompiled output is reference material, not an automatically trusted replacement.

## Change map and acceptance gates

| Change | Preserve | Risk | Required verification |
| --- | --- | --- | --- |
| app -> app-user; add app-admin/shared | Home and existing hardened controls | Manifest/module/build drift | Both unit tests/lint/real signed APKs; inspect packaged manifests |
| Public HypePredict integration | Original Track Hub/race/horse/pace/tale/favorites/history/exports | Private code/data leakage; UI regressions | Public projection tests, forbidden-field scan, navigation and reference parity tests |
| Admin original HUB integration | Imports, track/card editing, Postmortem, backups, exports, Broadcast | Tokens, arbitrary downloaded code, lost file flows | Original feature inventory plus malicious-input/native-action tests |
| Shared Core contract/cache | Atomic last-known-good copy and accurate dates | Invalid/new schema destroys cache | Schema/revision/offline/corruption tests |
| Authenticated publish/rollback | No public private-data exposure | Unauthorized writes or lost sealed history | Server-side auth/role/concurrency/sanitization/rollback integration tests; blocked without Core source/config |
| Dual-app CI/packages | Proven Gradle 8.13/AGP 8.11.1/JDK17/API36 | Wrong APK identity/signing/artifact | apksigner, metadata, hashes, separate master packages, reports |

No production-complete claim is permitted from build success alone. Device installation, navigation parity and real authenticated publishing require their own evidence.
