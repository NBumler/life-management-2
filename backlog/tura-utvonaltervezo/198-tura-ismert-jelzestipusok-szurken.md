---
id: 198
type: bug
status: backlog
title: Túra — a legtöbb ismert turistajelzés-típus szürkén jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] Minden olyan jelzéstípus, amelynek a színe a `symbol` kódból adódik (`<SZÍN>_<ALAKZAT>`), a saját színét kapja; a szürke csak a valóban ismeretlen / `EGYEB` marad.
- [ ] Az alakzat (sáv / kereszt / pont / háromszög / M / …) megkülönböztetése eldöntve: vagy csak szín, vagy vonalminta / ikon is — döntés a naplóban.
- [ ] Unit teszt a színleképezésre (a meglévő `trail-segment-symbol-color.spec.ts` bővítése).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #198
- Kód: `frontend/src/app/pages/menu/tura/trail-segment-symbol-color.ts` (+ spec)
