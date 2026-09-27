# Public data contract v1
core-contract/public-projection.json is the explicit recursive field allowlist. Its packaged shared copy must be byte-identical. Unknown properties are discarded; private Prompt Maestro, model weights/components, operational notes, Postmortem and raw source imports are excluded. Public horse workout raw text is a display field, not an ingest payload.

Feed: schemaVersion=1, cards[1..100], tracks[0..100]. Card requires event.track, ISO event.date, races[1..40], unique raceNumber1..99 and at most100 horses/race. Recursion24, arrays500, ordinary text30k, artwork3MB, overall feed16MB. Raster data artwork and credential-free HTTPS media are allowed; script-bearing/NUL text and incompatible schemas are rejected.

The SHA-256 content hash is an integrity/cache identifier, not a server signature. Transport authenticity relies on validated HTTPS. Cache merge deduplicates track/date and retains at most100 cards within30days of the newest available card. AtomicFile preserves the previous valid cache on network/parse/validation/write failure. Stable track IDs and full server contract coverage need joint validation against Core.
