---
id: 86
type: feature
status: backlog
title: GearCheck — időjárás keresése felugró böngészőablakban az úticélra
specs:
  - "[[GearCheck]]"
  - "[[Pakolás]]"
flag:
created: 2026-09-09
closed:
---

# 86 — GearCheck — időjárás keresése felugró böngészőablakban az úticélra

## Motiváció / probléma

Pakoláskor / gear check közben hasznos lenne gyorsan megnézni a célállomás időjárását. Ha a
felhasználó megadja az úticélt (pl. „Magas-Tátra"), egy gombbal nyíljon **felugró
böngészőablak** egy Google-kereséssel: `<úticél> időjárás` (pl. „Magas-Tátra időjárás").

Ez a kiindulás — **nincs** app- vagy speciális honlap-integráció, csak egy egyszerű
web-keresés külső böngészőben / in-app browserben.

## Jelenlegi működés

[[Pakolás]] / [[GearCheck]]: a pakolási sessionnek jelenleg nincs „úticél" mezője és nincs
időjárás-belépő. A `@capacitor/browser` plugin nincs a natív felület listájában
([[Frontend]] → Capacitor plugin lista).

## Elfogadási kritériumok

- [ ] A pakolási sessionön opcionális `destination` (úticél) szabad szöveg mező.
- [ ] „Időjárás" gomb: megnyit egy böngészőt a
      `https://www.google.com/search?q=<encodeURIComponent(destination + ' időjárás')>` URL-lel.
- [ ] Natív: `@capacitor/browser` (in-app / rendszer-böngésző); web: új tab.
- [ ] Üres úticél → a gomb rejtett vagy letiltott.
- [ ] Nincs külső API-hívás, nincs kulcs, nincs adattárolás az időjárásról.
- [ ] `#### Backend-offline`: a mező + a gomb offline is látszik; a böngésző-megnyitás értelemszerűen
      hálózatot igényel, de a feature többi része (pakolás) offline változatlan. Lásd
      [[Backend-offline first]].

## Terv / döntési napló

_A nyelv / lokalizáció a keresőszóban: egyelőre fix magyar „időjárás". Később a
[[Nyelv választás]] aktuális nyelvéből is jöhet. Az úticél tárolása a `PackingSession`-ön
(OpenAPI + `SCHEMA_Vn`) vs. tisztán kliens-lokális draft — döntés a scopingban; a perzisztált
mező a jobb, mert több eszközön is látszik._

## Lezáráskor (on-done)

- Frissített specek: [[Pakolás]] (`PackingSession` `destination` mező + időjárás belépő),
  [[GearCheck]] (`#### Backend-offline` böngésző-megnyitás jegyzet), [[Frontend]] (Capacitor
  plugin lista: `@capacitor/browser`)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: backend `PackingSession` (mező + migráció + OpenAPI); frontend `pages/menu/gear/pakolas/*`,
  `@capacitor/browser` bekötése
