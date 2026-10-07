#!/usr/bin/env python3
"""Generate the public HypePredict archive from a PRIVATE reviewed JSON export.

Usage:
  python scripts/build_postmortem_archive.py /secure/reviewed-postmortems.json docs/hypepredict/archive/verified.json
Never commit the private input file. Do not run automatically on arbitrary submissions.
"""
import argparse
import datetime as dt
import json
import pathlib
import sys
from urllib.parse import urlparse

REQUIRED = ("track_id", "race_date", "race_number", "select_number",
            "official_winner_number", "race_start_timestamp",
            "original_publication_timestamp", "original_publication_url",
            "official_result_url", "approved_at", "result_verified_at",
            "published_at", "reviewed_by", "source_quality", "status")

def timestamp(s):
    try:
        value = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        if value.tzinfo is None:
            raise ValueError("Timezone required")
        return value
    except (ValueError, TypeError) as exc:
        raise ValueError("Invalid timezone-aware timestamp") from exc

def https_url(s):
    u = urlparse(str(s))
    return u.scheme == "https" and bool(u.netloc)

def certify(record):
    missing = [k for k in REQUIRED if record.get(k) in (None, "")]
    if missing:
        raise ValueError("Missing fields: " + ", ".join(missing))
    if record["status"] != "published" or record["source_quality"] != "verified_pre_race":
        raise ValueError("Not approved for certified public archive")
    if not isinstance(record["track_id"], str) or not record["track_id"].strip():
        raise ValueError("Invalid track")
    try:
        dt.date.fromisoformat(record["race_date"])
    except (ValueError, TypeError) as exc:
        raise ValueError("Invalid race date") from exc
    for field in ("race_number", "select_number", "official_winner_number"):
        if type(record[field]) is not int or record[field] < 1:
            raise ValueError("Invalid " + field)
    if timestamp(record["original_publication_timestamp"]) >= timestamp(record["race_start_timestamp"]):
        raise ValueError("Original prediction must predate scheduled race start")
    if timestamp(record["approved_at"]) > timestamp(record["published_at"]):
        raise ValueError("Approval must predate publication")
    for field in ("original_publication_url", "official_result_url"):
        if not https_url(record[field]):
            raise ValueError("Invalid HTTPS evidence URL: " + field)
    if not str(record["reviewed_by"]).strip():
        raise ValueError("Reviewer required")
    # The reviewer must inspect evidence manually: a URL and timestamp alone are NOT proof.
    fields = REQUIRED + ("track_name", "rival_number", "tapada_number",
                         "huevazo_number", "error_analysis", "revision",
                         "model_version", "correction_reason")
    return {k: record[k] for k in fields if k in record}

def build(source):
    if not isinstance(source, dict) or not isinstance(source.get("records"), list):
        raise ValueError("Input must contain a records array")
    seen = set()
    certified = []
    for i, r in enumerate(source["records"]):
        try:
            row = certify(r)
            key = (row["track_id"], row["race_date"], row["race_number"])
            if key in seen:
                raise ValueError("Duplicate race key")
            seen.add(key)
            certified.append(row)
        except (ValueError, TypeError, KeyError) as exc:
            raise ValueError(f"Record {i + 1}: {exc}") from exc
    certified.sort(key=lambda r: (r["race_date"], r["track_id"], r["race_number"]))
    return {"schemaVersion": 1, "records": certified}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("private_input")
    parser.add_argument("public_output")
    args = parser.parse_args()
    private = pathlib.Path(args.private_input).resolve()
    public = pathlib.Path(args.public_output).resolve()
    if private == public:
        parser.error("Input and output cannot be the same file")
    try:
        data = build(json.loads(private.read_text(encoding="utf-8")))
        public.parent.mkdir(parents=True, exist_ok=True)
        temporary = public.with_suffix(public.suffix + ".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(public)
        print(f"Validated {len(data['records'])} certified records; wrote {public}")
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"PUBLICATION BLOCKED: {exc}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
