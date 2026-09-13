---
id: 109
type: feature
status: ready
title: Túra — időjárás-előrejelzés és térkép-overlay
specs: []
flag:
created: 2026-09-13
closed:
---

# 109 — Túra — időjárás-előrejelzés és térkép-overlay

## Motiváció / probléma

Túrázás tervezésekor és közben az időjárás-előrejelzés kulcsfontosságú. A Természetjáró app alap
időjárás-előrejelzést ingyenesen ad, de a térkép-overlay réteget (valós idejű időjárás vizuálisan a
térképen) Pro+ mögé teszi.

## Jelenlegi működés

A `gear` modulban már van egy időjárás-kereső popup a pakolás úticéljához (lásd
`86-...idojaras-keresés` — `#86 — időjárás-keresés felugró böngészőben a pakolás úticéljára`) — ez
újrafelhasználható mintaként/komponensként szolgálhat ehhez a tickethez, de önmagában nem a
túraútvonal-tervező része.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [ ] Tisztázva, hogy a `gear` modul meglévő időjárás-integrációja (API, komponens) mennyiben
      reuse-olható itt.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Alap időjárás-előrejelzés egy kiválasztott területre/útvonalra — **kell**.
- [ ] Térkép-overlay réteg (valós idejű időjárási adat vizuálisan a térképen) — **nem kell**
      (kikerül a scope-ból; a legtöbb versenytárs is emiatt teszi fizetőssé, nálunk sem elsődleges
      prioritás).
- [x] Túraindulás előtti figyelmeztetés kedvezőtlen időjárás esetén — **kell**.

### Nyitott kérdés

- Melyik időjárás-API-t használja a `gear` modul jelenlegi implementációja, és van-e rajta olyan
  korlátozás (rate limit, licenc), ami miatt nem skálázható egy gyakrabban hívott túra-riasztáshoz?

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: a `gear` modul időjárás-integrációjának újrafelhasználása/kiterjesztése
