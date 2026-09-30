---
id: 55
type: feature
status: backlog
title: Edzesnaplo statisztika felulet: 1RM/max-suly gorbe + heti volumen + izomcsoport-eloszlas
specs:
  - "[[Edzésnapló]]"
flag:
created: 2026-09-02
closed:
---

# 55 — Edzesnaplo statisztika felulet: 1RM/max-suly gorbe + heti volumen + izomcsoport-eloszlas

## Motiváció / probléma

A workout-metrics.ts megvan a primitivekhez (Epley, volumen), de nincs statisztika-kepernyo; csak ghost values + PR badge + per-session volume-elonezet el.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

- 2026-10-01 (edzés-elemzés, backlog/131–142): egy OAPU-nézet is kell — a súlyozott húzódzkodás
  hozzáadott súlya a [[Profile]] testsúlyának %-ában (a cél ~+40–50%), és a gumis / csigás
  rásegítés (negatív kg) görbéje a 0 felé haladva; egyoldali szetteknél (backlog/134) bal / jobb
  külön vonal.

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
