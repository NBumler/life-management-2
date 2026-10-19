---
id: 204
type: change-request
status: backlog
title: Túra — a fejléc 3–5 sor magas, a gombsorok magyarul kilógnak a képernyőről
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 204 — Túra — a fejléc 3–5 sor magas, a gombsorok magyarul kilógnak a képernyőről

## Motiváció / probléma

A cím + két gombsor + tippsáv / előnézet-sáv + névsáv a 360 dp-s képernyő jelentős részét elveszi a térképtől, és magyarul a gombok nem férnek ki: a kuka és az „ÚTVONALAIM” félig le van vágva, a vízszintes görgetés nem látszik.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.html`: `ion-header` = cím-toolbar + 2× `tura-scrollable-toolbar` + feltételes tipp / előnézet / név toolbar.
- 360 dp-n (Galaxy A55 szélesség) magyarul: 1. sor „RAJZOLÁS” 117 px + „AUTOMATIKUS” 147 px + 2 ikon → túlnyúlik; 2. sor „ÚTVONALAIM” a jobb szélen levágva.
- Alul a statisztika-sáv + a tab-sáv további helyet foglal.

## Elfogadási kritériumok

- [ ] A térkép 360 dp-n is a képernyő túlnyomó részét kapja (célérték a naplóban, pl. ≥ 65%).
- [ ] Minden gomb látható vagy egyértelműen elérhető (nincs rejtett vízszintes görgetés); hu és en felületen is.
- [ ] Javaslat: egyetlen gombsor a fő műveletekkel, a ritkábbak (rétegek, offline, katalógus, útvonalaim) egy „…” menüben vagy lebegő gombként a térképen — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #204
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
