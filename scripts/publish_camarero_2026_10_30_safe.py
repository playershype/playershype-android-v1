#!/usr/bin/env python3
"""One-day, non-destructive HypePredict publication. Stop on any unexpected source data."""
import copy
import json
import os
from pathlib import Path
import subprocess

EXPECTED_BLOB = "cbd70d02fc806b0622a3933602a82c17ac86aa3f"
DATE = "2026-10-30"
OLD_DATE = "2026-10-29"
TARGET = "camarero"
CANDIDATE_PATH = "docs/hypepredict/pending/camarero-2026-10-30.json"
OUT = "/tmp/playershype-safe-publish-2026-10-30.json"

def require(ok, msg):
    if not ok:
        raise RuntimeError("PUBLICACION DETENIDA: " + msg)

def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()

def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def main():
    require(git("rev-parse", "origin/main:docs/app/config.json") == EXPECTED_BLOB,
            "main/docs/app/config.json cambio desde la auditoria")
    require(git("rev-parse", "origin/v0.1-stitch-clean:docs/app/config.json") == EXPECTED_BLOB,
            "staging/docs/app/config.json cambio desde la auditoria")
    old = json.loads(subprocess.check_output(["git", "show", "origin/main:docs/app/config.json"], text=True))
    cand = load(CANDIDATE_PATH)
    require(cand.get("schemaVersion") == old.get("schemaVersion") == 2, "version del schema")
    require(cand.get("revision") == "v0.1-admin-2026-10-30T14-00-23-333Z", "revision desconocida")
    require(cand.get("hypepredict", {}).get("scoreContract") == old["hypepredict"]["scoreContract"],
            "contrato HypePredict no coincide")
    require(old["raceDays"][TARGET].get("date") == OLD_DATE, "jornada previa no es 29 oct")
    require(cand["raceDays"][TARGET].get("date") == DATE, "fecha de jornada entrante")
    day = cand["raceDays"][TARGET]
    races = day["races"]
    require(len(races) == 7 and sum(len(r["entries"]) for r in races) == 52,
            "el paquete debe tener 7 carreras y 52 ejemplares")
    require(sorted(r["number"] for r in races) == list(range(1, 8)), "numeracion de carreras")
    analyses = cand["hypepredict"]["analyses"]
    horses = cand["horseData"]
    require(len(analyses) == 7 and len(horses) == 52, "conteos de analisis y datos")
    seen = set()
    for r in races:
        require(r["id"] in analyses, "falta analisis para " + r["id"])
        ids = [e["id"] for e in r["entries"]]
        require(len(ids) == len(set(ids)), "ejemplares duplicados")
        require(set(ids) == {h["entryId"] for h in analyses[r["id"]]["horses"]},
                "inconsistencia de referencias " + r["id"])
        require(all(i in horses and horses[i].get("entryId") == i for i in ids),
                "horseData incompleto")
        seen.update(ids)
    require(len(seen) == 52, "identificadores de ejemplares repetidos")
    require(old["raceDayHistory"].get(TARGET, {}).get(DATE) is None,
            "ya hay historial del 30 de octubre; no sobreescribir")
    require(not any(i in old["horseData"] for i in horses), "IDs de ejemplares ya publicados")
    require(not any(i in old["hypepredict"]["analyses"] for i in analyses), "analisis ya publicados")

    updated = copy.deepcopy(old)
    previous = copy.deepcopy(old["raceDays"][TARGET])
    updated.setdefault("raceDayHistory", {}).setdefault(TARGET, {})
    if OLD_DATE not in updated["raceDayHistory"][TARGET]:
        snapshot = {"day": previous, "analyses": {}, "horseData": {}}
        for r in previous["races"]:
            if r["id"] in old["hypepredict"]["analyses"]:
                snapshot["analyses"][r["id"]] = old["hypepredict"]["analyses"][r["id"]]
            for e in r["entries"]:
                if e["id"] in old["horseData"]:
                    snapshot["horseData"][e["id"]] = old["horseData"][e["id"]]
        updated["raceDayHistory"][TARGET][OLD_DATE] = snapshot

    updated["revision"] = cand["revision"]
    updated["raceDays"][TARGET] = copy.deepcopy(day)
    match = [t for t in updated["tracks"] if t["id"] == TARGET]
    require(len(match) == 1, "registro de Camarero ausente")
    match[0]["races"] = 7
    match[0]["status"] = day["status"]
    updated["hypepredict"]["analyses"].update(copy.deepcopy(analyses))
    updated["hypepredict"]["latestReport"] = copy.deepcopy(cand["hypepredict"]["latestReport"])
    updated["horseData"].update(copy.deepcopy(horses))

    for key in old:
        require(key in updated, "se perdio la seccion " + key)
        if key not in ("revision", "raceDays", "raceDayHistory", "hypepredict", "horseData", "tracks"):
            require(updated[key] == old[key], "se altero seccion protegida " + key)
    for tid in old["raceDays"]:
        if tid != TARGET:
            require(updated["raceDays"][tid] == old["raceDays"][tid], "se altero dia de " + tid)
    for t in old["tracks"]:
        if t["id"] != TARGET:
            require(next(x for x in updated["tracks"] if x["id"] == t["id"]) == t, "se altero otro hipodromo")
    require(all(updated["hypepredict"]["analyses"][k] == v for k,v in old["hypepredict"]["analyses"].items()),
            "se modificaron analisis previos")
    require(all(updated["horseData"][k] == v for k,v in old["horseData"].items()),
            "se modificaron ejemplares previos")
    require(all(updated["raceDayHistory"][k][date] == val
                for k,days in old["raceDayHistory"].items() for date,val in days.items()),
            "se modifico historial previo")
    require(updated["raceDayHistory"][TARGET][OLD_DATE]["day"]["date"] == OLD_DATE,
            "no se respaldo la jornada anterior")

    Path(OUT).write_text(json.dumps(updated, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("VALIDADO: 30 OCT, 7 CARRERAS, 52 EJEMPLARES")
    print("INTACTOS: OTROS HIPODROMOS, JORNADAS, ANALISIS Y CONFIGURACIONES")
    print("ANALISIS ACUMULADOS:", len(updated["hypepredict"]["analyses"]))
    print("EJEMPLARES ACUMULADOS:", len(updated["horseData"]))
    print("ARCHIVO:", OUT)

if __name__ == "__main__":
    main()
