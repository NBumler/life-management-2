---
id: 213
type: bug
status: done
title: Túra — a félkész rajz figyelmeztetés nélkül elveszik, ha a felhasználó elnavigál
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 213 — Túra — a félkész rajz figyelmeztetés nélkül elveszik, ha a felhasználó elnavigál

## Motiváció / probléma

Ha a felhasználó egy mentetlen piszkozattal visszalép (vagy tabot vált és visszajön), a piszkozat szó nélkül elvész.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A piszkozat a `TuraPage` példány memóriájában él; a vissza gomb / Menü → Túra új példányt hoz létre üres piszkozattal.
- Nincs figyelmeztetés és nincs helyi mentés (draft).

## Elfogadási kritériumok

- [x] A mentetlen piszkozat megmarad (pl. `Preferences` draft, a mászó live-session mintájára), és visszatéréskor helyreáll — **vagy** elnavigáláskor megerősítést kér. Döntés a naplóban.
- [x] Unit teszt a draft mentésére / visszaállítására, ha az a változat készül.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — döntés: **helyi mentés**, nem megerősítő ablak. A vonal, a kijelölt pontok, a név és a napváltók 500 ms debounce-szal `Preferences`-be kerülnek (`TuraLocalStateService`, `lm2_tura_draft`), elnavigáláskor a függő írás azonnal lefut; a page létrehozásakor visszatöltődik. A mód és a visszavonás-verem nem őrződik meg. Mentés / kuka után a tárolt piszkozat törlődik. Csak eszköz-lokális, nincs outbox-sor.
- 2026-10-19 — emulátoron: rajz → vissza a Menübe (a page megsemmisül) → Túra újra: a piszkozat a metrikával együtt helyreállt.
- Unit teszt: `tura-local-state.service.spec.ts` (oda-vissza, sérült / ellentmondásos tárolt érték → nincs piszkozat).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #208, #213, #214
- Kód: `frontend/src/app/core/data/tura-local-state.service.ts` (+ spec), `pages/menu/tura/tura.page.ts`, `route-draft.ts`
