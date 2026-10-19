---
id: 187
type: bug
status: done
title: Túra — az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 187 — Túra — az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A rajzolás közben megjelenő „Route name” mező szövege és a „Split into days”
panel „N days” összegzője x = 0-nál kezdődik, a többi listaelem 16 px-es margójával szemben.

## Jelenlegi működés

`tura.page.html` draft-sáv és napok panel — a szöveg nem `ion-item` / padding nélküli elemben ül.

## Elfogadási kritériumok

- [x] Mindkét szöveg az app többi mezőjével azonos bal margót kap (360 dp szélességen ellenőrizve).

## Terv / döntési napló

- 2026-10-19 — megvalósítva: az `ion-toolbar` nem ad belső margót a slotolt tartalomnak (CDP: 0 px),
  ezért a „Route name” mező `--padding-start: 16px`-et kap, a napok panel összegzője
  `ion-padding-horizontal`-t, az „Add day break” gomb `ion-margin-horizontal`-t.
- Ugyanez a hiba a metrika-sávban is megvolt („83.5 km” x = 0-nál, a „↓357 m” a jobb szélhez tapadt):
  `.route-metrics-content` 16 px oldalmargót kapott.
- Emulátoron (360 dp) ellenőrizve: a név-mező, a napváltó sor, az éjszakázási mező, a gomb és a
  „2 days” összegző egy vonalban, 16 px-nél kezdődik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #183, #187, #192
- Kód: `frontend/src/app/pages/menu/tura/tura.page.html`, `tura.page.scss`.
