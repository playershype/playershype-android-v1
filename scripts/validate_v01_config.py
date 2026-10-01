#!/usr/bin/env python3
import json, sys
from pathlib import Path

ALLOWED_RACE_DAY_STATUS={"unpublished","scheduled","live","official","cancelled"}
REQUIRED=("schemaVersion","revision","tracks","hypepredict","tv")

def fail(msg):
    print("CONFIG INVALID:",msg,file=sys.stderr)
    raise SystemExit(1)

path=Path(sys.argv[1] if len(sys.argv)>1 else "docs/app/config.json")
try:
    data=json.loads(path.read_text(encoding="utf-8"))
except Exception as e:
    fail(f"cannot parse {path}: {e}")

for key in REQUIRED:
    if key not in data: fail(f"missing {key}")
if not isinstance(data["schemaVersion"],int) or data["schemaVersion"]<2: fail("schemaVersion must be integer >= 2")
if not isinstance(data["revision"],str) or not data["revision"].strip(): fail("revision required")
if not isinstance(data["tracks"],list): fail("tracks must be an array")
ids=[]
for i,t in enumerate(data["tracks"]):
    if not isinstance(t,dict): fail(f"tracks[{i}] must be object")
    if not isinstance(t.get("id"),str) or not t["id"].strip(): fail(f"tracks[{i}].id required")
    if not isinstance(t.get("name"),str) or not t["name"].strip(): fail(f"tracks[{i}].name required")
    ids.append(t["id"])
if len(ids)!=len(set(ids)): fail("duplicate track ids")
if not isinstance(data["hypepredict"],dict): fail("hypepredict must be object")
if not isinstance(data["tv"],dict): fail("tv must be object")
race_days=data.get("raceDays",{})
if not isinstance(race_days,dict): fail("raceDays must be object")
for tid,day in race_days.items():
    if tid not in ids: fail(f"raceDays contains unknown track {tid}")
    if not isinstance(day,dict): fail(f"raceDays.{tid} must be object")
    if day.get("status","unpublished") not in ALLOWED_RACE_DAY_STATUS: fail(f"raceDays.{tid}.status invalid")
    if not isinstance(day.get("races",[]),list): fail(f"raceDays.{tid}.races must be array")
print(f"CONFIG VALID: {path} · schema {data['schemaVersion']} · {len(ids)} tracks · revision {data['revision']}")
