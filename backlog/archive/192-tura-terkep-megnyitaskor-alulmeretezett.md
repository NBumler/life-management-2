---
id: 192
type: bug
status: done
title: Túra — megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 192 — Túra — megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A Túra oldal megnyitásakor az első képkockán a térkép-vászon kb. 550 × 1200
(display px) méretű, jobb oldalt és alul fehér sáv; néhány másodperc múlva kitölti a helyét.

## Jelenlegi működés

`tura.page.ts` `ngAfterViewInit()`: a `maplibregl.Map` az oldal-átmenet alatt jön létre, a
méretet a `ResizeObserver` → `map.resize()` utólag javítja.

## Elfogadási kritériumok

- [x] A térkép az első megjelenéskor kitölti a konténert (pl. `ionViewDidEnter`-kori `resize()` vagy a létrehozás az átmenet után).
- [x] Emulátoron ellenőrizve.

## Terv / döntési napló

- 2026-10-19 — megvalósítva: `TuraPage.ionViewDidEnter()` → `map.resize()` (a `ResizeObserver` marad a
  későbbi átméretezésekre); a #183 nem-`fullscreen` `ion-content`-je szintén stabilabb kezdő méretet ad.
- Emulátoron CDP-vel mérve, minden kirajzolt képkocka után (`requestAnimationFrame` + `setTimeout`) a
  vászon és a konténer méretét összevetve: 3 megnyitásból 3-szor már az első kirajzolt képkockán
  360 × 507 = 360 × 507. A konstruktor alatt a MapLibre 400 × 300-as alapméretet vesz fel, de ez a
  kirajzolás előtt javul.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #183, #187, #192
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts`.
