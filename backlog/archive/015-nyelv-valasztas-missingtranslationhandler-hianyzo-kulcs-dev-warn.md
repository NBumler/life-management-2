---
id: 15
type: feature
status: done
title: Nyelv valasztas: MissingTranslationHandler + hianyzo-kulcs dev warning + hu/en kulcs-paritas CI
specs:
  - "[[Nyelv választás]]"
flag:
created: 2026-09-02
closed: 2026-10-17
---

# 15 — Nyelv valasztas: MissingTranslationHandler + hianyzo-kulcs dev warning + hu/en kulcs-paritas CI

## Motiváció / probléma

Nincs kozponti MissingTranslationHandler, dev buildben nincs hianyzo-kulcs warning, es semmi nem kenyszeriti a hu.json / en.json kulcs-paritast (ma 1015/1015, de csak veletlenul). A spec szerint az elteres build/CI hiba.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [x] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

- **2026-10-17:** a repóban nincs CI workflow — a „CI” itt a zöld kapu: új `npm run verify:i18n`
  (`frontend/scripts/verify-i18n.mjs`, sima `node`, a `verify:outbox` mintájára), a CLAUDE.md
  green-gate listájában is. Ellenőrzi: hu/en kulcshalmaz-egyezés, levél = szöveg vagy szöveg-tömb,
  `{{param}}`-készlet (tömbnél hossz) egyezése, és hogy a kódban **szó szerint** használt kulcs létezik
  (statikus, best-effort; a dinamikus `'X.Y_' + v` prefixek kihagyva). Induláskor tiszta volt
  (1440 levél, 0 eltérés); negatív próbával (törölt en-kulcs, eltérő placeholder, elgépelt literál)
  mindhárom ág pirosra vált.
- `DevMissingTranslationHandler` (`core/config/`): a kulcsot adja vissza (a könyvtári alapviselkedés),
  `isDevMode()`-ban kulcsonként egyszer `console.warn`. A `hu` fallback után fut, tehát csak a valóban
  sehol nem létező kulcsra szól.

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
  (Hiányzó kulcs + Frontend szakasz), [[Fejlesztői környezet]] (Statikus ellenőrzések sor)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #015 hiányzó-kulcs dev warning + `verify:i18n`
- Kód: `frontend/src/app/core/config/dev-missing-translation.handler.ts`, `frontend/src/main.ts`,
  `frontend/scripts/verify-i18n.mjs`, `frontend/package.json`
