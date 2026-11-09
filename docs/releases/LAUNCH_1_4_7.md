# PlayersHype 1.4.7 — full-screen brand entrance

The user app opens with a local 2.5-second brand animation, then reveals the Home. The native overlay covers both the WebView and native navigation. The Home loads concurrently; no loading bar, replay control, network asset, audio or additional runtime dependency is introduced. The official packaged wordmark is reused.

A fresh Activity launch plays the entrance once. Background resume and saved-state recreation retain the current screen without replaying it. Android's disabled-animation preference shows a static brand screen for the same interval. The overlay restores system bars and accessibility when it reveals the Home, and removes its pending completion callback when detached.

Version code: 15; version name: 1.4.7. Both existing package identities and permanent signing requirements are preserved. The Admin does not show this entrance.

## Validation scope

Applicable security controls: packaged asset only, no new permissions, inputs, credentials, API, bridge or external requests. Existing origin checks, CSP, TLS policy and Admin authorization are unchanged. Account/password/SQL/payment controls are outside this UI change. The existing source security, branding, UI/sync, results and PDF regression checks remain mandatory in CI.

Performance: one locally decoded wordmark, six transient streak Views, one finite native animation sequence; all entrance Views are removed after 2.5 seconds. No repeated render loop or polling is added. The intentional startup presentation costs 2.5 seconds; Home data loading overlaps it. Android emulator CI installs the exact signed APKs and verifies navigation, synchronization, results and offline restart. Physical-phone visual parity remains a device check.
