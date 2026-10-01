# HypePredict analytical contract — LAB V1-X / Dashboard Safe v3.0

## Authority
This document records the analytical contract supplied by PlayersHype on 2026-10-01.
Internal engine identity: HypePredict LAB V1-X, experimental challenger.
Public identity remains exactly: HYPEPREDICT — [HIPÓDROMO].
Never expose LAB, V1-X, Experimental, or internal factor fields in standard Dashboard output.

## Core rule
Change the analytical engine. Do not change the public Dashboard output contract.

## Internal HypeScore — 10.00
PERFORMANCE — 4.20
- HypePerformance / Speed: 2.00
- Race Strength: 1.20
- Form Trend: 1.00

FIT — 2.80
- Distance / Surface Fit: 1.60
- Readiness / Fitness: 0.75
- Weight: 0.45

DYNAMICS — 3.00
- Early Pace Ability: 1.00
- Race Shape / Pace Matchup: 1.00
- Projected Trip / Post: 1.00

Total: 10.00.

Consistency, Value, HypeConfidence, Coverage, HypeBet and HypePick are outside HypeScore.

## Data integrity
Never invent data. Missing data must use the official public substitutes:
- No disponible
- Nada reciente (workouts only)
- No aplica
- No cuantificable (price/value when objective reference is insufficient)

Missing evidence primarily reduces HypeConfidence and must not be double-penalized.

## Scratches and official changes
Admin/input layer may provide official scratches, track condition, surface changes, jockey changes, equipment/status changes and other confirmed changes.

On a confirmed scratch:
1. report the scratched horse and reason when supplied;
2. remove the horse from the active analytical field;
3. recalculate relative Early Pace Ability;
4. rebuild Race Shape;
5. review Projected Trip;
6. review affected HypeScores;
7. recalculate Gap;
8. recalculate HypeConfidence if materially affected;
9. recalculate Coverage;
10. recalculate HypeBet;
11. recalculate HypePick.

A scratch changes today's scenario, not historical Performance.

Surface changes (for example Turf -> Dirt) require re-evaluation of Distance/Surface Fit, Race Shape, Projected Trip and HypeConfidence, plus any affected strategy.

## Contextual adjustment
Final contextual adjustment is limited to +0.30 / -0.30 and only for confirmed material information not already incorporated into the nine factors. No double counting.

## HypeConfidence
Outside HypeScore. Publish for every active participant using 1–5 stars.

## Value
Outside HypeScore. Do not convert HypeScore directly to probability. Quantitative Value Edge is allowed only with an explicit calibrated probability method; otherwise: No cuantificable.

## Public Dashboard structures that must remain
- HypeScore
- Confiabilidad
- QUICK HITS
- Pace Projection
- HypeBoard
- Checklist
- Control de Riesgo
- Pool Intelligence
- HypeBet
- HypePick 6
- Conclusión
- Veredicto Final

Do not expose internal fields such as HypePerformance, Race Strength, Form Trend, Early Pace Ability, Race Shape, Readiness, Performance Score, Fit Score or Dynamics Score in standard Dashboard mode.

## Input request
Canonical request intent:
Analiza de la (CARRERA #) a la (CARRERA #) del (HIPÓDROMO X) para (FECHA).

Admin must support:
- track
- date
- race range
- official source documents/data
- official track/surface condition
- official scratches with race, number, horse and reason when supplied
- official changes, including surface and jockey changes
- last update / first post when supplied

## Pre-race seal
The standard report is pre-race and immutable after publication. Results must never be used retrospectively to alter original HypeScores, ranking, roles, HypeConfidence, Value, Fijo or HypePick.
