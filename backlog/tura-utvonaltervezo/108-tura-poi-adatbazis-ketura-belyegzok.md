---
id: 108
type: feature
status: ready
title: Túra — POI-adatbázis és Kéktúra-szerű bélyegzőhelyek
specs: []
flag:
created: 2026-09-13
closed:
---

# 108 — Túra — POI-adatbázis és Kéktúra-szerű bélyegzőhelyek

## Motiváció / probléma

A versenytársak (Természetjáró, Mapy.cz) erős POI-adatbázist (kilátók, várak, menedékházak,
vízforrások, pihenőhelyek) adnak ingyenesen — ez fontos alapfunkció egy túraútvonal-tervezőben.
Emellett a magyar Kéktúra (Országos Kéktúra) bélyegzőgyűjtő rendszere egyedi, gamifikációs jellegű
funkció, ami erősítheti a felhasználói elköteleződést.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] POI-adatbázis: kilátók, várak, menedékházak, vízforrások, pihenőhelyek, barlangok — **kell**.
- [x] POI-k szöveges keresése — **kell**.
- [x] Egyéni gyűjtemények/listák (kedvenc POI-k, mentett helyek) — **kell**.
- [ ] POI-hoz kötött fotók/leírások — **nem kell** (kikerül a scope-ból).
- [ ] Kéktúra-szerű bélyegzőgyűjtő rendszer — **nem kell, egyelőre**. Magyarország-specifikus
      gamifikáció, a felhasználó explicit kihagyta most; ha később mégis kell, külön ticket nyílik
      rá (nem itt, hogy ne terhelje a POI-adatbázis alap scope-ját).

### Nyitott kérdés

- A POI-adat forrása ugyanaz-e, mint a turistaút-adat (`104-tura-adatforras-integracio.md` —
  OSM-ből POI-tagek is kinyerhetők), vagy külön forrás kell?

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `backend` új POI entitás/tábla (valószínűleg megosztott/global, `user_id IS NULL` minta),
  `frontend` POI-kereső UI
