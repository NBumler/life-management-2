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
| `backlog/archive/104-tura-adatforras-integracio.md` | Magyar (majd több országos) turistaút-adatforrás (OSM), ország-kód particionálás | `done` |
| [[backlog/tura-utvonaltervezo/105-tura-offline-terkep-es-utvonalszamitas]] | Offline térkép-letöltés régiónként (kész), offline útvonaltervezés letöltés nélkül is (kész, build asset), turistaút-réteg megjelenítése build assetből (nyitva) | `in-progress` |
| [[backlog/tura-utvonaltervezo/106-tura-gps-navigacio-elo-helymegosztas]] | Élő GPS-navigáció, track-felvétel, turn-by-turn, letérés-figyelmeztetés, SOS | `ready` |
| `backlog/archive/107-tura-domborzat-3d-terkepretegek.md` | Domborzat/lejtő-réteg, alternatív térképrétegek (3D nézet kizárva) | `done` |
| [[backlog/tura-utvonaltervezo/108-tura-poi-adatbazis-ketura-belyegzok]] | POI-adatbázis, keresés, gyűjtemények (fotók és Kéktúra-bélyegzők kizárva) | `ready` |
| [[backlog/tura-utvonaltervezo/109-tura-idojaras-integracio]] | Időjárás-előrejelzés + riasztás (térkép-overlay kizárva) | `ready` |
| `backlog/archive/110-tura-kozossegi-funkciok.md` | Közösségi funkciók — **dropped**, marad egyszemélyes app | `dropped` |
| [[backlog/tura-utvonaltervezo/111-tura-eszkozok]] | Iránytű, magasságmérő, dőlésszögmérő, QR-olvasó (csúcskereső kizárva) | `ready` |
| [[backlog/tura-utvonaltervezo/151-tura-backend-offline-first-szabalysertesek]] | Backend-offline first javítás: metrika, routing és DEM-magasság eszközön, turistaút-gráf build assetként (kész); turistaút-réteg build assetből (nyitva) | `in-progress` |
| `backlog/archive/180-tura-turistaut-szakaszok-korlatlan-betoltese.md` | A turistaút-szakaszok korlátlanul töltődnek be (20 MB / 27 s, soha nem ürül) | `done` |
| `backlog/archive/181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf.md` | Az automatikus tervezés minden kérésnél a teljes betöltött szakaszhalmazból épít gráfot | `done` |
| `backlog/archive/182-tura-automatikus-tervezes-toltesjelzo.md` | Nincs töltésjelző az automatikus útvonaltervezés alatt | `done` |
| `backlog/archive/183-tura-terkep-fejlec-ala-nyulik.md` | A térkép a fejléc alá nyúlik: rejtett zoomgombok, eltolt „ráigazítás” | `done` |
| [[backlog/tura-utvonaltervezo/184-tura-terkep-kesleltetett-ujrarajzolas]] | A térkép késve (vagy csak érintésre) rajzolja ki az új útvonalat | `backlog` |
| `backlog/archive/185-tura-idotartam-magyarul-beegetve.md` | Az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is) | `done` |
| `backlog/archive/186-tura-napok-szama-egyes-szam.md` | „1 days”: a napok száma nem kezeli az egyes számot | `done` |
| `backlog/archive/187-tura-utvonalnev-es-napok-panel-margo.md` | Az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad | `done` |
| `backlog/archive/188-tura-napi-szintemelkedes-osszege-elter.md` | A napi szakaszok szintemelkedésének összege eltér a teljes útvonalétól | `done` |
| [[backlog/tura-utvonaltervezo/189-tura-katalogus-elonezet-eltuntetese]] | Az ajánlott túra előnézeti vonala nem tüntethető el | `backlog` |
| [[backlog/tura-utvonaltervezo/190-tura-auto-utvonal-toreespontok-markerkent]] | Az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg | `backlog` |
| [[backlog/tura-utvonaltervezo/191-tura-ures-katalogus-felrevezeto-uzenet]] | Üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg | `backlog` |
| `backlog/archive/192-tura-terkep-megnyitaskor-alulmeretezett.md` | Megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki | `done` |
| [[backlog/tura-utvonaltervezo/193-tura-ajanlott-turak-katalogus-tartalomforras]] | Az ajánlott túrák katalógusának nincs tartalomforrása | `backlog` |
| [[backlog/tura-utvonaltervezo/194-tura-hikeroute-openapi-leiras-elavult-route-metrics]] | A HikeRoute / HikeRouteDay OpenAPI-leírás a megszűnt route-metrics végpontra hivatkozik | `backlog` |

> Kapcsolódó, a mappán kívüli jegy: [[150-biciklizes-elo-gps-tracker]] — a bicikli élő tracker
> közös, eszközön futó geo-alapréteget (GPS-követés, build-asset DEM, profilos routing) épít, amit a 106 is használ.

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
