---
id: 139
type: feature
status: done
title: "Rotációs javaslat: „Következő edzés” az aktív sablonokból, fix napkiosztás nélkül"
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 139 — Rotációs javaslat: „Következő edzés”

## Motiváció / probléma

A felhasználó heti 2–5 alkalommal, rendszertelenül mászik, ezért az edzés-elemzés merev
hétfő–vasárnap beosztás helyett A/B rotációt javasol, amely a mászásmentes napokon halad tovább.
A Heti terv ma fix napkiosztású (öröklődő heti rend, backlog/127).

## Jelenlegi működés

[[Heti terv]]: slot = nap → sablon. Az Edzésnapló dashboardon nincs gyorsindító
(backlog/054).

## Elfogadási kritériumok

- [x] Pure TS javasló: az aktív, nem törölt sablonok közül az, amelyiket a legrégebben
      teljesítette a user (`planId` szerinti utolsó session dátuma; soha → elsőbbség).
- [x] Ha a backlog/138 „nincs pihenőnap” vagy „mászónap” szabálya aktív, a kártya ezt
      jelzi elsőként („Ma pihenőnap / prehab javasolt”), a sablon-javaslat alatta marad.
- [x] Megjelenés: „Következő javasolt: <sablon>” kártya az Edzésnapló dashboardon, egy
      tapos indítással. Ha az adott napra van heti slot, az elsőbbséget élvez, és a rotációs
      javaslat csak alternatíva.
- [x] Specek frissítve.

## Terv / döntési napló

- Függ: backlog/054 (gyorsindító UI), 137 (adatréteg), 138 (szabályok).

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #054 + #139 terv-gyorsindító és rotáció
- Kód: `pages/workout/rotation-suggestion.ts`, `pages/workout/log/plan-quick-start.component.ts` (`2b8300e`)
