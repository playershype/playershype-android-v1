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
has_race_days="raceDays" in data
race_days=data.get("raceDays",{})
if not isinstance(race_days,dict): fail("raceDays must be object")
if has_race_days:
    for tid in ids:
        if tid not in race_days: fail(f"raceDays missing track {tid}")
for tid,day in race_days.items():
    if tid not in ids: fail(f"raceDays contains unknown track {tid}")
    if not isinstance(day,dict): fail(f"raceDays.{tid} must be object")
    status=day.get("status","unpublished")
    if status not in ALLOWED_RACE_DAY_STATUS: fail(f"raceDays.{tid}.status invalid")
    races=day.get("races",[])
    if not isinstance(races,list): fail(f"raceDays.{tid}.races must be array")
    date=day.get("date")
    if status=="unpublished":
        if date is not None: fail(f"raceDays.{tid}.date must be null while unpublished")
        if races: fail(f"raceDays.{tid}.races must be empty while unpublished")
    else:
        if not isinstance(date,str) or not __import__("re").fullmatch(r"\\d{4}-\\d{2}-\\d{2}",date):
            fail(f"raceDays.{tid}.date must be YYYY-MM-DD when published")
    race_ids=set(); race_numbers=set()
    for i,r in enumerate(races):
        if not isinstance(r,dict): fail(f"raceDays.{tid}.races[{i}] must be object")
        rid=r.get("id"); num=r.get("number")
        if not isinstance(rid,str) or not rid.strip(): fail(f"raceDays.{tid}.races[{i}].id required")
        if not isinstance(num,int) or num<1: fail(f"raceDays.{tid}.races[{i}].number must be integer >= 1")
        if rid in race_ids: fail(f"raceDays.{tid} duplicate race id {rid}")
        if num in race_numbers: fail(f"raceDays.{tid} duplicate race number {num}")
        race_ids.add(rid); race_numbers.add(num)
        entries=r.get("entries",[])
        if not isinstance(entries,list): fail(f"raceDays.{tid}.races[{i}].entries must be array")
        entry_ids=set()
        for j,e in enumerate(entries):
            if not isinstance(e,dict): fail(f"raceDays.{tid}.races[{i}].entries[{j}] must be object")
            eid=e.get("id")
            if not isinstance(eid,str) or not eid.strip(): fail(f"raceDays.{tid}.races[{i}].entries[{j}].id required")
            if not isinstance(e.get("name"),str) or not e["name"].strip(): fail(f"raceDays.{tid}.races[{i}].entries[{j}].name required")
            if eid in entry_ids: fail(f"raceDays.{tid}.races[{i}] duplicate entry id {eid}")
            entry_ids.add(eid)
    track=next(t for t in data["tracks"] if t["id"]==tid)
    declared=track.get("races",0)
    if not isinstance(declared,int) or declared<0: fail(f"tracks.{tid}.races must be integer >= 0")
    if declared!=len(races): fail(f"tracks.{tid}.races {declared} does not match raceDays count {len(races)}")
# HypePredict publication integrity: analyses may only reference races and
# entries that exist in the published Race Day contract.
analyses=data["hypepredict"].get("analyses",{})
if not isinstance(analyses,dict): fail("hypepredict.analyses must be object")
race_index={}
for tid,day in race_days.items():
    for r in day.get("races",[]):
        race_index[(tid,r["id"])]=r
for key,a in analyses.items():
    if not isinstance(a,dict): fail(f"hypepredict.analyses.{key} must be object")
    tid=a.get("trackId"); rid=a.get("raceId")
    if not isinstance(tid,str) or not tid.strip(): fail(f"hypepredict.analyses.{key}.trackId required")
    if not isinstance(rid,str) or not rid.strip(): fail(f"hypepredict.analyses.{key}.raceId required")
    race=race_index.get((tid,rid))
    if race is None: fail(f"hypepredict.analyses.{key} references unknown Race Day {tid}/{rid}")
    horses=a.get("horses",[])
    if not isinstance(horses,list): fail(f"hypepredict.analyses.{key}.horses must be array")
    valid_entries={e["id"] for e in race.get("entries",[])}
    seen=set()
    for i,h in enumerate(horses):
        if not isinstance(h,dict): fail(f"hypepredict.analyses.{key}.horses[{i}] must be object")
        eid=h.get("entryId")
        if not isinstance(eid,str) or not eid.strip(): fail(f"hypepredict.analyses.{key}.horses[{i}].entryId required")
        if eid not in valid_entries: fail(f"hypepredict.analyses.{key}.horses[{i}] references unknown entry {eid}")
        if eid in seen: fail(f"hypepredict.analyses.{key} duplicate entry {eid}")
        seen.add(eid)
print(f"CONFIG VALID: {path} · schema {data['schemaVersion']} · {len(ids)} tracks · revision {data['revision']} · raceDays synchronized")
