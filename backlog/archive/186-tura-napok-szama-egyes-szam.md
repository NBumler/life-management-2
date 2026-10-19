---
id: 186
type: bug
status: done
title: Túra — „1 days”: a napok száma nem kezeli az egyes számot
specs:
  - "[[Nyelv választás]]"
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 186 — Túra — „1 days”: a napok száma nem kezeli az egyes számot

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A „Split into days” panel napváltás nélkül „1 days”-t ír.

## Jelenlegi működés

`en.json` `TURA.DAYS.SUMMARY`: `"{{count}} days"` — egyetlen alak minden számra.

## Elfogadási kritériumok

- [x] Angolul 1 → „1 day”, egyébként „N days”; magyarul változatlan („N nap”).
- [x] A megoldás illeszkedik az app többi számfüggő szövegéhez (ha van közös minta, azt követi).

## Terv / döntési napló

- 2026-10-19 — megvalósítva a meglévő `_ONE` / `_MANY` minta szerint
  (`NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_ONE` / `BODY_MANY`): `TURA.DAYS.SUMMARY_ONE` / `SUMMARY_MANY`,
  a választás a `hike-text.ts` `daySummaryText()`-ben (`count === 1`). Magyarul mindkettő „{{count}} nap”.
  A régi `TURA.DAYS.SUMMARY` kulcs megszűnt.
- A minta most a [[Nyelv választás]] specben is le van írva.
- Emulátoron ellenőrizve: napváltás nélkül „1 day”, a kétnapos teszt-túránál „2 days”.

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]] (mértékegységek az i18n alatt; a `_ONE` / `_MANY` minta leírása). A túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #185, #186
- Kód: `frontend/src/app/pages/menu/tura/hike-text.ts` (+ spec), `tura.page.html`, `tura.page.ts`, `assets/i18n/{hu,en}.json`.
