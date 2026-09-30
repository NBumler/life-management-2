---
id: 142
type: feature
status: backlog
title: "Napi szokások: vízfogyasztás-számláló (cél pl. 4 l) + kreatin-pipa"
specs:
  - "[[Kezdőlap]]"
flag:
created: 2026-10-01
closed:
---

# 142 — Napi szokások: víz + kreatin

## Motiváció / probléma

A felhasználó napi ~4 l vizet iszik és kreatint szed. Az edzés-elemzés szerint mindkettő fontos
része a regenerációnak. Követésük hiányzik.

## Jelenlegi működés

Nincs ilyen entitás. A víz ételként rögzíthető lenne, de kalória nélkül ez nem értelmes, a
kreatin pedig táplálékként nem követhető.

## Elfogadási kritériumok

- [ ] Nyitott: általános „napi szokás” entitás (név, cél, egység, napi érték), vagy két
      dedikált mező. Determinisztikus v5 UUID `(userId, date, habit)` → több eszközön konvergál.
- [ ] Kezdőlap widget: +250 ml gomb, haladás-sáv; kreatin-pipa.

## Terv / döntési napló

_Scoping előtt; alacsony prioritás._

## Lezáráskor (on-done)

- Frissített specek: …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
