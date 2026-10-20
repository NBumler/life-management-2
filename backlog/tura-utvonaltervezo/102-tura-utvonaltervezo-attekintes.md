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
| [[backlog/tura-utvonaltervezo/184-tura-terkep-kesleltetett-ujrarajzolas]] | A térkép késve (vagy csak érintésre) rajzolja ki az új útvonalat | `blocked` (emulátoron nem áll fenn; valódi telefon kell) |
| `backlog/archive/185-tura-idotartam-magyarul-beegetve.md` | Az időtartam magyar egységekkel be van égetve („1 ó 31 p” angol felületen is) | `done` |
| `backlog/archive/186-tura-napok-szama-egyes-szam.md` | „1 days”: a napok száma nem kezeli az egyes számot | `done` |
| `backlog/archive/187-tura-utvonalnev-es-napok-panel-margo.md` | Az útvonalnév-mező és a napok panel összegző szövege a bal szélhez tapad | `done` |
| `backlog/archive/188-tura-napi-szintemelkedes-osszege-elter.md` | A napi szakaszok szintemelkedésének összege eltér a teljes útvonalétól | `done` |
| `backlog/archive/189-tura-katalogus-elonezet-eltuntetese.md` | Az ajánlott túra előnézeti vonala nem tüntethető el | `done` |
| `backlog/archive/190-tura-auto-utvonal-toreespontok-markerkent.md` | Az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg | `done` |
| `backlog/archive/191-tura-ures-katalogus-felrevezeto-uzenet.md` | Üres katalógusnál is „egyik útvonal sem felel meg a szűrőnek” jelenik meg | `done` |
| `backlog/archive/192-tura-terkep-megnyitaskor-alulmeretezett.md` | Megnyitáskor a térkép egy pillanatig a képernyő ~60%-át tölti ki | `done` |
| `backlog/archive/193-tura-ajanlott-turak-katalogus-tartalomforras.md` | Az ajánlott túrák katalógusának nincs tartalomforrása | `done` |
| `backlog/archive/195-tura-ajanlott-turak-teljes-feltoltese.md` | Az ajánlott túrák katalógusának teljes feltöltése (447 túra) | `done` |
| [[backlog/tura-utvonaltervezo/194-tura-hikeroute-openapi-leiras-elavult-route-metrics]] | A HikeRoute / HikeRouteDay OpenAPI-leírás a megszűnt route-metrics végpontra hivatkozik | `backlog` |
| `backlog/archive/196-tura-terkep-jelmagyarazat.md` | A térképen nincs jelmagyarázat a vonalak és pontok színeihez | `done` |
| `backlog/archive/197-tura-sajat-utvonal-szine-utkozik-jelzesszinnel.md` | A saját útvonal (kék) és a piszkozat (narancs) színe összetéveszthető a turistajelzésekkel | `done` |
| `backlog/archive/198-tura-ismert-jelzestipusok-szurken.md` | A legtöbb ismert turistajelzés-típus (pont, kereszt, M, …) szürkén jelenik meg | `done` |
| `backlog/archive/199-tura-egyeb-jelzesu-szakaszok-uraljak-a-terkepet.md` | Az „egyéb” jelzésű szakaszok vastag szürke vonala uralja a térképet | `done` |
| `backlog/archive/200-tura-turistautak-12-es-zoom-alatt-rejtettek.md` | 12-es közelítés alatt egyetlen turistaút sem látszik, és ezt semmi nem jelzi | `done` |
| `backlog/archive/201-tura-vonalra-koppintva-nincs-informacio.md` | Egy vonalra koppintva nem derül ki, melyik turistaút vagy útvonal az | `done` |
| `backlog/archive/202-tura-mentett-utvonalak-mindig-latszanak.md` | A mentett útvonalak mindig látszanak, név nélkül, és nem rejthetők el | `done` |
| `backlog/archive/203-tura-kezdo-veg-es-napvalto-pont-egyforma.md` | A kezdő-, a vég- és a napváltó pont egyforma, az útvonal iránya nem látszik | `done` |
| `backlog/archive/204-tura-fejlec-tul-magas-gombsorok-kilognak.md` | A fejléc 3–5 sor magas, a gombsorok magyarul kilógnak a képernyőről | `done` |
| `backlog/archive/205-tura-felirat-nelkuli-ikongombok.md` | A visszavonás, kuka, rétegek és offline gombnak nincs felirata | `done` |
| `backlog/archive/206-tura-rajzolas-es-automatikus-mod-erthetosege.md` | A Rajzolás és az Automatikus mód közti különbség és az aktív mód nem érthető | `done` |
| `backlog/archive/207-tura-atvetel-felirat-nem-ertheto.md` | Az előnézet „Átvétel” gombjának felirata nem mondja meg, mit csinál | `done` |
| `backlog/archive/208-tura-kuka-megerosites-nelkul-torol.md` | A kuka megerősítés nélkül törli a teljes piszkozatot, és ez nem vonható vissza | `done` |
| `backlog/archive/209-tura-napok-panel-elvont.md` | A Napok panel elvont: nincs napi táv / szint, a térkép nem látszik közben | `done` |
| `backlog/archive/210-tura-terkep-ugrik-savok-megjelenesekor.md` | A térkép elcsúszik, amikor a tipp-, a név- vagy a statisztika-sáv megjelenik | `done` |
| `backlog/archive/211-tura-mentes-visszajelzes-nelkul.md` | Mentéskor nincs visszajelzés | `done` |
| `backlog/archive/212-tura-mentett-utvonal-megnyitasa-csak-odarepul.md` | Mentett útvonal megnyitásakor nincs részlet, szerkesztés, átnevezés; a lista km és dátum nélküli | `done` |
| `backlog/archive/213-tura-felkesz-rajz-elveszik-visszalepeskor.md` | A félkész rajz figyelmeztetés nélkül elveszik, ha a felhasználó elnavigál | `done` |
| `backlog/archive/214-tura-terkep-mindig-orszagnezetre-all-vissza.md` | A térkép minden megnyitáskor az országnézetre áll vissza | `done` |
| [[backlog/archive/215-tura-sajat-helyzet-es-helykereses]] | Nincs „saját helyzetem” gomb és helykeresés | `done` |
| `backlog/archive/216-tura-katalogus-nevek-rendezes-kereses.md` | A katalógus nevei rejtélyesek, a lista rendezetlen, nincs keresés | `done` |
| `backlog/archive/217-tura-katalogus-es-atvetel-metrikaja-elter.md` | A katalógus és az átvett piszkozat más szintemelkedést és időt mutat ugyanarra a túrára | `done` |
| `backlog/archive/218-tura-katalogus-elonezet-hianyos.md` | A katalógus-előnézet csak a vonalat mutatja (nincs statisztika, profil, napok, kezdő- / végpont) | `done` |
| `backlog/archive/219-tura-magassagprofil-tengely-nelkul.md` | A magasságprofil-grafikonon nincs tengely és skála | `done` |
| `backlog/archive/220-tura-tizedespont-magyar-feluleten.md` | A távolság magyar felületen tizedesponttal jelenik meg („2.9 km”) | `done` |
| `backlog/archive/221-tura-automatikus-tervezes-sikertelen-eset.md` | Sikertelen automatikus tervezésnél a hibaüzenet nem segít, és a kezdőpont elveszik | `done` |
| [[backlog/tura-utvonaltervezo/222-tura-offline-letoltes-vakon]] | Az offline letöltésnél nem látszik, mekkora területet és mennyi adatot tölt le | `blocked` |
| [[backlog/archive/223-tura-offline-letoltes-osm-csempeszabaly]] | Az offline letöltés tömegesen tölt csempét a tile.openstreetmap.org-ról (OSM-szabálysértés) | `done` |
| [[backlog/tura-utvonaltervezo/226-tura-turistautak-lassan-jelennek-meg-elso-megnyitaskor]] | Első megnyitáskor a turistautak csak kb. 15 mp múlva jelennek meg | `backlog` |
| [[backlog/tura-utvonaltervezo/227-tura-katalogus-toltes-kozben-ures-szoveg]] | Az Ajánlott túrák lista töltés közben „üres katalógus” szöveget mutat | `backlog` |
| [[backlog/tura-utvonaltervezo/228-tura-oldal-stilus-meretkorlat]] | A `tura.page.scss` túllépi a komponens-stílus méret-figyelmeztetését | `backlog` |

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
