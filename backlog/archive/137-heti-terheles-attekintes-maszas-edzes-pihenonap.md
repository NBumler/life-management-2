---
id: 137
type: feature
status: done
title: "Heti terhelés-áttekintés: mászás + otthoni edzés + pihenőnap egy 7 napos sávon"
specs:
  - "[[Heti terv]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 137 — Heti terhelés-áttekintés

## Motiváció / probléma

Az edzés-elemzés dinamikus mátrixa (OAPU-fókusz × kevés/sok mászás) azon múlik, hány napot
mászott a user az adott héten, és volt-e 1–2 teljes pihenőnapja. Az app mindkét adatot tárolja
(Mászónapló + Edzésnapló), de sehol nem mutatja őket együtt.

## Jelenlegi működés

[[Heti terv]] heti dashboard: 7 nap, naponként sablon-slot + „Teljesítve” jelvény. A
mászó-sessionöket nem mutatja. Pihenőnap-fogalom nincs.

## Elfogadási kritériumok

- [x] Pure TS `training-load.ts` (unit-teszttel): egy dátumtartományra naponként
      `{ climbing, workouts, fingerLoad, rest }`. `fingerLoad` = mászás VAGY
      `FOREARM_FINGERS` kategóriájú / `HANGBOARD_PINCH` kindú gyakorlat a naplóban. `rest` = se
      mászás, se edzésnapló (úszás / bicikli / lépés nem töri meg — könnyű aktivitás).
- [x] Heti terv dashboard: a napsorokon ikon a mászásra (a meglévő „Teljesítve” mellett),
      pihenőnap jelölés (csak múltbeli / mai napra); felül összesítő: „Mászás X · Edzés Y ·
      Pihenőnap Z” a naptári hétre.
- [x] Offline, csak helyi store.
- [x] [[Heti terv]] spec frissítve.

## Terv / döntési napló

- A figyelmeztetések külön jegy (backlog/138), a rotációs javaslat szintén (backlog/139); ez a
  jegy az adatréteg és a megjelenítés.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #137 heti terhelés-áttekintés
- Kód: `pages/workout/training-load.ts`, `pages/workout/weekly-plan/weekly-plan.page.*` (`9e3b005`)
- Megjegyzés: ikon helyett szöveges jelvények (Mászás / Edzés / Ujjterhelés / Pihenő) — 360 px-en olvashatóbb.
