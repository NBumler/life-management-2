---
id: 208
type: bug
status: done
title: Túra — a kuka megerősítés nélkül törli a teljes piszkozatot, és ez nem vonható vissza
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 208 — Túra — a kuka megerősítés nélkül törli a teljes piszkozatot, és ez nem vonható vissza

## Motiváció / probléma

Egyetlen véletlen koppintás elviszi a teljes munkát: a teszten egy átvett 54 km-es, kétnapos útvonal tűnt el, utána a visszavonás gomb tiltva maradt.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `clearDraft()`: `draftEditor.reset()`, név, kezdőpont, napváltók törlése — nincs megerősítés, és a lépés-verem is kiürül.

## Elfogadási kritériumok

- [x] A kuka megerősítést kér, **vagy** a törlés egy lépésként visszavonható (a visszavonás visszaadja a vonalat, a nevet és a napváltókat). Döntés a naplóban.
- [x] Unit teszt a `RouteDraftEditor`-ra, ha a visszavonható változat készül.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — döntés (a felhasználó jóváhagyta a tervet): **visszavonható lépés**, nem megerősítő ablak. A `RouteDraftEditor.clear()` egy lépést tesz a verembe, amely a vonal mellett a nevet és a napváltókat is megőrzi; a visszavonás gomb és a toast „Visszavonás” gombja is visszaadja. A toast csak akkor hat, ha a kuka óta nem történt újabb lépés (`lastStepIsClear`).
- 2026-10-19 — emulátoron: a toast a fülsáv fölé kerül (`positionAnchor`), mert a fülsávon a lejárt toast helyére eső koppintás fület váltott. Kuka → „Útvonal törölve / VISSZAVONÁS” → a 4 pontos, 22,1 km-es piszkozat visszajött.
- Unit teszt: `route-draft.spec.ts` (kuka + visszavonás, újabb lépés után a toast már nem hat).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #208, #213, #214
- Kód: `frontend/src/app/pages/menu/tura/route-draft.ts` (+ spec), `tura.page.ts`, `assets/i18n/{hu,en}.json` (`TURA.CLEARED`)
