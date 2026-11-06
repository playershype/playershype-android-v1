# PlayersHype 1.4.6 — restore official results

The retained HypePredict module had the Camarero gateway, date browser and two-minute polling, but the replacement public renderer never included that interface. The deployed gateway still responds. A live November 5, 2026 response returned seven Camarero races; its unchanged public payload is retained as a regression fixture.

Restore a dedicated Results screen, a persistent native Results tab, a Home shortcut and a HypePredict navigation tab. Results have an independent date and do not require a published analysis. Only Camarero is automatically connected; previous GP/DEL registry labels did not enable automatic requests for those tracks.

The detail view uses semantic order-of-arrival tables and only the payments present in the source. Null payments are omitted, missing places are not inferred and source placeholders such as `[ ]` remain visible with an incomplete-data label. There is no postmortem calculation or rewriting of sealed analysis in this change.

## Public endpoint and trust boundary

- Existing source: `https://hypepredict-results.players-hype1.workers.dev/results?track=CMR&date=YYYY-MM-DD`.
- User-facing official link: `https://www.hipodromo-camarero.com/resultados/locales`.
- Native read-only route: `/core/results`, GET only, fixed HTTPS host, no redirects, no user-selected URL and no credentials. Date must be a real ISO date and track must be CMR. Network time and body size are bounded; native bounded JSON parser verifies date, track and race count.
- Browser rendering escapes all source values and validates response identity. Wrong-date, wrong-track and duplicate/malformed race responses are rejected. Cache is separate from public analysis, retains up to 30 dated responses and never falls back to another day.
- Visible polling remains two minutes, with one shared request per date. Requests stop when leaving Results or pausing the app. First Results UI and source query start before the analysis archive finishes loading.

## Verification

Eight DOM integration checks cover a real response fixture, displayed date, seven race rows, order/payments, incomplete data, accessible closing, refresh deduplication, offline cache, wrong-date rejection, empty days, hostile markup and operation without analyses. Native unit tests verify request constraints and payload scope. Normal UI, sync, profiles, PDF, 45 security checks, 21 source checks and branding verification pass locally. Public config and embedded publication envelope are preserved byte for byte.

Version 1.4.6/code 14 keeps the pinned permanent signing certificate and unchanged Admin launcher. CI gates Android compilation, unit tests/lint, exact APK verification, existing online/offline sync and an additional emulator Results-tab test using the real gateway followed by offline restart. Physical-device appearance and authenticated Admin publication are separate from these tests. No dependency versions, accounts, SQL, payments infrastructure or credentials are added.
