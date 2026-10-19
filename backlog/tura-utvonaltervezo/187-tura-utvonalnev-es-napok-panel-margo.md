---
id: 187
type: bug
status: backlog
title: Túra — az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 187 — Túra — az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A rajzolás közben megjelenő „Route name” mező szövege és a „Split into days”
panel „N days” összegzője x = 0-nál kezdődik, a többi listaelem 16 px-es margójával szemben.

## Jelenlegi működés

`tura.page.html` draft-sáv és napok panel — a szöveg nem `ion-item` / padding nélküli elemben ül.

## Elfogadási kritériumok

- [ ] Mindkét szöveg az app többi mezőjével azonos bal margót kap (360 dp szélességen ellenőrizve).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #187
- Kód: <fő fájlok>
