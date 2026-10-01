#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

ALLOWED_RACE_DAY_STATUS={"unpublished","scheduled","live","official","cancelled"}
REQUIRED=("schemaVersion","revision","tracks","hypepredict","tv")
EXPECTED_SCORE_COMPONENTS={
    "hypePerformance":2.00,
    "raceStrength":1.20,
    "formTrend":1.00,
    "distanceSurfaceFit":1.60,
    "readinessFitness":0.75,
    "weight":0.45,
    "earlyPaceAbility":1.00,
    "raceShapePaceMatchup":1.00,
    "projectedTripPost":1.00,
}

def fail(msg):
    print("CONFIG INVALID:",msg,file=sys.stderr)
    raise SystemExit(1)

def number(v):
    return isinstance(v,(int,float)) and not isinstance(v,bool)

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
if not isinstance(data["hypepredict"],dict): fail("hypepredict must be object")
if not isinstance(data["tv"],dict): fail("tv must be object")

ids=[]
for i,t in enumerate(data["tracks"]):
    if not isinstance(t,dict): fail(f"tracks[{i}] must be object")
    if not isinstance(t.get("id"),str) or not t["id"].strip(): fail(f"tracks[{i}].id required")
    if not isinstance(t.get("name"),str) or not t["name"].strip(): fail(f"tracks[{i}].name required")
    declared=t.get("races",0)
    if not isinstance(declared,int) or declared<0: fail(f"tracks[{i}].races must be integer >= 0")
    ids.append(t["id"])
if len(ids)!=len(set(ids)): fail("duplicate track ids")

score_contract=data["hypepredict"].get("scoreContract")
if not isinstance(score_contract,dict): fail("hypepredict.scoreContract required")
components=score_contract.get("components")
if not isinstance(components,list) or len(components)!=9: fail("hypepredict.scoreContract.components must contain exactly 9 components")
actual={}
for i,c in enumerate(components):
    if not isinstance(c,dict): fail(f"hypepredict.scoreContract.components[{i}] must be object")
    cid=c.get("id"); weight=c.get("weight")
    if cid in actual: fail(f"hypepredict.scoreContract duplicate component {cid}")
    if cid not in EXPECTED_SCORE_COMPONENTS: fail(f"hypepredict.scoreContract unknown component {cid}")
    if not number(weight): fail(f"hypepredict.scoreContract.{cid}.weight must be numeric")
    actual[cid]=float(weight)
if set(actual)!=set(EXPECTED_SCORE_COMPONENTS): fail("hypepredict.scoreContract component ids changed")
for cid,expected in EXPECTED_SCORE_COMPONENTS.items():
    if abs(actual[cid]-expected)>1e-9: fail(f"hypepredict.scoreContract.{cid}.weight changed from {expected}")
if abs(sum(actual.values())-10.0)>1e-9: fail("HypeScore weights must total 10.00")
declared_total=score_contract.get("total",score_contract.get("scale"))
if not number(declared_total) or abs(float(declared_total)-10.0)>1e-9: fail("hypepredict.scoreContract total/scale must be 10.00")

race_days=data.get("raceDays",{})
if not isinstance(race_days,dict): fail("raceDays must be object")
for tid in ids:
    if tid not in race_days: fail(f"raceDays missing track {tid}")
for tid in race_days:
    if tid not in ids: fail(f"raceDays contains unknown track {tid}")

