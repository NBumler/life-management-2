---
id: 102
type: feature
status: ready
title: Túraútvonal-tervező — áttekintés (esernyő-ticket)
specs: []
flag:
created: 2026-09-13
closed:
---

# 102 — Túraútvonal-tervező — áttekintés (esernyő-ticket)

## Motiváció / probléma

A hazai (és nemzetközi) túrázó alkalmazások szinte kivétel nélkül fizetőfal mögé tesznek olyan
funkciókat, amik egy offline-first appban természetesen adódnának: offline térkép, élő GPS-
navigáció, turistajelzés-réteg, szintkülönbség/domborzat-adatok, élő helymegosztás. Ez az app már
architekturálisan offline-first (lásd [[Backend-offline first]]), ezért indokolt egy saját
túraútvonal-tervező feature, ami a Menü tab alól érhető el, és a versenytársaknál fizetős
funkciókból minél többet ingyenesen ad.

Kezdetben Magyarországra optimalizálva, később több ország bevonásával bővítve.

Ez a ticket **esernyő-ticket**: nem önmagában implementálandó, hanem a `backlog/tura-utvonaltervezo/`
mappában lévő 103–111 ticketek indexe és a közös versenytárs-elemzés otthona. A mintát a
`059-elet-tervek-post-mvp-bovitmenyek.md` umbrella-ticket adja.

**A `documentation/` alá tartozó spec-fájl explicit NEM készül el ezzel a ticket-körrel** — a spec a
`Kész` állapotú, implementált viselkedést írja le; amíg a feature nincs megépítve, nincs mit
dokumentálni. Spec csak akkor készül, ha (és amikor) a feature ténylegesen leszállításra kerül.

## Jelenlegi működés

Nincs — jelenleg nincs semmilyen túraútvonal-tervező vagy térkép-alapú funkció az appban (a
`gear` modulban van egy időjárás-kereső popup a pakolás úticéljához — lásd `86-...idojaras-keresés`
—, ami mintaként reuse-olható lehet a `109-...idojaras-integracio.md` ticketnél, de önmagában nem
túrázási funkció).

## Almappa-tartalom

| Ticket | Terület | Státusz |
|---|---|---|
| `backlog/archive/103-tura-alapveto-utvonaltervezes-es-terkep.md` | Alaptérkép, turistajelzés-réteg, manuális/automatikus útvonaltervezés, katalógus, szűrés | `done` |
| [[backlog/tura-utvonaltervezo/104-tura-adatforras-integracio]] | Magyar (majd több országos) turistaút-adatforrás (OSM), ország-kód particionálás | `ready` |
| [[backlog/tura-utvonaltervezo/105-tura-offline-terkep-es-utvonalszamitas]] | Offline térkép-letöltés régiónként, **valódi offline útvonalszámítás** | `ready` |
| [[backlog/tura-utvonaltervezo/106-tura-gps-navigacio-elo-helymegosztas]] | Élő GPS-navigáció, track-felvétel, turn-by-turn, letérés-figyelmeztetés, SOS | `ready` |
| [[backlog/tura-utvonaltervezo/107-tura-domborzat-3d-terkepretegek]] | Domborzat/lejtő-réteg, alternatív térképrétegek (3D nézet kizárva) | `ready` |
| [[backlog/tura-utvonaltervezo/108-tura-poi-adatbazis-ketura-belyegzok]] | POI-adatbázis, keresés, gyűjtemények (fotók és Kéktúra-bélyegzők kizárva) | `ready` |
| [[backlog/tura-utvonaltervezo/109-tura-idojaras-integracio]] | Időjárás-előrejelzés + riasztás (térkép-overlay kizárva) | `ready` |
| `backlog/archive/110-tura-kozossegi-funkciok.md` | Közösségi funkciók — **dropped**, marad egyszemélyes app | `dropped` |
| [[backlog/tura-utvonaltervezo/111-tura-eszkozok]] | Iránytű, magasságmérő, dőlésszögmérő, QR-olvasó (csúcskereső kizárva) | `ready` |

## Elfogadási kritériumok

- [x] A 103–111 ticketek mindegyikének döntési checklistáját a felhasználó átnézte és kipipálta
      (kell / nem kell / később) — 2026-09-13-án megtörtént.
