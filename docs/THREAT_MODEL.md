# Threat model
| Threat | Control | Evidence / residual risk |
|---|---|---|
| HTTP/SSL downgrade | cleartext denied, HTTPS policy, SSL cancel | source audit and URL tests; device interception test pending |
| Remote code in publication | parse JSON only, packaged scripts/CSP | implementation and audit; fuzz coverage limited |
| Private analysis in public feed | recursive allowlist + distinct APKs | malicious/unknown field tests and seed scan |
| Frame invokes native | exact origin + main-frame gate + bounded actions | source audit; instrumented malicious-frame test pending |
| Export path traversal/oversize | sanitized filenames, fixed private temp directory, limits, SAF | implementation; chooser device test pending |
| Unauthorized publication | no remote write path enabled | fails closed until server auth/roles exist |
| Lost offline data | validate before atomic write, retain previous cache/history | projection/history unit tests; crash injection pending |
| Signing/key disclosure | env secrets, transient runner key, ignored key files | audit, CI secret masking, signature verification |

Do not promote this integration Preview to production until the pending device and backend gates are satisfied.
