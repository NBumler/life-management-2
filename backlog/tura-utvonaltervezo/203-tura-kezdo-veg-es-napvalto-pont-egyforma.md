---
id: 203
type: change-request
status: backlog
title: Túra — a kezdő-, a vég- és a napváltó pont egyforma, az útvonal iránya nem látszik
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] A kezdőpont és a végpont megkülönböztethető (pl. zöld „S” / piros zászló vagy cél-ikon).
- [ ] A napváltó pontok külön jelölést kapnak (pl. hold ikon / sorszám).
- [ ] Az irány látszik (pl. nyilak a vonalon), legalább a piszkozaton és az előnézeten.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #203
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
