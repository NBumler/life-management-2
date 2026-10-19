---
id: 186
type: bug
status: backlog
title: Túra — „1 days”: a napok száma nem kezeli az egyes számot
specs:
  - "[[Nyelv választás]]"
flag: menu.tura
created: 2026-10-19
closed:
---

# 186 — Túra — „1 days”: a napok száma nem kezeli az egyes számot

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A „Split into days” panel napváltás nélkül „1 days”-t ír.

## Jelenlegi működés

`en.json` `TURA.DAYS.SUMMARY`: `"{{count}} days"` — egyetlen alak minden számra.

## Elfogadási kritériumok

- [ ] Angolul 1 → „1 day”, egyébként „N days”; magyarul változatlan („N nap”).
- [ ] A megoldás illeszkedik az app többi számfüggő szövegéhez (ha van közös minta, azt követi).

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #186
- Kód: <fő fájlok>
