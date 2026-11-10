# Compact Home B — 1.4.12

Approved hierarchy: HypePredict → date-scoped published program → shortcuts → active Live → PlayersHype TV → editorial content. The original wordmark, entrance animation, public data and Admin launcher remain intact. Home order is fixed to the approved design; Admin content and visibility settings still supply the supporting modules. HypeBoard and comparison tools remain within Predict.

The date input reads the small native home projection, not the full archive. Track links carry the selected date into the existing dashboard. A date without published analyses shows an empty state. Responses from older date selections cannot overwrite the current selection. No HypeScores, reports, betting combinations or results were changed.

YouTube's old @playershype1 default is migrated to @playershypetv. Program links use an existing published URL or search the channel by program name; there are no fabricated playlists, video titles or live broadcasts. Live requires enabled status, status=live and an HTTPS destination.

## Evidence

- Rebuilt retained source with theme, sync, Home and security overlays.
- Passed Home DOM checks: hierarchy, date route, channel links, escaped labels, live visibility, empty day and safe fallback.
- Passed existing sync/publication tests including offline handling and separate destinations.
- Passed 26 original UI integration checks, 9 Results checks, branding checks, 45 static security checks and 21 release checks.
- JavaScript syntax checks pass for Home and generated dashboard.
- Passed 100 real Chromium layout checks at 320, 360, 390, 430 and 768px, with 100% and 130% text. The original R6 overflow was reproduced at 472px document width on a 360px viewport; repaired screens fit without page clipping.
- Both signed APKs compiled, passed unit tests and Android lint, installed and opened internal HypePredict in Android API 36.
- Exact App APK passed real GitHub app-route synchronization, offline restart and real Camarero Results with persisted offline cache.
- Verified non-debuggable version 1.4.12-preview (code 20), package com.playershype.app.preview and pinned signing certificate.
- Build and device evidence: https://github.com/playershype/playershype-android-v1/actions/runs/42813861757
- Verified build source: 7e7ed66ffa5a15b720cc3fb2712f6ea146209f07. User APK SHA-256: 74264828472f16423d246e1a36e1d872f6d2e0df9cdc2a0aa0bafd41a194a57c.
- Repaired emulator scrolling to derive gestures from actual WebView bounds and stop when the requested status is visible; fixed coordinates could hit native TV navigation.

## Scoped security and performance

Controls 2/3/4/7/9/11/14/20/23: existing public projection, HTTPS-only external navigation, native origin policy, CSP and absence of client secrets retained; static checks pass. New track labels are escaped and date parsing occurs natively. Controls 6/12: no new privileged operation; date reads stay bounded to the existing public snapshot. Controls 1/5/8/10/13/15–19/21/22/24/25: no authentication, SQL, payment, dependency, import, monitoring or credential changes in this Home patch; existing controls are unchanged, not newly certified. Controls 26/27: DOM tests and static audits are evidence for their stated scope, not an authenticated publication/device test.

Performance: no new runtime dependency, font service, YouTube iframe, playback polling or thumbnail API. The duplicate analysis image/card is removed; track rows use text and do not request track photos. Below-fold editorial images remain lazy. The compact primary card replaces the 355px hero. Startup, cached and network-failure behavior is exercised by existing sync checks. Browser width measurements and exact signed-artifact verification passed in the linked run. Physical Samsung validation and authenticated Admin publication remain separate checks.
