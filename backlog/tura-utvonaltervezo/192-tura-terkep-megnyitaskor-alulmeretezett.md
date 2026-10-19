---
id: 192
type: bug
status: backlog
title: Túra — megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 192 — Túra — megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A Túra oldal megnyitásakor az első képkockán a térkép-vászon kb. 550 × 1200
(display px) méretű, jobb oldalt és alul fehér sáv; néhány másodperc múlva kitölti a helyét.

## Jelenlegi működés

`tura.page.ts` `ngAfterViewInit()`: a `maplibregl.Map` az oldal-átmenet alatt jön létre, a
méretet a `ResizeObserver` → `map.resize()` utólag javítja.

## Elfogadási kritériumok

- [ ] A térkép az első megjelenéskor kitölti a konténert (pl. `ionViewDidEnter`-kori `resize()` vagy a létrehozás az átmenet után).
- [ ] Emulátoron ellenőrizve.

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #192
- Kód: <fő fájlok>
