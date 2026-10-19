---
id: 183
type: bug
status: backlog
title: Túra — a térkép a fejléc alá nyúlik: rejtett zoomgombok, eltolt „ráigazítás”
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 183 — Túra — a térkép a fejléc alá nyúlik: rejtett zoomgombok, eltolt „ráigazítás”

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). CDP-vel mérve a `.maplibregl-map` konténer teteje `y = 0` (a fejléc alatt), a
látható térkép csak ~190 CSS px-szel lejjebb kezdődik; a tab-sáv alul szintén takar. Következmények:
(1) a `NavigationControl` (+/−) a jobb felső sarokban a fejléc alatt van, sosem látszik;
(2) az ajánlott túra előnézete (`fitBounds`) a takart sávot is beszámolja — a teszt-túra kezdőpontja
kilógott a látható részből.

## Jelenlegi működés

`tura.page.html`: `<ion-content [fullscreen]="true">` a térkép-konténer körül; `tura.page.ts`
`map.addControl(new maplibregl.NavigationControl(), 'top-right')`, `fitBounds(...)` (502., 732. sor)
padding nélkül / a takarást nem ismerve.

## Elfogadási kritériumok

- [ ] A térkép látható területe megegyezik a konténerrel (vagy a `fitBounds` / vezérlők padding-je pontosan a takarást kompenzálja) — a +/− gombok látszanak.
- [ ] Az ajánlott túra előnézete és a „Saját útvonalak” ráugrása a teljes útvonalat a látható részbe teszi.
- [ ] Emulátoron ellenőrizve (screenshot a jegyben).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #183
- Kód: <fő fájlok>
