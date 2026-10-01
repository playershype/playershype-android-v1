#!/usr/bin/env python3
"""PlayersHype V0.1 config publisher contract.

Default mode is dry-run: validate a candidate config and emit the exact
publication payload. This script never writes GitHub by itself.
"""
import argparse, json, subprocess, sys
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("candidate", nargs="?", default="docs/app/config.json")
    ap.add_argument("--output", default="artifacts/v01-config-publication.json")
    args=ap.parse_args()
    candidate=Path(args.candidate)
    if not candidate.is_file():
        raise SystemExit(f"candidate not found: {candidate}")

    subprocess.run([sys.executable,"scripts/validate_v01_config.py",str(candidate)],check=True)
    data=json.loads(candidate.read_text(encoding="utf-8"))
    payload={
        "contract":"playershype-v0.1-config-publication",
        "mode":"dry-run",
        "target":{"branch":"main","path":"docs/app/config.json"},
        "schemaVersion":data["schemaVersion"],
        "revision":data["revision"],
        "config":data,
    }
    out=Path(args.output)
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"DRY RUN READY: {out}")
    print("TARGET: main/docs/app/config.json")
    print(f"REVISION: {data['revision']}")

if __name__=="__main__":
    main()
