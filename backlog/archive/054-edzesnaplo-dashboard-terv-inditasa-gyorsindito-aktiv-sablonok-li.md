---
id: 54
type: feature
status: done
title: Edzesnaplo dashboard: Terv inditasa gyorsindito (aktiv sablonok listaja)
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
flag:
created: 2026-09-02
closed: 2026-10-01
---

# 54 — Edzesnaplo dashboard: Terv inditasa gyorsindito (aktiv sablonok listaja)

## Motiváció / probléma

A spec Flow-ja dashboard-CTA-kent sorolja fel; ma a terv-inditas csak a heti dashboard nap-START gombjarol erheto el (a ?planId= elotolto logika viszont kesz).

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [x] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

- 2026-10-01: a backlog/139 („Következő javasolt” rotációs kártya) erre a gyorsindítóra épül —
  együtt implementálva.

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]], [[Heti terv]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #054 + #139 terv-gyorsindító és rotáció
- Kód: `pages/workout/log/plan-quick-start.component.ts`, `workout-log-list.page.*` (`2b8300e`)
