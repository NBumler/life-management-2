---
id: 191
type: bug
status: backlog
title: Túra — üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 191 — Túra — üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A helyi backenden a `curated_route` tábla üres volt; a panel minden szűrő
„Any” állása mellett is „No route matches the current filter.”-t írt.

## Jelenlegi működés

`TURA.CATALOG.NO_RESULTS` az egyetlen üres-állapot szöveg, a szűrő állapotától függetlenül.

## Elfogadási kritériumok

- [ ] Külön üres-állapot: nincs egyetlen ajánlott túra sem (szűrő nélkül) vs. a szűrő mindent kiszűr.
- [ ] Offline (nincs még letöltött katalógus) esetén a szöveg ezt mondja, nem a szűrőt okolja.
- [ ] i18n hu + en.

## Terv / döntési napló

- Kapcsolódik: [[193-tura-ajanlott-turak-katalogus-tartalomforras]].

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #191
- Kód: <fő fájlok>
