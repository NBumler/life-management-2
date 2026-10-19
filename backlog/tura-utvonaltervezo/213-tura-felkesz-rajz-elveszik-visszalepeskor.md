---
id: 213
type: bug
status: backlog
title: Túra — a félkész rajz figyelmeztetés nélkül elveszik, ha a felhasználó elnavigál
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 213 — Túra — a félkész rajz figyelmeztetés nélkül elveszik, ha a felhasználó elnavigál

## Motiváció / probléma

Ha a felhasználó egy mentetlen piszkozattal visszalép (vagy tabot vált és visszajön), a piszkozat szó nélkül elvész.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A piszkozat a `TuraPage` példány memóriájában él; a vissza gomb / Menü → Túra új példányt hoz létre üres piszkozattal.
- Nincs figyelmeztetés és nincs helyi mentés (draft).

## Elfogadási kritériumok

- [ ] A mentetlen piszkozat megmarad (pl. `Preferences` draft, a mászó live-session mintájára), és visszatéréskor helyreáll — **vagy** elnavigáláskor megerősítést kér. Döntés a naplóban.
- [ ] Unit teszt a draft mentésére / visszaállítására, ha az a változat készül.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #213
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
