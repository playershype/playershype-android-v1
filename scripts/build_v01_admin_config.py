#!/usr/bin/env python3
import argparse, copy, json, subprocess, sys, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"docs/app/config.json"
VALIDATOR=ROOT/"scripts/validate_v01_config.py"
LOCKED_SCORE_IDS=("pace","trip","class","distance","form","consistency","weight","workouts")

def die(msg):
    print("ADMIN CONFIG ERROR:",msg,file=sys.stderr)
    raise SystemExit(1)

def main():
    ap=argparse.ArgumentParser(description="Build a PlayersHype V0.1 config candidate from an Admin draft.")
    ap.add_argument("draft")
    ap.add_argument("--output",default="/tmp/playershype-v01-admin-candidate.json")
    args=ap.parse_args()
    base=json.loads(BASE.read_text(encoding="utf-8"))
    draft=json.loads(Path(args.draft).read_text(encoding="utf-8"))
    if not isinstance(draft,dict): die("draft must be a JSON object")

    allowed={"revision","home","live","channels","tracks","tv","latest","raceDays","horseData","hypepredict"}
    unknown=set(draft)-allowed
    if unknown: die("unsupported Admin fields: "+", ".join(sorted(unknown)))

    candidate=copy.deepcopy(base)
    for key in allowed-{"hypepredict"}:
        if key in draft: candidate[key]=copy.deepcopy(draft[key])

    if "hypepredict" in draft:
        hp=draft["hypepredict"]
        if not isinstance(hp,dict): die("hypepredict draft must be object")
        illegal=set(hp)-{"title","description","image","version","analyses"}
        if illegal: die("HypePredict Admin cannot change protected fields: "+", ".join(sorted(illegal)))
        for key,value in hp.items(): candidate["hypepredict"][key]=copy.deepcopy(value)

    # HypeScore V1 is immutable from Admin.
    if tuple(x["id"] for x in candidate["hypepredict"]["scoreContract"]["components"])!=LOCKED_SCORE_IDS:
        die("protected HypeScore component order changed")

    out=Path(args.output)
    out.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    subprocess.run([sys.executable,str(VALIDATOR),str(out)],check=True)
    print(f"ADMIN CONFIG VALID: {out}")

if __name__=="__main__":
    main()