- [ ] A jóváhagyott funkciókból kirajzolódik egy MVP-scope; a `flag`-név (várhatóan
      `menu.tura` vagy hasonló) és a route (`/tabs/menu/tura`) eldöntve — ez implementáció-indítási
      döntés, még nyitott.
- [ ] Amikor a feature ténylegesen megépül: `documentation/Features/` alá új spec-fájl a
      `SPEC-TEMPLATE.md` szerint, kötelező `#### Backend-offline` szakasszal.

## Terv / döntési napló

### Versenytárs-elemzés (2026-09, websearch alapján)

| App | Ingyenes | Fizetős (Pro/Premium) |
|---|---|---|
| **Turistautak.hu / Természetjáró** (MTSZ hivatalos) | útvonaltervező, 1000+ ajánlott túra, POI-adatbázis, Kéktúra + bélyegzőhelyek, alap időjárás, SOS-hívás, iránytű/magasságmérő/dőlésszögmérő/csúcskereső/QR-olvasó | offline letöltés, vastagított turistajelzés-réteg, Skyline csúcsfelismerő (egyes verzióban), 3D videó, egyéni gyűjtemények, extra térképrétegek (Outdooractive/Topo/KOMPASS/HARVEY), időjárás-overlay, BuddyBeacon élő helymegosztás, reklámmentesség |
| **HuKi** | **minden** — teljesen ingyenes, reklámmentes, magyar turistajelzés-réteg, 14 napos offline cache (Android only) | — |
| **Mapy.com/cz** | alaptérkép, tervezés, turistaréteg | korlátlan offline országletöltés, via ferrata profil |
| **Locus Map** | alap tervezés, GPX | offline BRouter-alapú útvonalszámítás, felhő-szinkron |
| **OsmAnd** | alap navigáció, offline nézegetés | teljes offline útvonalszámítás (Maps+/Pro), domborzat/lejtő-rétegek |
| **Komoot** | 1 régió + alap tervezés | régió/világ-csomagok, offline térkép |
| **bergfex** | alap tervezés, kész túrák | offline térkép, lejtő-réteg, 3D nézet, erős alpesi adatbázis (PRO) |
| **AllTrails** | közösségi katalógus, alap nézegetés | offline térkép, részletes statisztikák, heatmap (Plus/Peak) |
| **Gaia GPS** | korlátozott alap réteg | offline réteg, professzionális topográfiai rétegek |
| **Wikiloc** | GPX-katalógus, alap nézegetés | élő helymegosztás/tracking, IGN offline térkép (Premium) |
| **Strava** | alap tracking | útvonal-ajánlás, live segments, heatmap (elsősorban elemzés-fókuszú, nem elsődleges navigációs app) |
| **Avenza Maps** | alap app | georeferenced PDF/raster térképek (niche, valószínűleg nem releváns) |
| **turistautak.openstreetmap.hu (OSM Hungary)** | **teljes** — nyílt adat (OSM/ODbL), magyar turistajelzések, GPX export | — (ez egy adatforrás, nem alkalmazás) |

### Kulcs-megfigyelés

Szinte minden versenytárs ugyanazt a 3-4 funkciót teszi fizetőfal mögé: **offline térkép/útvonal-
számítás, élő helymegosztás, extra térkép-/domborzat-réteg, reklámmentesség**. Az offline-first
architektúránk miatt az offline térkép + offline útvonalszámítás nálunk természetes velejáró lehet,
nem prémium-funkció — ez az elsődleges differenciátor.

A magyar turistajelzés-adatokhoz nem kell fizetős API: a `turistautak.openstreetmap.hu` / OSM
nyílt adatot ad, licenc-tisztán. Több ország bevonásakor ugyanez a minta (OSM-alapú, ország-
specifikus adatforrás-absztrakció) skálázódik — részletek: `104-tura-adatforras-integracio.md`.

### Nyitott kérdés

_A felhasználó dönt ticketenként, hogy mely funkciók kerülnek be az MVP-be, melyek később, és
melyek egyáltalán nem._

## Lezáráskor (on-done)

_Ez a ticket esernyő — nem záródik önmagában "kész"-re, hanem akkor archiválható, ha a 103–111
ticketek mindegyike lezárult vagy dropped státuszba került._
