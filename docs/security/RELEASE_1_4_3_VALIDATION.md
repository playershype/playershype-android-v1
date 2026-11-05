# PlayersHype 1.4.3 — signing and Admin publication

## Change and limits

Version code 11 uses the permanent certificate pinned in `security/signing-identity.json`. The signing script requires all four encrypted GitHub secrets, verifies the certificate fingerprint and key password, and refuses temporary-key fallback. The retained rebuildable source receives this same script and public identity pin. No private signing data belongs in this repository or its artifacts.

The Admin publisher now reads the snapshot-scoped library used by the packaged HypePredict editor. The correction is the isolated storage fix from PR #8; it does not bring in the unfinished analysis-model changes from PR #7. Published config, reports, HypeScores, withdrawals, HypePick and pre-race seals are unchanged. The structured profile from PR #11 remains in the packaged reader.

Earlier delivered APKs used discarded temporary keys. This release cannot update those installations in place. The user's workspace backup contains Camarero Nov 5 (7 races, 40 horses) and Horseshoe Nov 3 (10 races, 82 horses). The separate general Admin backup has an older Nov 4 revision and 67 analyses: restore settings as a draft and reconcile with current published data before any publishing. Backup-format validation is not proof of an authenticated phone publication.

## Security applicability

| Controls | Evidence and boundary |
| --- | --- |
| 2, 11, 23 | Signing secrets are runner inputs only; private key is written outside the checkout with restricted permissions. Only the public fingerprint is tracked. Existing artifact packaging excludes keystores. |
| 6, 9, 18 | Native authorization and bounded publication are unchanged. Existing sync/hostile-input checks pass; signing rejects missing/partial secrets, bad encoding/passwords, newline passwords, wrong certificate and an existing destination. |
| 7, 14, 20 | Existing 45 static security assertions and PDF/import regressions pass. No native origin policy, CSP or debug protection is weakened. |
| 21, 22 | No dependency/version changes; the existing pinned PDF runtime and exact integrity checks remain. |
| 24, 25 | Redacted source scan and CI source/history/artifact scan are required. No exposed credential is asserted or rotated. The permanent key is a new migration identity. |
| 26, 27 | Local checks are described below. Native tests, lint, signing verification, exact-APK scan and emulator installation/sync remain CI evidence and must pass before delivery. Physical-phone publishing remains separate. |
| 1, 3–5, 8, 10, 12–13, 15–17, 19 | Existing application boundaries are unchanged by this patch. SQL, account recovery, cookie sessions, payments and server rate limiting are not introduced to this local/static architecture. This scoped release is not a full penetration test or a claim that all 27 controls are implemented. |

## Local verification

- Eight signing tests use an independent key, including two builds with the same certificate. The separately generated permanent key also passes the pinned identity check without printing private values.
- Five snapshot storage-contract tests pass. Actual expanded publisher code ignores an empty legacy workspace, reads the packaged editor snapshot and projects all seven Camarero races with 40 unchanged HypeScores.
- Twenty-six existing UI integration checks, dual-route sync/failure recovery, eight structured-profile checks and PDF/hostile-import checks pass.
- Forty-five security and 21 source-contract assertions pass against the expanded 1.4.3 source.

## Performance applicability

The storage correction changes four localStorage key strings; it introduces no requests, dependencies, timers or rendering loops. Signing verification is build-only and adds no device startup work. The existing 31-point baseline still applies to startup, images, caching, async sync and offline restart. Structured-profile HTML generation measured approximately 0.058 ms/open in the local Node DOM harness; this is not phone paint latency. Online/offline emulator behavior, APK size and signatures are verified from the delivered CI artifacts; mobile-network latency and physical-device publishing remain separate checks.
