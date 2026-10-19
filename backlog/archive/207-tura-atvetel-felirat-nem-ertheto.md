---
id: 207
type: change-request
status: done
title: Túra — az előnézet „Átvétel” gombjának felirata nem mondja meg, mit csinál
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 207 — Túra — az előnézet „Átvétel” gombjának felirata nem mondja meg, mit csinál

## Motiváció / probléma

Az „Átvétel” valójában a katalógus-túrát a saját, szerkeszthető piszkozatba másolja (#189). A szó ezt nem fejezi ki.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `TURA.PREVIEW.ADOPT` = „Átvétel”, `create-outline` ikonnal.

## Elfogadási kritériumok

- [x] Beszédesebb felirat (pl. „Saját útvonalként szerkesztem” / „Tervezés ebből”) hu + en, ami a 360 dp-s sávban is elfér.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — döntés (a felhasználó jóváhagyta a tervet): **„Szerkesztés sajátként” / „Edit as my route”**.
- 2026-10-19 — 360 dp-n mérve a felirat ~190 px; ikonnal a túra nevének ~80 px maradt volna. Ezért a gomb ikon nélküli, a név pedig legfeljebb két sorba törhet (`-webkit-line-clamp: 2`), ami még belefér a sáv 56 px-es alapmagasságába — a térkép nem mozdul. Emulátoron egy hosszú névvel ellenőrizve: „P+ Dömös – Dobogókő …” két sorban, mellette a teljes felirat és a bezárás gomb. A sávot a #218 közös útvonal-kártyája váltja majd.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #207, #211, #220, #224, #225
- Kód: `assets/i18n/{hu,en}.json` (`TURA.PREVIEW.ADOPT`), `tura.page.html|scss`
