# Launch and mobile layout review — 9 November 2026

The user app now initializes Home underneath a local 2500 ms branded launch overlay. It uses the existing official wordmark, navy and turquoise, a finite animation, and a deadline independent of animation completion or network readiness. The overlay runs once per process, skips Activity restoration, respects disabled system animations, restores accessibility/focus, and removes pending callbacks on detach. Admin does not receive this launch overlay or a replacement launcher icon.

Responsive styles keep public Home, Jornada, race/checklist, profiles, comparison, results and Admin controls within narrow viewport widths. Date/track and comparison selectors stack rather than truncate their names. The public navigation wraps and preserves a readable Results destination. Native user navigation uses two rows of three below 360 dp, or below 480 dp with larger system text. Native button heights follow font scale. No global horizontal overflow mask was added.

## Evidence

- Browser layout checks at 320, 360 and 390 px: Home, Jornada, race, featured page, horse profile, comparison, results and results detail had document/panel scroll widths equal to their client widths. Visible controls remained in bounds. Admin form layout passed at the same widths; its browser fixture excluded scripts and was not an authenticated publication test.
- Browser screenshots and interactions confirmed the portable splash preview returns to Home, and full-width comparison selectors display horse names. Timer unit checks assert 2500 ms; browser RPC elapsed time is not a device startup benchmark.
- Passed: 13 Home DOM checks; 8 horse profile DOM checks covering 40 profiles; 9 results integration checks; sync publication/offline/conflict regressions; branding checks; splash DOM/static checks; 2 mobile transform tests; 4 LaunchGate JUnit tests on JRE 21 with ECJ.
- Security regression passed against the expanded source: hostile JSON, response policy, actual PDF parser/import and obsolete-parser removal. Official PDF archive download returned HTTP 504; retained PDF runtime and license files were each verified against the exact pinned manifest SHA256 before resuming the unmodified security transform. This run did not freshly download the archive.
- Public reader transformations were verified CSS-only: existing JavaScript and signed snapshot envelope remain unchanged. Transform is idempotent.
- Home HTML plus script grew from 60,867 to 65,002 bytes. The existing local splash wordmark adds 13,850 bytes to user assets. No new runtime requests, packages, permissions or privileged bridge methods were added. The visible 2.5 s interval is intentional; Home initialization proceeds underneath.

## Security and performance applicability

Existing repository baselines remain authoritative. For this scoped change, controls 2/7/11/14/20/23/26/27 apply to local assets, preview isolation, CSP and evidence; the scoped added/changed source was reviewed for credential patterns. The change does not add accounts, passwords, SQL, cookies, recovery, billing, remote uploads, backend CORS or new dependencies, so those controls require no new implementation here. Existing sync/security negative tests remain in force. This is not a new audit of all history or an authenticated end-to-end publication.

Performance measures cover changed source size, local-only logo, finite animation, timer cleanup, disabled animations and continued Home initialization. Device cold start, CPU/frame timing, network throttling, accessibility and large-font native layout remain pending. No claim of all 27/31 controls passing is made.

## Delivery limits

This is a draft source update and a portable HTML review, not an installed APK. Full Android SDK compilation, emulator/device navigation/splash verification, offline restart, permanent signing, increasing release version code and exact signed-APK verification remain required before release. Production remains unchanged. Separate profile/uniform work in draft PR 17 has not been merged by this change.
