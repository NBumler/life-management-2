---
id: 13
type: bug
status: backlog
title: Climbing szin-sav kozep index Math.round a kotelezett Math.floor helyett
specs:
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-02
closed:
---

# 13 — Climbing szin-sav kozep index Math.round a kotelezett Math.floor helyett

## Motiváció / probléma

A matrix-spec kliensre es szerverre kotelezove teszi a floor((low+high)/2)-t determinizmus okan. Az indoor-boulder-session-edit.page.ts inline Math.round-ot hasznal, a helyes colorBandMidIndex shared helper dead code -> paratlan-osszegu savnal eltero index, Volumen/piramis-csuszas a statisztikaban.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája (konverziós mátrix)]], [[Indoor boulder napló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
