---
id: 190
type: change-request
status: backlog
title: Túra — az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 190 — Túra — az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Egy 4 km-es automatikus útvonal több tucat narancs körrel jelenik meg (minden
gráf-csúcs egy útpont), ami zsúfolt, és a visszavonás egyetlen csúcsot vesz el, nem a tervezést.

## Jelenlegi működés

Az automatikus tervezés eredményének koordinátái a `draft`-ba kerülnek, a
`hike-route-draft-points` réteg minden draft-koordinátára kört rajzol.

## Elfogadási kritériumok

- [ ] Döntés és megvalósítás: az automatikus szakasz csak a kezdő- és végpontot (és a felhasználó által kijelölt pontokat) mutatja markerként; a visszavonás a teljes automatikus lépést vonja vissza.
- [ ] A mentett `HikeRoute` geometria változatlan (a teljes vonal).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #190
- Kód: <fő fájlok>
