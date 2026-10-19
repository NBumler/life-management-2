---
id: 191
type: bug
status: done
title: Túra — üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 191 — Túra — üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A helyi backenden a `curated_route` tábla üres volt; a panel minden szűrő
„Any” állása mellett is „No route matches the current filter.”-t írt.

## Jelenlegi működés

`TURA.CATALOG.NO_RESULTS` az egyetlen üres-állapot szöveg, a szűrő állapotától függetlenül.

## Elfogadási kritériumok

- [x] Külön üres-állapot: nincs egyetlen ajánlott túra sem (szűrő nélkül) vs. a szűrő mindent kiszűr.
- [x] Offline (nincs még letöltött katalógus) esetén a szöveg ezt mondja, nem a szűrőt okolja.
- [x] i18n hu + en.

## Terv / döntési napló

- Kapcsolódik: [[193-tura-ajanlott-turak-katalogus-tartalomforras]].
- 2026-10-19 — megvalósítva: `CuratedRouteRepository` `loadFailed` signal — a sikertelen betöltés (offline /
  backend nem elérhető) üres listát és jelzést ad, nem kezeletlen hibát. A panel három üres-állapota:
  betöltési hiba → `TURA.CATALOG.OFFLINE`; minden szűrő „Bármely” → `TURA.CATALOG.EMPTY`; különben
  `TURA.CATALOG.NO_RESULTS`.
- Tesztek: `curated-route.repository.spec.ts` (3). Emulátoron az üres és az offline állapot nem volt előidézhető
  a felhasználó futó backendjének leállítása / a katalógus ürítése nélkül — ezek a unit tesztre és a
  sablon-logikára támaszkodnak.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #191
- Kód: `frontend/src/app/core/data/curated-route.repository.ts` (+ spec), `pages/menu/tura/tura.page.ts|html`, `assets/i18n/{hu,en}.json`.
