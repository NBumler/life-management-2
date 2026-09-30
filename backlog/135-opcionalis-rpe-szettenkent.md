---
id: 135
type: change-request
status: ready
title: "Opcionális RPE szettenként (cél a sablonban, tényleges az edzésnaplóban)"
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
flag:
created: 2026-10-01
closed:
---

# 135 — Opcionális RPE szettenként

## Motiváció / probléma

Az edzés-elemzés fő szabálya a munkaszetteknél: RPE 8–9, azaz 1–2 ismétlés tartalék, és soha
nem bukásig. Hogy ez teljesül-e, csak akkor derül ki, ha rögzíthető. Az RPE a progresszió-javaslatot
(backlog/131) is pontosítja: RPE 10-es munkaszett után nincs emelés-javaslat.

## Jelenlegi működés

[[Heti terv]] „Entitás — WorkoutPlanExercise”: a spec kimondja, hogy **nincs** külön
intenzitás-mező. A `FAILURE` típus jelzi a bukásig menő szettet, minden más `WORKING` szett
hallgatólagosan RIR 1–2. Ez a jegy ezt a döntést módosítja: opcionális, nem kötelező mező.

## Elfogadási kritériumok

- [ ] Nullable `rpe` (6–10, 0,5-ös lépés) a `WorkoutSetEntry`-n (tényleges) és a
      `WorkoutPlanSet`-en (cél). Flyway CHECK + OpenAPI + SQLite + outbox-verzió.
- [ ] Az UI-n nem kap külön oszlopot (360 px!): a szett-típus popoverben állítható, és a jelvény
      mellett kicsiben látszik (pl. „M·8”). Ha van cél-RPE, a session szett azzal
      előtöltődik.
- [ ] A progresszió-javaslat (backlog/131) figyelembe veszi: ha a munkaszettek bármelyike RPE 10,
      nincs emelés-javaslat.
- [ ] [[Heti terv]] „nincs intenzitás mező” mondata átírva; [[Edzésnapló]] frissítve.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]], [[Heti terv]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
