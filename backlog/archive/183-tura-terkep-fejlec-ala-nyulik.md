---
id: 183
type: bug
status: done
title: Túra — a térkép a fejléc alá nyúlik: rejtett zoomgombok, eltolt „ráigazítás”
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
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

- [x] A térkép látható területe megegyezik a konténerrel (vagy a `fitBounds` / vezérlők padding-je pontosan a takarást kompenzálja) — a +/− gombok látszanak.
- [x] Az ajánlott túra előnézete és a „Saját útvonalak” ráugrása a teljes útvonalat a látható részbe teszi.
- [x] Emulátoron ellenőrizve (screenshot a jegyben).

## Terv / döntési napló

- 2026-10-19 — megvalósítva: az `ion-content` nem `fullscreen` többé, így a térkép-konténer pontosan a
  fejléc és a lábléc (metrika-sáv) / tab-sáv közötti látható rész. Padding-kompenzáció nem kellett.
- Emulátoron (LM2_Phone, 360 dp) ellenőrizve, screenshot-leírás: a +/− és az iránytű gomb a térkép jobb
  felső sarkában a fejléc alatt látszik; az OSM-attribúció a tab-sáv fölött; a „TESZT Hűvösvölgy –
  János-hegy” előnézete a teljes vonalat (kezdőpont Hűvösvölgy, végpont János-hegy) a látható részbe
  teszi. CDP-vel mérve a konténer 360 × 507 CSS px (rajzolás közben, metrika-sávval kisebb), nem a
  teljes képernyő.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #183, #187, #192
- Kód: `frontend/src/app/pages/menu/tura/tura.page.html`, `tura.page.scss`.
