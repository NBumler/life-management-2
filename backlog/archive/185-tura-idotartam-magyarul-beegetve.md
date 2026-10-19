---
id: 185
type: bug
status: done
title: Túra — az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is)
specs:
  - "[[Nyelv választás]]"
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 185 — Túra — az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is)

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Angol felületen az ajánlott túrák listájában és a metrika-sávban „1 ó 31 p”
jelenik meg.

## Jelenlegi működés

`pages/menu/tura/tura.page.ts:712` `formatDuration()`: `` `${hours} ó ${mins} p` `` — nem
i18n kulcsból jön. Használja a `tura.page.html` metrika-sávja (91. sor) és a katalógus-lista (355. sor).

## Elfogadási kritériumok

- [x] Az egységek i18n kulcsból jönnek (hu + en, azonos `{{params}}`), `npm run verify:i18n` zöld.
- [x] Unit teszt mindkét nyelvre (órával és óra nélkül).

## Terv / döntési napló

- 2026-10-19 — megvalósítva: a `formatDuration()` helyett a `hike-text.ts` `durationText()` egy
  kulcsot + paramétereket ad (`TURA.DURATION.HOURS_MINUTES` / `MINUTES` / `UNKNOWN`), a sablon a
  `translate` pipe-pal oldja fel, így nyelvváltáskor is frissül. hu: „1 ó 31 p”, en: „1 h 31 min”;
  a nem számolható érték továbbra is `~`.
- `hike-text.spec.ts` a valódi `hu.json` / `en.json` fájlokkal ellenőrzi mindkét nyelvet, órával és óra nélkül.
- Emulátoron angol felületen ellenőrizve: a katalógusban „3.5 km · 1 h 31 min · ↑489 m”.

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]] (mértékegységek az i18n alatt; a `_ONE` / `_MANY` minta leírása). A túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #185, #186
- Kód: `frontend/src/app/pages/menu/tura/hike-text.ts` (+ spec), `tura.page.html`, `tura.page.ts`, `assets/i18n/{hu,en}.json`.
