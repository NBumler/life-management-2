---
id: 185
type: bug
status: backlog
title: Túra — az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is)
specs:
  - "[[Nyelv választás]]"
flag: menu.tura
created: 2026-10-19
closed:
---

# 185 — Túra — az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is)

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Angol felületen az ajánlott túrák listájában és a metrika-sávban „1 ó 31 p”
jelenik meg.

## Jelenlegi működés

`pages/menu/tura/tura.page.ts:712` `formatDuration()`: `` `${hours} ó ${mins} p` `` — nem
i18n kulcsból jön. Használja a `tura.page.html` metrika-sávja (91. sor) és a katalógus-lista (355. sor).

## Elfogadási kritériumok

- [ ] Az egységek i18n kulcsból jönnek (hu + en, azonos `{{params}}`), `npm run verify:i18n` zöld.
- [ ] Unit teszt mindkét nyelvre (órával és óra nélkül).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #185
- Kód: <fő fájlok>
