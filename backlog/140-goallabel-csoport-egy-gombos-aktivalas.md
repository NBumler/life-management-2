---
id: 140
type: feature
status: ready
title: "Sablon-csoport (goalLabel) egy gombos aktiválása / inaktiválása („OAPU mód”)"
specs:
  - "[[Heti terv]]"
flag:
created: 2026-10-01
closed:
---

# 140 — goalLabel csoport egy gombos (de)aktiválása

## Motiváció / probléma

A fókuszváltás (általános mászóerő ↔ egykezes húzódzkodás fogadás) ma soronkénti kapcsolgatás:
az alap rotáció sablonjait egyenként ki, a cél-sablonokat egyenként be kell kapcsolni.

## Jelenlegi működés

[[Heti terv]]: soronkénti aktív-kapcsoló; `goalLabel` szerinti csoport-fejléc a listában.

## Elfogadási kritériumok

- [ ] A sablon lista `goalLabel` csoport-fejlécén ⋮ menü: „Csoport aktiválása”,
      „Csoport inaktiválása”, „Csak ez a csoport legyen aktív” (minden más sablon inaktív lesz).
- [ ] A meglévő sablon-mentési úton (nested PUT + outbox) menti az érintett sablonokat.
- [ ] [[Heti terv]] spec frissítve.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
