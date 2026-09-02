---
id: 30
type: change-request
status: backlog
title: Naptar napi lista haztartasi sora nem mutat energiat / percet / lemaradas-napot
specs:
  - "[[Naptár]]"
flag:
created: 2026-09-02
closed:
---

# 30 — Naptar napi lista haztartasi sora nem mutat energiat / percet / lemaradas-napot

## Motiváció / probléma

A spec szerint a haztartasi napi-lista sor: cim, alcim, energia, perc, es overdue eseten lemaradas-nap. A calendar-day.page.html csak cimet, alcimet es ido/all-day feliratot renderel, pedig a DTO viszi az energyLevel / estimatedMinutes mezoket.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Naptár]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
