---
id: 21
type: feature
status: done
title: Climbing: folyamatban levo session draft perzisztalasa (app-kill tuleles)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-02
closed: 2026-09-24
---

# 21 — Climbing: folyamatban levo session draft perzisztalasa (app-kill tuleles)

## Motiváció / probléma

A spec: 'aktiv session = kliens-lokalis draft ... app-kill utan helyreall'. A naplo edit page-ek csak memoriaban tartanak state-et; nincs localStorage/SQLite draft.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [x] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

**Kiváltva (2026-09-24):** a `backlog/122` élő mászó session a folyamatban lévő session draftját
`@capacitor/preferences`-ben perzisztálja (1 mp-es + elrejtéskori autosave), app-kill / újraindítás után
a hub-sávról, a listáról vagy az értesítésről visszanavigálva helyreáll.

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]], [[Indoor boulder napló]] (a #122-vel együtt)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #122 soron belül
- Kód: lásd `backlog/archive/122-...`
