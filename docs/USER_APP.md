# Public App Preview
Home retains the PlayersHype design. Inicio, Tracks, Predict, TV and Latest are native navigation buttons. Predict and Home Track Hub links open the packaged original HypePredict within the app. Track cards use the sanitized bundled/cached feed and open the latest available card internally.

Seven bundled historical cards and four tracks support offline startup. The original renderer retains races, horses, HypeBoard, pace, Tale of the Tape, search, favorites, history, results display and export controls. Cache dates remain visible; bundled cards are never described as today's publication.

Remote feed refresh uses a read-only legacy adapter with HTTPS, time/size limits, no redirects, validation and atomic last-known-good replacement. This adapter has not been verified against a real Core contract. Home Live/TV/Latest are fallback content until Core is supplied; TV links use the system browser. Public code contains no Admin import/publish UI or private model weights/Prompt Maestro. The allowlist retains public horse workout text while excluding raw source imports.

DOM integration tests are not a substitute for Android device installation, layout, PDF/image export, chooser and lifecycle testing.
