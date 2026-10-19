---
id: 222
type: change-request
status: backlog
title: Túra — az offline letöltésnél nem látszik, mekkora területet és mennyi adatot tölt le
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 222 — Túra — az offline letöltésnél nem látszik, mekkora területet és mennyi adatot tölt le

## Motiváció / probléma

A „Jelenlegi terület letöltése” a teljes képernyős panel mögött lévő térképnézetre vonatkozik, amit a felhasználó ekkor nem lát. Hogy a terület túl nagy, csak a próbálkozás után derül ki („Túl nagy terület”), és nincs előzetes méretbecslés.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `downloadCurrentRegion()`: a látható bbox csempeszáma (z12–15) > 2500 → „Túl nagy terület” alert; egyébként név-prompt, majd letöltés.
- A panel teljes képernyős `ion-modal`.

## Elfogadási kritériumok

- [ ] A letöltés előtt látszik a letöltendő terület (pl. keret a térképen) és a becsült méret (csempeszám / MB).
- [ ] A „túl nagy” állapot előre látszik (pl. tiltott gomb indoklással), nem csak próbálkozás után.
- [ ] Megfontolva: „Útvonal mentén letöltés” egy mentett / piszkozat útvonalhoz — döntés a naplóban, a [[105-tura-offline-terkep-es-utvonalszamitas]]-sal összehangolva.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #222
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `core/data/offline-region.repository.ts`
