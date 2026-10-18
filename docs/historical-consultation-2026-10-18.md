# Historical consultation — 2026-10-18

Scope: Android User Track Hub/HypePredict and the existing HypePredict web UI.
Development branch: v0.1-stitch-clean. Web deployment branch: v0.1-hypepredict-preview.
No changes to main, published config, original analysis data, score contract or Admin publication.

## Implemented

- Shared `race-history.js` reader in Android assets and web (identical contents).
- Date-first selection lists tracks with published analyses for that exact date.
- Each archived view uses its own `day`, `analyses` and `horseData`. Missing archived analysis or horse data cannot fall back to current data, even if IDs repeat.
- Explicit missing track/date/race URLs show an empty state; they do not redirect silently to another jornada.
- Android Track Hub links carry date and track; race links, back navigation, profiles and HypeMatch exports retain historical context.
- Existing Parx 2026-10-05 archive is preserved and available in both clients.
- Historical views do not display current weather as historical weather.
- Original day summary/Pick 6 is shown only if preserved for that same track/date. Existing snapshots have no saved day report; they retain complete per-race analyses.
- User version: 0.1.3-history-consultation (versionCode 4). Admin version is unchanged.

## Build

Published config currently contains days for three tracks missing from `tracks`.
The Android build recovers those already-present IDs only in the runner's build copy,
then runs the strict existing validator. It never commits that copy or publishes data.
All existing validation and APK checks remain enabled.

## Verification

- `node tests/test_race_history.cjs`: nine stored jornadas, 66 original analyses and original horse data matched exactly against the 2026-10-18 source; Parx legacy, multi-track dates, explicit missing dates, ID reuse, missing evidence and input immutability checked.
- `CHROMIUM_PATH=... node tests/history_browser.cjs`: real Chromium using the Android HTML/JS with a simulated native data/export bridge, and the web UI with the same real config. Track Hub, dates, races, profile, HypeMatch JSON, refresh/back, all stored web jornadas and unavailable track/date/race checked; no JavaScript errors.
- Build-only prepared config passes `scripts/validate_v01_config.py`.
- Browser checks do not certify installation or behavior on a physical Android device. Record CI/APK and deployed-web verification separately.

## Packaged navigation correction

The first build (f6ee026) passed Java, lint and static APK checks, but a browser test using its extracted assets exposed a generated Stitch click router stripping the selected date. The assembly now excludes the canonical Track Hub from those legacy routers. CI runs the browser navigation test against the extracted APK before uploading it, including opening the date picker and following a historical track link. External styling is stubbed only in the offline navigation test.

Web deployment fe5c4ea succeeded. A live browser check opened Camarero 2026-10-08 with six original race analyses, retained the selected track/date and reported no JavaScript errors. Physical Android installation remains unverified.
