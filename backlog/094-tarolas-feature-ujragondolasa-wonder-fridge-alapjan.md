---
id: 94
type: change-request
status: deferred
title: Élelmiszer tárolás feature átnézése a Wonder Fridge app alapján (specifikálásra vár)
specs:
  - "[[Élelmiszer tárolás]]"
flag:
created: 2026-09-09
closed:
---

# 94 — Élelmiszer tárolás feature átnézése a Wonder Fridge app alapján (specifikálásra vár)

## Motiváció / probléma

A „Wonder Fridge" app kapcsán érdemes lenne a saját [[Élelmiszer tárolás]] feature-t
végignézni: mit csinál jobban / máshogy (bevitel UX, lejárat-kezelés, kategóriák, receptajánlás
a készletből, pazarlás-statisztika, vonalkód-flow, stb.), és mi debből átvehető.

**Tudatosan félretéve.** További specifikálásra és döntésre van szükség — ne foglalkozzunk vele
most, csak legyen dokumentálva, majd később elővesszük.

## Jelenlegi működés

[[Élelmiszer tárolás]]: tételenkénti mennyiség / hely / lejárat / felbontás; romlás-jelzés +
napi 09:00 értesítés; étkezéskor FIFO készletcsökkentés; manuális felvétel. Szűrés hely
szerint, rendezés lejárat szerint. A vizuális hely-szerinti csoportosítás külön jegy
([[045-tarolas-lista-vizualis-hely-szerinti-csoportositas-szekcio-fejle]]).

## Elfogadási kritériumok

- [ ] Feltáró jegy: a Wonder Fridge (és 1–2 hasonló app) funkcióinak listája, mellette a saját
      feature gap-elemzése.
- [ ] A megtartandó / átvehető elemekből önálló, scoppolt (`ready`) követő jegyek.
- [ ] A [[Backend-offline first]] szerződéssel való összevetés minden átvett ötletnél.

## Terv / döntési napló

_`deferred`. Nincs kód- vagy adat-hatás, amíg nem indul. A feltárás után ez a jegy `dropped`
lesz, és a konkrét ötletek külön jegyeken élnek tovább._

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszer tárolás]] (ha valamelyik átvett elem landol)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <még nincs meghatározva>
