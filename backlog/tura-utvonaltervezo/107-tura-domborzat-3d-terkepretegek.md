---
id: 107
type: feature
status: ready
title: Túra — domborzat/lejtő-réteg, 3D nézet, alternatív térképrétegek
specs: []
flag:
created: 2026-09-13
closed:
---

# 107 — Túra — domborzat/lejtő-réteg, 3D nézet, alternatív térképrétegek

## Motiváció / probléma

A felhasználó egyik konkrét panasza: "van hogy a szintkülönbség térkép ... fizetős". Ez a ticket a
vizuális domborzat-/lejtő-megjelenítést és az extra térképrétegeket fedi — ezek a legtöbb
versenytársnál (bergfex PRO, OsmAnd Pro, Természetjáró Pro+) prémium-funkciók.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Lejtő/domborzat-réteg (szín szerinti meredekség-vizualizáció) — **kell**.
- [ ] 3D térképnézet — **nem kell** (kikerül a scope-ból; jelentős renderelési/fejlesztési
      költséghez képest alacsony hozzáadott érték a felhasználó szerint).
- [x] Alternatív térkép-cartography rétegek (topo, szatellit stb.) — **kell**.
- [x] Magassági profil grafikon — már a
      [[backlog/tura-utvonaltervezo/103-tura-alapveto-utvonaltervezes-es-terkep]] ticket lefedi,
      itt csak megjegyzésként szerepel.

### Nyitott kérdés

- Ez a ticket sok tekintetben a `103-...` alaptérkép-tickettel közös technológiai alapra épül
  (ugyanaz a térkép-rendering réteg) — érdemes csak azután pontosítani a scope-ját, hogy a `103` és
  `104` ticketek térkép-/adat-technológiai döntése megszületett. Lehet, hogy ez a ticket
  összevonható a `103`-mal, ha a felhasználó úgy dönt, hogy ezek a rétegek is alapfunkciók.
- 3D nézet renderelési költsége (kliens teljesítmény, natív app battery/CPU) — igényel-e külön
  könyvtárat/motort.

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` térkép-réteg bővítés
