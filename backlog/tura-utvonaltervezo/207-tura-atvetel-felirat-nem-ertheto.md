---
id: 207
type: change-request
status: backlog
title: Túra — az előnézet „Átvétel” gombjának felirata nem mondja meg, mit csinál
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 207 — Túra — az előnézet „Átvétel” gombjának felirata nem mondja meg, mit csinál

## Motiváció / probléma

Az „Átvétel” valójában a katalógus-túrát a saját, szerkeszthető piszkozatba másolja (#189). A szó ezt nem fejezi ki.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `TURA.PREVIEW.ADOPT` = „Átvétel”, `create-outline` ikonnal.

## Elfogadási kritériumok

- [ ] Beszédesebb felirat (pl. „Saját útvonalként szerkesztem” / „Tervezés ebből”) hu + en, ami a 360 dp-s sávban is elfér.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #207
- Kód: `assets/i18n/{hu,en}.json`, esetleg `tura.page.html`
