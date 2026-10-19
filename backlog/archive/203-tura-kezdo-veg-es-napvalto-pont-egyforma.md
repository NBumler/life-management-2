---
id: 203
type: change-request
status: done
title: Túra — a kezdő-, a vég- és a napváltó pont egyforma, az útvonal iránya nem látszik
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 203 — Túra — a kezdő-, a vég- és a napváltó pont egyforma, az útvonal iránya nem látszik

## Motiváció / probléma

A piszkozaton és az átvett túrán minden kijelölt pont ugyanolyan narancs kör, így nem látszik, hol indul és hol ér véget az útvonal, és hol vannak a napváltók.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `draft-points` réteg: egyetlen `circle` stílus minden kijelölt pontra.
- Az automatikus mód kezdőpontja lila, a tervezés után narancs lesz.
- Mentett útvonalon és előnézeten egyáltalán nincs pont-jelölés.

## Elfogadási kritériumok

- [x] A kezdőpont és a végpont megkülönböztethető (pl. zöld „S” / piros zászló vagy cél-ikon).
- [x] A napváltó pontok külön jelölést kapnak (pl. hold ikon / sorszám).
- [x] Az irány látszik (pl. nyilak a vonalon), legalább a piszkozaton és az előnézeten.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — az alaptérkép-stílusnak nincs glyph-forrása (kulcs nélküli raszteres csempék, offline is), ezért a jelölők, nyilak és feliratok canvasra rajzolt képek (`map-icons.ts`, `addImage` + `styleimagemissing`), nincs új külső függőség.
- 2026-10-20 — indulás: zöld korong fehér ▶; cél: sakktáblás korong piros szegéllyel; napváltó: indigó korong holddal és a nap sorszámával; a többi kijelölt pont kis magenta kör. A piszkozaton, a mentett útvonalakon (a `days` alapján) és az előnézeten is; az automatikus mód kezdőpontja is az indulás-ikon. Irány-nyilak 80 px-enként a saját útvonalon, a piszkozaton és az előnézeten.
- Unit teszt: `hike-routes-geojson.spec.ts` (jelölők), `map-icons.spec.ts`.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `frontend/src/app/pages/menu/tura/map-icons.ts` (+ spec), `hike-routes-geojson.ts` (+ spec), `tura.page.ts`
