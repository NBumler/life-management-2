---
id: 198
type: bug
status: done
title: Túra — a legtöbb ismert turistajelzés-típus szürkén jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 198 — Túra — a legtöbb ismert turistajelzés-típus szürkén jelenik meg

## Motiváció / probléma

A színtábla csak hat jelzést ismer, így a kék kereszt szürke, a kék háromszög viszont kék — ugyanaz a színű jelzés máshogy jelenik meg, ami következetlennek, „véletlenszerűnek” hat.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `trail-segment-symbol-color.ts`: `PIROS_SAV`, `KEK_SAV`, `ZOLD_SAV`, `SARGA_SAV`, `PIROS_KERESZT`, `KEK_HAROMSZOG` → szín; minden más `#757575`.
- A helyi adatbázisban (2026-10-19) többek közt: `PIROS_PONT` 4955, `LILA_M` 3558, `KEK_PONT` 2997, `KEK_KERESZT` 2741,
  `ZOLD_KERESZT` 1862, `SARGA_KERESZT` 1814, `KEK_M` 1536, `ZOLD_PONT` 1229 szakasz — mind szürke.

## Elfogadási kritériumok

- [x] Minden olyan jelzéstípus, amelynek a színe a `symbol` kódból adódik (`<SZÍN>_<ALAKZAT>`), a saját színét kapja; a szürke csak a valóban ismeretlen / `EGYEB` marad.
- [x] Az alakzat (sáv / kereszt / pont / háromszög / M / …) megkülönböztetése eldöntve: vagy csak szín, vagy vonalminta / ikon is — döntés a naplóban.
- [x] Unit teszt a színleképezésre (a meglévő `trail-segment-symbol-color.spec.ts` bővítése).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés (jóváhagyott terv): a vonalon **csak a szín** látszik, az alakzat a jelmagyarázatban (és később a #201 kártyáján). A szín a `symbol` kód szín-előtagjából adódik (`trailSegmentMarkingColorName`): PIROS, KEK, ZOLD, SARGA, LILA, NARANCS, FEKETE, BARNA, FEHER; minden jelzett szakasz fehér kontúrt kap (a fehér jelzés sötétet), így szatellitképen is kiemelkedik. Szürke csak a szín nélküli (`EGYEB`) / ismeretlen marad.
- 2026-10-20 — Emulátoron (360 dp, Dobogókő, piros és kék jelzés mentén) OSM, topo és szatellit alaptérképen lefotózva; a felhasználó a palettát a képek alapján jóváhagyta.
- Unit teszt: `trail-segment-symbol-color.spec.ts`, `trail-segments-geojson.spec.ts`.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `frontend/src/app/pages/menu/tura/trail-segment-symbol-color.ts`, `trail-segments-geojson.ts` (+ specek), `tura.page.ts`
