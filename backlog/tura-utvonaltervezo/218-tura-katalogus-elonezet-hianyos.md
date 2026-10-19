---
id: 218
type: change-request
status: backlog
title: Túra — a katalógus-előnézet csak a vonalat mutatja: nincs statisztika, profil, napbontás, kezdő- és végpont
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 218 — Túra — a katalógus-előnézet csak a vonalat mutatja: nincs statisztika, profil, napbontás, kezdő- és végpont

## Motiváció / probléma

Az előnézet alapján nem lehet eldönteni, hogy érdemes-e átvenni a túrát: nem látszik a táv, a szint, a profil, a napok és az irány.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Előnézetkor a térképen ciánkék vonal + a fejlécben a név, „Átvétel” és bezáró gomb; a statisztika-sáv csak piszkozatnál jelenik meg.

## Elfogadási kritériumok

- [ ] Előnézetkor látszik a táv, ↑ / ↓, idő, a magasságprofil és (többnaposnál) a napbontás.
- [ ] A kezdő- és végpont, valamint a napváltók jelölve ([[203-tura-kezdo-veg-es-napvalto-pont-egyforma]]).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #218
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
