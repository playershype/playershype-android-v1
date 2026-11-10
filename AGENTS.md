# PlayersHype application work

Apply [the 27-control security baseline](docs/security/SECURITY_BASELINE_27.md) to application changes and releases. Record applicability and evidence; do not claim all controls pass when a feature is absent or only mocked. Preserve published HypeScores, analysis text, withdrawals, pre-race sealing, HypePick, navigation and the approved palette.

Apply the [31-point performance baseline](docs/performance/PERFORMANCE_BASELINE_31.md) to both Android apps and new surfaces. Measure changed flows with representative data and verify cold start, cached use and network failure before release.

The current Android build expands the retained source ZIP and applies `apply_theme.py`, `apply_sync.py`, then `apply_security.py`. Edit the tracked overlays rather than an ignored extracted checkout. Run normal UI/sync checks, native security tests and the PDF import regression against the resulting source. A test or audit failure must fail CI. Do not expose secrets or private workspaces in public files, logs or shipped artifacts. Treat production signing and authenticated device publication as separate evidence from Preview installation.

`apply_sync.py` also applies the original PlayersHype user branding through `apply_branding.py`. Keep the Admin launcher unchanged so the two apps remain visually distinct. Public, packaged and exported headers must use the same local original asset; preserve reduced-motion support and the finite animation budget. Run `scripts/check_branding.py` against the expanded source.

Android builds must use the permanent certificate pinned in `security/signing-identity.json`. Missing or invalid signing secrets must fail the build; never silently generate a temporary replacement key. Keep private signing material outside the repository and artifacts. Version codes must increase. Earlier APKs signed with discarded temporary keys require a planned migration with verified user backups; do not describe these as in-place updates.

`apply_results.py` restores results in the current public renderer and user navigation. Keep results read-only and separate from sealed analyses. Only Camarero has an enabled automatic provider. Preserve exact date/track validation, escaped source values, offline cache scope, visible-only polling and the fixed-host native GET endpoint. Run `results/tests/reader.test.cjs` and the emulator Results-tab/ offline-restart check before shipping.

`mobile/fit.css` is the shared width contract for public, packaged and exported pages. `apply_mobile_fit.py` also injects that trusted local stylesheet when serving older cached public documents. Preserve text wrapping and minmax(0,1fr) grid tracks; do not conceal overflow with page clipping or smaller type. Run `mobile/layout.test.cjs` in real Chromium at 320–768px with enlarged text. The browser width job must pass before emulator/release verification. Native user navigation uses five accessible icon buttons in one 52dp row; Admin navigation remains separate.

`ui-refresh/` is the trusted public presentation overlay. Preserve published payloads and show connection records only with their published period/context. Run `ui-refresh/reader.test.cjs` and the browser width checks before building.
