---
id: 15
type: feature
status: backlog
title: Nyelv valasztas: MissingTranslationHandler + hianyzo-kulcs dev warning + hu/en kulcs-paritas CI
specs:
  - "[[Nyelv választás]]"
flag:
created: 2026-09-02
closed:
---

# 15 — Nyelv valasztas: MissingTranslationHandler + hianyzo-kulcs dev warning + hu/en kulcs-paritas CI

## Motiváció / probléma

Nincs kozponti MissingTranslationHandler, dev buildben nincs hianyzo-kulcs warning, es semmi nem kenyszeriti a hu.json / en.json kulcs-paritast (ma 1015/1015, de csak veletlenul). A spec szerint az elteres build/CI hiba.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
