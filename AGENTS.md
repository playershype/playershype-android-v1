# PlayersHype application work

Apply [the 27-control security baseline](docs/security/SECURITY_BASELINE_27.md) to application changes and releases. Record applicability and evidence; do not claim all controls pass when a feature is absent or only mocked. Preserve published HypeScores, analysis text, withdrawals, pre-race sealing, HypePick, navigation and the approved palette.

Apply the [31-point performance baseline](docs/performance/PERFORMANCE_BASELINE_31.md) to both Android apps and new surfaces. Measure changed flows with representative data and verify cold start, cached use and network failure before release.

The current Android build expands the retained source ZIP and applies `apply_theme.py`, `apply_sync.py`, then `apply_security.py`. Edit the tracked overlays rather than an ignored extracted checkout. Run normal UI/sync checks, native security tests and the PDF import regression against the resulting source. A test or audit failure must fail CI. Do not expose secrets or private workspaces in public files, logs or shipped artifacts. Treat production signing and authenticated device publication as separate evidence from Preview installation.
