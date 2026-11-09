# PlayersHype 1.4.11 — fit every screen to the phone

The supplied screenshot is Horseshoe Indianapolis, 2026-11-09, R6. Its narrative and Pace Projection extend beyond the right edge. Implicit auto-minimum grid tracks allowed wide descendants such as the HypeBoard to enlarge the entire race screen.

The shared layout now uses shrinkable grid tracks and containers, wraps long text and form controls, stacks Pace lanes on narrow phones, and presents the full HypeBoard as vertical rows on mobile. Profiles, HypeMatch, results, payment details, Home modules and navigation use the same width constraints. No page overflow is hidden to mask the issue, and text is not reduced to fit. Native navigation uses two rows of three on narrow phones or enlarged fonts. The approved startup animation remains.

The native reader also applies its packaged stylesheet to older cached or newly published HTML, so an older Admin export cannot restore the overflowing layout. The current web reader and app route are updated without editing the embedded published snapshot or analysis data.

Version 1.4.11, code 19; permanent certificate and package identities unchanged. No runtime library, permission, credential, privileged operation, external request or telemetry is added. The native stylesheet read is bounded to 64 KiB and uses packaged assets. Existing import/PDF/security/sync/results checks remain.

`mobile/layout.test.cjs` reproduces the actual R6 before the repair, then measures 100 screen/width/text-size cases in real Chromium, including 320, 360, 390, 430 and 768 px and 100%/130% text. It rejects off-screen text and elements rather than merely checking the page's reported width. Screenshots and before/after measurements are CI artifacts. Chromium/Playwright are test-only and are not shipped in either APK.
