---
id: 220
type: bug
status: backlog
title: Túra — a távolság magyar felületen tizedesponttal jelenik meg („2.9 km”)
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 220 — Túra — a távolság magyar felületen tizedesponttal jelenik meg („2.9 km”)

## Motiváció / probléma

Magyar felületen „2,9 km” lenne a helyes.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.ts` `formatDistance()`: `(meters / 1000).toFixed(1) + ' km'`; `formatOfflineSize()`: `toFixed(1) + ' MB'` — nem nyelvfüggő.
- A [[014-nyelv-valasztas-angular-locale-id-registerlocaledata-bekotese]] a `LOCALE_ID`-t köti be; a `toFixed` ettől sem javul.

## Elfogadási kritériumok

- [ ] A túra oldal minden számot az aktuális nyelv szerint formáz (hu: tizedesvessző), pl. `Intl.NumberFormat` / `formatNumber` a nyelvi beállításból.
- [ ] Unit teszt hu és en kimenetre.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #220
- Kód: `tura.page.ts`, esetleg `hike-text.ts`