race_index={}
entry_index={}
for tid,day in race_days.items():
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
        if not isinstance(date,str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",date): fail(f"raceDays.{tid}.date must be YYYY-MM-DD when published")
    track=next(t for t in data["tracks"] if t["id"]==tid)
    if track.get("races",0)!=len(races): fail(f"tracks.{tid}.races does not match raceDays count")
    seen_races=set(); seen_numbers=set()
    for i,r in enumerate(races):
        if not isinstance(r,dict): fail(f"raceDays.{tid}.races[{i}] must be object")
        rid=r.get("id"); num=r.get("number")
        if not isinstance(rid,str) or not rid.strip(): fail(f"raceDays.{tid}.races[{i}].id required")
        if not isinstance(num,int) or num<1: fail(f"raceDays.{tid}.races[{i}].number must be integer >= 1")
        if rid in seen_races: fail(f"raceDays.{tid} duplicate race id {rid}")
        if num in seen_numbers: fail(f"raceDays.{tid} duplicate race number {num}")
        seen_races.add(rid); seen_numbers.add(num)
        entries=r.get("entries",[])
        if not isinstance(entries,list): fail(f"raceDays.{tid}.races[{i}].entries must be array")
        if status!="unpublished" and not entries: fail(f"raceDays.{tid}.races[{i}] must contain active entries")
        eids=set()
        for j,e in enumerate(entries):
            if not isinstance(e,dict): fail(f"raceDays.{tid}.races[{i}].entries[{j}] must be object")
            eid=e.get("id"); name=e.get("name")
            if not isinstance(eid,str) or not eid.strip(): fail(f"raceDays.{tid}.races[{i}].entries[{j}].id required")
            if not isinstance(name,str) or not name.strip(): fail(f"raceDays.{tid}.races[{i}].entries[{j}].name required")
            if eid in eids: fail(f"raceDays.{tid}.races[{i}] duplicate entry id {eid}")
            eids.add(eid); entry_index[eid]=(tid,rid,e)
        race_index[(tid,rid)]={"race":r,"entry_ids":eids}

analyses=data["hypepredict"].get("analyses",{})
if not isinstance(analyses,dict): fail("hypepredict.analyses must be object")
for key,a in analyses.items():
    if not isinstance(a,dict): fail(f"hypepredict.analyses.{key} must be object")
    tid=a.get("trackId"); rid=a.get("raceId")
    if not isinstance(tid,str) or not tid.strip(): fail(f"hypepredict.analyses.{key}.trackId required")
    if not isinstance(rid,str) or not rid.strip(): fail(f"hypepredict.analyses.{key}.raceId required")
    info=race_index.get((tid,rid))
    if info is None: fail(f"hypepredict.analyses.{key} references unknown Race Day {tid}/{rid}")
    horses=a.get("horses",[])
    if not isinstance(horses,list): fail(f"hypepredict.analyses.{key}.horses must be array")
    published=a.get("status")=="published"
    if published and len(horses)!=len(info["entry_ids"]): fail(f"hypepredict.analyses.{key} published field count does not match active Race Day entries")
    seen=set()
    for i,h in enumerate(horses):
        if not isinstance(h,dict): fail(f"hypepredict.analyses.{key}.horses[{i}] must be object")
        eid=h.get("entryId")
        if not isinstance(eid,str) or not eid.strip(): fail(f"hypepredict.analyses.{key}.horses[{i}].entryId required")
        if eid not in info["entry_ids"]: fail(f"hypepredict.analyses.{key}.horses[{i}] references unknown entry {eid}")
        if eid in seen: fail(f"hypepredict.analyses.{key} duplicate entry {eid}")
        seen.add(eid)
        declared=h.get("hypeScore")
        if published:
            if not number(declared) or float(declared)<0 or float(declared)>10: fail(f"hypepredict.analyses.{key}.horses[{i}].hypeScore must be numeric 0..10 when published")
        scores=h.get("scores")
        if scores is not None:
            if not isinstance(scores,dict) or set(scores)!=set(EXPECTED_SCORE_COMPONENTS): fail(f"hypepredict.analyses.{key}.horses[{i}].scores must contain exactly the 9 internal HypeScore components when present")
            total=0.0
            for cid,max_weight in EXPECTED_SCORE_COMPONENTS.items():
                value=scores[cid]
                if not number(value): fail(f"hypepredict.analyses.{key}.horses[{i}].scores.{cid} must be numeric")
                value=float(value)
                if value<0 or value>max_weight: fail(f"hypepredict.analyses.{key}.horses[{i}].scores.{cid} must be between 0 and {max_weight}")
                total+=value
            if number(declared) and abs(float(declared)-total)>0.011: fail(f"hypepredict.analyses.{key}.horses[{i}].hypeScore does not match component sum")

horse_data=data.get("horseData",{})
if not isinstance(horse_data,dict): fail("horseData must be object")
for key,record in horse_data.items():
    if not isinstance(key,str) or not key.strip(): fail("horseData keys must be non-empty entry ids")
    if not isinstance(record,dict): fail(f"horseData.{key} must be object")
    status=record.get("status","unpublished")
    if status not in {"unpublished","published"}: fail(f"horseData.{key}.status invalid")
    entry_id=record.get("entryId",key)
    if entry_id!=key: fail(f"horseData.{key}.entryId must match its key")
    if status=="published":
        if entry_id not in entry_index: fail(f"horseData.{key} references unknown Race Day entry")
        profile=record.get("profile")
        if not isinstance(profile,dict) or not isinstance(profile.get("name"),str) or not profile["name"].strip(): fail(f"horseData.{key}.profile.name required when published")
        pps=record.get("pps")
        if not isinstance(pps,list): fail(f"horseData.{key}.pps must be array when published")
        if profile["name"].strip().casefold()!=entry_index[entry_id][2]["name"].strip().casefold(): fail(f"horseData.{key}.profile.name must match Race Day entry")

print(f"CONFIG VALID: {path} · schema {data['schemaVersion']} · {len(ids)} tracks · revision {data['revision']} · dashboard-safe public HypeScores accepted")
