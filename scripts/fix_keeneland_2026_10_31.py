#!/usr/bin/env python3
"""Repair a misclassified, previously sealed Keeneland report without rescoring."""
import copy
import json
import subprocess
from pathlib import Path

OLD_SHA = "7d9ea362735223062bc18d52dd7823701ea9e353"
OLD_PREFIX = "belmont-2026-10-31-"
NEW_PREFIX = "keeneland-2026-10-31-"
TARGET_DATE = "2026-10-31"
OUTPUT = Path("/tmp/playershype-keeneland-2026-10-31-repaired.json")

def require(condition, message):
    if not condition:
        raise RuntimeError("REPARACION DETENIDA: " + message)

def run(*args):
    return subprocess.check_output(["git", *args], text=True).strip()

def deep_rename(v):
    if isinstance(v, list):
        return [deep_rename(x) for x in v]
    if isinstance(v, dict):
        return {(NEW_PREFIX + k[len(OLD_PREFIX):] if k.startswith(OLD_PREFIX) else k): deep_rename(x)
                for k, x in v.items()}
    if isinstance(v, str) and v.startswith(OLD_PREFIX):
        return NEW_PREFIX + v[len(OLD_PREFIX):]
    return v

def main():
    run("fetch","origin","main","v0.1-stitch-clean")
    for ref in ["origin/main","origin/v0.1-stitch-clean"]:
        require(run("rev-parse",f"{ref}:docs/app/config.json")==OLD_SHA, 
                f"{ref} cambió, no se sobrescribe")
    old = json.loads(subprocess.check_output(
        ["git","show","origin/main:docs/app/config.json"],text=True))
    raw = old["hypepredict"]["latestReport"]["rawReport"]
    require(raw.startswith("🧠🔥 HYPEPREDICT — KEENELAND\n"), "encabezado no confirma Keeneland")
    require("Hipódromo: Keeneland" in raw[:300], "hipódromo original no confirma Keeneland")
    require(old["hypepredict"]["latestReport"]["trackId"]=="belmont", "error original no localizado")
    require(old["raceDays"]["belmont"]["date"]==TARGET_DATE, "Belmont no contiene la jornada incorrecta")
    require(old["raceDays"]["keeneland"]["date"]=="2026-10-04", "histórico Keeneland diferente")
    bel_prev=old["raceDayHistory"]["belmont"]["2026-10-16"]["day"]
    require(bel_prev["date"]=="2026-10-16" and len(bel_prev["races"])==9,
            "no existe Belmont anterior para restaurar")
    wrong=old["raceDays"]["belmont"]
    require(len(wrong["races"])==12 and sum(len(x["entries"]) for x in wrong["races"])==131,
            "jornada incorrecta no tiene 12 carreras y 131 ejemplares")
    current=copy.deepcopy(old)
    old_keeneland=copy.deepcopy(old["raceDays"]["keeneland"])
    require("2026-10-04" not in current.get("raceDayHistory",{}).get("keeneland",{}),
            "ya existe historial de Keeneland para 4 de octubre")

    snapshot={"day":old_keeneland,"analyses":{},"horseData":{}}
    for race in old_keeneland["races"]:
        if race["id"] in old["hypepredict"]["analyses"]:
            snapshot["analyses"][race["id"]]=copy.deepcopy(old["hypepredict"]["analyses"][race["id"]])
        for horse in race["entries"]:
            if horse["id"] in old["horseData"]:
                snapshot["horseData"][horse["id"]]=copy.deepcopy(old["horseData"][horse["id"]])
    current.setdefault("raceDayHistory",{}).setdefault("keeneland",{})["2026-10-04"]=snapshot

    current["raceDays"]["keeneland"]=deep_rename(wrong)
    current["raceDays"]["belmont"]=copy.deepcopy(bel_prev)
    old_analyses=old["hypepredict"]["analyses"]
    moving_a={k:v for k,v in old_analyses.items() if k.startswith(OLD_PREFIX)}
    moving_h={k:v for k,v in old["horseData"].items() if k.startswith(OLD_PREFIX)}
    require(len(moving_a)==12 and len(moving_h)==131, "análisis o ejemplares mal asociados incompletos")
    require(not any(k.replace(OLD_PREFIX,NEW_PREFIX,1) in old_analyses for k in moving_a),
            "IDs Keeneland ya existen, no sobrescribir")
    require(not any(k.replace(OLD_PREFIX,NEW_PREFIX,1) in old["horseData"] for k in moving_h),
            "datos de Keeneland ya existen, no sobrescribir")
    for k,v in moving_a.items():
        renamed=deep_rename(v)
        renamed["trackId"]="keeneland"
        current["hypepredict"]["analyses"].pop(k)
        current["hypepredict"]["analyses"][NEW_PREFIX+k[len(OLD_PREFIX):]]=renamed
    for k,v in moving_h.items():
        current["horseData"].pop(k)
        current["horseData"][NEW_PREFIX+k[len(OLD_PREFIX):]]=deep_rename(v)
    current["hypepredict"]["latestReport"]["trackId"]="keeneland"
    current["revision"]=old["revision"]+"-keeneland-corrected"
    bel_t=next((t for t in current["tracks"] if t["id"]=="belmont"),None)
    require(bel_t is not None,"track Belmont no existe")
    bel_t["races"]=9
    bel_t["status"]=bel_prev["status"]
    require(not any(t["id"]=="keeneland" for t in current["tracks"]),"Keeneland ya existe en catálogo")
    current["tracks"].append({
        "id":"keeneland","name":"Keeneland","image":"","status":"scheduled",
        "races":12,"featured":False
    })

    require(len(current["hypepredict"]["analyses"])==len(old["hypepredict"]["analyses"]),"análisis perdidos")
    require(len(current["horseData"])==len(old["horseData"]),"ejemplares perdidos")
    require(all(current["hypepredict"]["analyses"][k]==v for k,v in old_analyses.items()
                if not k.startswith(OLD_PREFIX)), "análisis previos modificados")
    require(all(current["horseData"][k]==v for k,v in old["horseData"].items()
                if not k.startswith(OLD_PREFIX)), "otros caballos modificados")
    require(all(current["raceDays"][k]==v for k,v in old["raceDays"].items()
                if k not in ("belmont","keeneland")), "otra pista alterada")
    require(all(current["raceDayHistory"][k][dt]==v for k,days in old["raceDayHistory"].items()
                for dt,v in days.items()), "historial anterior alterado")
    require(all(current[k]==old[k] for k in old
                if k not in ("revision","tracks","raceDays","horseData","hypepredict","raceDayHistory")),
            "otra configuración modificada")
    for race in current["raceDays"]["keeneland"]["races"]:
        rid=race["id"]
        a=current["hypepredict"]["analyses"].get(rid)
        require(rid.startswith(NEW_PREFIX) and a and a["trackId"]=="keeneland",
                "ID de carrera inconsistente")
        entry_ids={h["id"] for h in race["entries"]}
        require(len(entry_ids)==len(race["entries"]), "IDs de caballo duplicados")
        require(all(id.startswith(NEW_PREFIX) and id in current["horseData"] for id in entry_ids),
                "referencias horseData rotas")
        require(entry_ids=={h["entryId"] for h in a["horses"]}, "análisis y campo no corresponden")
    require(current["raceDays"]["belmont"]==bel_prev, "Belmont histórico no restaurado")
    require(current["raceDayHistory"]["keeneland"]["2026-10-04"]["day"]==old_keeneland,
            "Keeneland anterior no conservado")
    require(current["hypepredict"]["latestReport"]["rawReport"]==raw,
            "análisis sellado alterado")
    OUTPUT.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("VALIDADO: Keeneland 2026-10-31 / 12 carreras / 131 ejemplares")
    print("CONSERVADOS: Belmont 2026-10-16, Keeneland 2026-10-04, Camarero y demás")
    print("SIN CAMBIAR: HypeScore, orden, roles, puntajes, contenido del análisis")
    print("REVISION:",current["revision"])

if __name__=="__main__":
    main()
