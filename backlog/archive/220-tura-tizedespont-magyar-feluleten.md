---
id: 220
type: bug
status: done
title: Túra — a távolság magyar felületen tizedesponttal jelenik meg („2.9 km”)
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 220 — Túra — a távolság magyar felületen tizedesponttal jelenik meg („2.9 km”)

## Motiváció / probléma

Magyar felületen „2,9 km” lenne a helyes.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.ts` `formatDistance()`: `(meters / 1000).toFixed(1) + ' km'`; `formatOfflineSize()`: `toFixed(1) + ' MB'` — nem nyelvfüggő.
- A [[014-nyelv-valasztas-angular-locale-id-registerlocaledata-bekotese]] a `LOCALE_ID`-t köti be; a `toFixed` ettől sem javul.

## Elfogadási kritériumok

- [x] A túra oldal minden számot az aktuális nyelv szerint formáz (hu: tizedesvessző), pl. `Intl.NumberFormat` / `formatNumber` a nyelvi beállításból.
- [x] Unit teszt hu és en kimenetre.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — a túra oldal táv-, magasság- és MB-értékei a `LanguageService.activeLanguage()` szerint, `Intl.NumberFormat`-tal formázódnak (`hike-text.ts`: `distanceText`, `elevationText`, `megabytesText`; hu → `hu-HU`, en → `en-US`). A #014 `LOCALE_ID`-jétől független; nyelvváltáskor a sablon a signal miatt újrarajzol. Nem számolható érték továbbra is `~`.
- 2026-10-19 — emulátoron: magyar felületen „13,5 km”, angolon „1.5 km”. Unit teszt: `hike-text.spec.ts` (hu / en, ezres tagolás, `~`).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #207, #211, #220, #224, #225
- Kód: `frontend/src/app/pages/menu/tura/hike-text.ts` (+ spec), `tura.page.ts`
