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
# HypeScore V1 is a fixed 10.00-point contract. Do not silently normalize or
# accept altered component weights.
EXPECTED_SCORE_COMPONENTS={
    "pace":1.45,
    "trip":1.00,
    "class":2.20,
    "distance":1.90,
    "form":1.50,
    "consistency":1.05,
    "weight":0.60,
    "workouts":0.30,
}
score_contract=data["hypepredict"].get("scoreContract")
if not isinstance(score_contract,dict): fail("hypepredict.scoreContract required")
components=score_contract.get("components")
if not isinstance(components,list) or len(components)!=8: fail("hypepredict.scoreContract.components must contain exactly 8 components")
actual={}
for i,component in enumerate(components):
    if not isinstance(component,dict): fail(f"hypepredict.scoreContract.components[{i}] must be object")
    cid=component.get("id"); weight=component.get("weight")
    if cid in actual: fail(f"hypepredict.scoreContract duplicate component {cid}")
    if cid not in EXPECTED_SCORE_COMPONENTS: fail(f"hypepredict.scoreContract unknown component {cid}")
    if not isinstance(weight,(int,float)) or isinstance(weight,bool): fail(f"hypepredict.scoreContract.{cid}.weight must be numeric")
    actual[cid]=float(weight)
if set(actual)!=set(EXPECTED_SCORE_COMPONENTS): fail("hypepredict.scoreContract component ids changed")
for cid,expected in EXPECTED_SCORE_COMPONENTS.items():
    if abs(actual[cid]-expected)>1e-9: fail(f"hypepredict.scoreContract.{cid}.weight changed from {expected}")
if abs(sum(actual.values())-10.0)>1e-9: fail("HypeScore weights must total 10.00")
declared_total=score_contract.get("total",score_contract.get("scale"))
if not isinstance(declared_total,(int,float)) or isinstance(declared_total,bool) or abs(float(declared_total)-10.0)>1e-9:
    fail("hypepredict.scoreContract total/scale must be 10.00")

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
        if a.get("status")=="published":
            scores=h.get("scores")
            if not isinstance(scores,dict): fail(f"hypepredict.analyses.{key}.horses[{i}].scores required when published")
            if set(scores)!=set(EXPECTED_SCORE_COMPONENTS):
                fail(f"hypepredict.analyses.{key}.horses[{i}].scores must contain exactly the 8 HypeScore components")
            total=0.0
            for cid,max_weight in EXPECTED_SCORE_COMPONENTS.items():
                value=scores.get(cid)
                if not isinstance(value,(int,float)) or isinstance(value,bool):
                    fail(f"hypepredict.analyses.{key}.horses[{i}].scores.{cid} must be numeric")
                value=float(value)
                if value<0 or value>max_weight:
                    fail(f"hypepredict.analyses.{key}.horses[{i}].scores.{cid} must be between 0 and {max_weight}")
                total+=value
            declared=h.get("hypeScore")
            if not isinstance(declared,(int,float)) or isinstance(declared,bool):
                fail(f"hypepredict.analyses.{key}.horses[{i}].hypeScore required when published")
            if abs(float(declared)-total)>0.011:
                fail(f"hypepredict.analyses.{key}.horses[{i}].hypeScore does not match component sum")
            if total<0 or total>10.0+1e-9:
                fail(f"hypepredict.analyses.{key}.horses[{i}].hypeScore outside 0..10")
print(f"CONFIG VALID: {path} · schema {data['schemaVersion']} · {len(ids)} tracks · revision {data['revision']} · raceDays synchronized")
